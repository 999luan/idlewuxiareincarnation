import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';

import { GameState, getInitialState } from './types/gameState';
import { GAME_DATA, formatNumber } from './data/gameData';
import { JOURNEY_ACTIONS, JourneyAction } from './data/journeyActions';
import {
  getQiPerClick,
  getQiPerSecond,
  getRealmMultiplier,
  processCascade
} from './engine/gameEngine';
import JourneyNode from './components/JourneyNode';

const nodeTypes = {
  journeyNode: JourneyNode
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(getInitialState);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Salvar/Carregar
  const saveGame = useCallback(() => {
    const saveData = { ...gameState, lastSave: Date.now() };
    localStorage.setItem('wuxiaIdleSave', JSON.stringify(saveData));
  }, [gameState]);

  const loadGame = useCallback(() => {
    const saved = localStorage.getItem('wuxiaIdleSave');
    if (saved) {
      const parsed = JSON.parse(saved);
      setGameState({ ...getInitialState(), ...parsed });
    }
  }, []);

  // Carregar save ao iniciar
  useEffect(() => {
    loadGame();
  }, [loadGame]);

  // Auto-save
  useEffect(() => {
    const interval = setInterval(saveGame, 30000);
    return () => clearInterval(interval);
  }, [saveGame]);

  // Verificar se pode executar ação
  const canExecuteAction = (actionId: string): boolean => {
    const action = JOURNEY_ACTIONS[actionId];
    if (!action) return false;

    const req = action.requirements;
    if (req.body && gameState.body < req.body) return false;
    if (req.mind && gameState.mind < req.mind) return false;
    if (req.qi && gameState.qi < req.qi) return false;
    if (req.realm && gameState.realm < req.realm) return false;
    if (req.subRealm && gameState.subRealm < req.subRealm) return false;
    if (req.karma_min !== undefined && gameState.karma < req.karma_min) return false;
    if (req.karma_max !== undefined && gameState.karma > req.karma_max) return false;
    if (req.disciples && gameState.inventory.disciples < req.disciples) return false;

    return true;
  };

  // Executar ação
  const executeAction = (actionId: string) => {
    const action = JOURNEY_ACTIONS[actionId];
    if (!action || !canExecuteAction(actionId)) return;

    if (gameState.journey.blockedActions.includes(actionId)) {
      alert('Esta ação está bloqueada pela rota que você escolheu!');
      return;
    }

    if (!gameState.journey.unlockedActions.includes(actionId)) {
      alert('Esta ação ainda não foi desbloqueada!');
      return;
    }

    if (gameState.journey.activeAction) {
      alert('Você já está executando uma ação!');
      return;
    }

    setGameState(prev => ({
      ...prev,
      journey: {
        ...prev.journey,
        activeAction: actionId,
        actionProgress: 0
      }
    }));
  };

  // Cancelar ação
  const cancelAction = () => {
    setGameState(prev => ({
      ...prev,
      journey: {
        ...prev.journey,
        activeAction: null,
        actionProgress: 0
      }
    }));
  };

  // Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prev => {
        const newState = { ...prev };

        // Processar cascata
        processCascade(newState, 0.1);

        // Adicionar Qi passivo
        const qiPerSecond = getQiPerSecond(newState);
        const qiGain = qiPerSecond * 0.1;
        const cap = GAME_DATA.realms[newState.realm].qiCap;
        newState.qi = Math.min(newState.qi + qiGain, cap);
        newState.totalQi += qiGain;

        // Envelhecer
        if (!newState.isImmortal) {
          newState.age += 0.001;
        }

        // Processar ação ativa
        if (newState.journey.activeAction) {
          const action = JOURNEY_ACTIONS[newState.journey.activeAction];
          if (action) {
            newState.journey.actionProgress += 0.1;

            if (newState.journey.actionProgress >= action.time_cost) {
              // Aplicar efeitos
              if (action.effects.body) newState.body += action.effects.body;
              if (action.effects.mind) newState.mind += action.effects.mind;
              if (action.effects.qi) newState.qi = Math.min(newState.qi + action.effects.qi, cap);
              if (action.effects.karma) newState.karma += action.effects.karma;
              if (action.effects.lifespan_penalty) newState.lifespan -= action.effects.lifespan_penalty;

              // Desbloquear ações
              if (action.unlocks) {
                action.unlocks.forEach(id => {
                  if (!newState.journey.unlockedActions.includes(id)) {
                    newState.journey.unlockedActions.push(id);
                  }
                });
              }

              // Desbloquear flags
              if (action.unlock_flags) {
                action.unlock_flags.forEach(flag => {
                  if (flag in newState.unlocks) {
                    (newState.unlocks as any)[flag] = true;
                  }
                });
              }

              // Setar rota e bloquear ações
              if (action.set_route) {
                newState.journey.chosenRoute = action.set_route;
                if (action.blocks) {
                  newState.journey.blockedActions = [
                    ...newState.journey.blockedActions,
                    ...action.blocks
                  ];
                }
              }

              // Marcar como completa se não for repetível
              if (!action.repeatable && !newState.journey.completedActions.includes(action.id)) {
                newState.journey.completedActions.push(action.id);
              }

              // Resetar ação ativa
              newState.journey.activeAction = null;
              newState.journey.actionProgress = 0;
            }
          }
        }

        return newState;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Criar grafo de nodos
  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const processed = new Set<string>();
    const levels: Record<string, number> = {};

    // Calcular níveis (breadth-first)
    const queue: Array<{ id: string; level: number }> =
      gameState.journey.unlockedActions.slice(0, 4).map(id => ({ id, level: 0 }));

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (processed.has(id)) continue;

      processed.add(id);
      levels[id] = level;

      const action = JOURNEY_ACTIONS[id];
      if (action?.unlocks) {
        action.unlocks.forEach(childId => {
          if (!processed.has(childId)) {
            queue.push({ id: childId, level: level + 1 });
          }
        });
      }
    }

    // Agrupar por nível
    const levelGroups: Record<number, string[]> = {};
    Object.entries(levels).forEach(([id, level]) => {
      if (!levelGroups[level]) levelGroups[level] = [];
      levelGroups[level].push(id);
    });

    // Criar nodos
    Object.entries(levelGroups).forEach(([levelStr, ids]) => {
      const level = parseInt(levelStr);
      ids.forEach((id, index) => {
        const action = JOURNEY_ACTIONS[id];
        if (!action) return;

        const isUnlocked = gameState.journey.unlockedActions.includes(id);
        const isCompleted = gameState.journey.completedActions.includes(id);
        const isActive = gameState.journey.activeAction === id;
        const isBlocked = gameState.journey.blockedActions.includes(id);
        const canExecute = canExecuteAction(id);

        const x = (index - ids.length / 2) * 300 + 150;
        const y = level * 250;

        newNodes.push({
          id,
          type: 'journeyNode',
          position: { x, y },
          data: {
            action,
            isUnlocked,
            isCompleted,
            isActive,
            isBlocked,
            canExecute,
            onClick: () => setSelectedAction(id)
          }
        });

        // Criar arestas
        if (action.unlocks) {
          action.unlocks.forEach(targetId => {
            if (JOURNEY_ACTIONS[targetId]) {
              newEdges.push({
                id: `${id}-${targetId}`,
                source: id,
                target: targetId,
                animated: isCompleted || isActive,
                style: { stroke: isCompleted ? '#10b981' : '#8b5cf6' }
              });
            }
          });
        }
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [gameState.journey, gameState.body, gameState.mind, gameState.qi, gameState.karma, gameState.realm, gameState.subRealm, setNodes, setEdges]);

  const realmData = GAME_DATA.realms[gameState.realm];
  const subRealmData = GAME_DATA.subRealms[gameState.subRealm];
  const qps = getQiPerSecond(gameState);
  const qpc = getQiPerClick(gameState);

  const selectedActionData = selectedAction ? JOURNEY_ACTIONS[selectedAction] : null;
  const activeActionData = gameState.journey.activeAction ? JOURNEY_ACTIONS[gameState.journey.activeAction] : null;

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex flex-col">
      {/* HUD Superior */}
      <div className="h-20 bg-black/60 backdrop-blur border-b border-purple-500/30 px-4 py-2 flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Jornada do Cultivo
          </h1>
        </div>

        <div className="flex gap-4 flex-1">
          <div className="bg-black/40 rounded px-3 py-1 min-w-[120px]">
            <div className="text-xs text-gray-400">Corpo</div>
            <div className="text-lg font-bold text-red-400">{gameState.body}</div>
          </div>

          <div className="bg-black/40 rounded px-3 py-1 min-w-[120px]">
            <div className="text-xs text-gray-400">Mente</div>
            <div className="text-lg font-bold text-blue-400">{gameState.mind}</div>
          </div>

          <div className="bg-black/40 rounded px-3 py-1 min-w-[140px]">
            <div className="text-xs text-gray-400">Qi</div>
            <div className="text-lg font-bold text-purple-400">{formatNumber(gameState.qi)}</div>
            <div className="text-xs text-gray-300">{formatNumber(qps)}/s</div>
          </div>

          <div className="bg-black/40 rounded px-3 py-1 min-w-[120px]">
            <div className="text-xs text-gray-400">Reino</div>
            <div className="text-sm font-bold text-yellow-400">{realmData.name}</div>
            <div className="text-xs text-gray-300">{subRealmData.name}</div>
          </div>

          <div className="bg-black/40 rounded px-3 py-1 min-w-[120px]">
            <div className="text-xs text-gray-400">Idade</div>
            <div className="text-lg font-bold">{Math.floor(gameState.age)} / {gameState.lifespan}</div>
          </div>

          <div className="bg-black/40 rounded px-3 py-1 min-w-[100px]">
            <div className="text-xs text-gray-400">Karma</div>
            <div className={`text-lg font-bold ${gameState.karma >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
              {gameState.karma}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={saveGame}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
          >
            💾 Salvar
          </button>
          <button
            onClick={loadGame}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            📂 Carregar
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Central */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          >
            <Background color="#4a5568" gap={16} />
            <Controls className="bg-black/60 border border-purple-500/30" />
            <MiniMap
              nodeColor={(node) => {
                const data = node.data as any;
                if (data.isActive) return '#fbbf24';
                if (data.isCompleted) return '#10b981';
                if (data.isBlocked) return '#ef4444';
                if (!data.isUnlocked) return '#4b5563';
                return '#8b5cf6';
              }}
              className="bg-black/60 border border-purple-500/30"
            />
          </ReactFlow>

          {/* Ação Ativa - Overlay */}
          {activeActionData && (
            <div className="absolute bottom-4 left-4 right-4 bg-gradient-to-r from-yellow-900/95 to-orange-900/95 backdrop-blur rounded-lg p-4 border-2 border-yellow-500 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-yellow-300">⚡ {activeActionData.name}</h3>
                <button
                  onClick={cancelAction}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                >
                  ✕ Cancelar
                </button>
              </div>

              <div className="w-full bg-black/40 rounded-full h-4 mb-2">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-4 rounded-full transition-all flex items-center justify-center text-xs font-bold"
                  style={{
                    width: `${Math.min(100, (gameState.journey.actionProgress / activeActionData.time_cost) * 100)}%`
                  }}
                >
                  {Math.min(100, Math.floor((gameState.journey.actionProgress / activeActionData.time_cost) * 100))}%
                </div>
              </div>

              <div className="text-sm text-gray-200">
                Tempo restante: <span className="font-bold text-white">
                  {Math.max(0, activeActionData.time_cost - gameState.journey.actionProgress).toFixed(1)} anos
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Painel Lateral Direito */}
        <div className="w-96 bg-black/40 backdrop-blur border-l border-purple-500/30 p-4 overflow-y-auto shrink-0">
          <h2 className="text-xl font-bold mb-4 text-purple-400">Detalhes da Ação</h2>

          {selectedActionData ? (
            <div className="space-y-4">
              <div className="bg-black/40 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-yellow-400">{selectedActionData.name}</h3>
                  <span className="text-2xl">{
                    selectedActionData.type === 'corpo' ? '💪' :
                    selectedActionData.type === 'cultivo' ? '🧘' :
                    selectedActionData.type === 'social' ? '👥' : '⚠️'
                  }</span>
                </div>

                <p className="text-sm text-gray-300 italic mb-4">"{selectedActionData.desc}"</p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tempo:</span>
                    <span className="text-white font-bold">⏱️ {selectedActionData.time_cost} anos</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Tipo:</span>
                    <span className="text-white capitalize">{selectedActionData.type}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Repetível:</span>
                    <span className="text-white">{selectedActionData.repeatable ? 'Sim ♻️' : 'Não'}</span>
                  </div>
                </div>
              </div>

              {/* Requisitos */}
              <div className="bg-black/40 rounded-lg p-4">
                <h4 className="font-bold mb-2 text-blue-400">Requisitos</h4>
                <div className="space-y-1 text-sm">
                  {Object.keys(selectedActionData.requirements).length === 0 ? (
                    <div className="text-gray-400">Nenhum requisito</div>
                  ) : (
                    <>
                      {selectedActionData.requirements.body && (
                        <div className={gameState.body >= selectedActionData.requirements.body ? 'text-green-400' : 'text-red-400'}>
                          Corpo: {selectedActionData.requirements.body} ({gameState.body >= selectedActionData.requirements.body ? '✓' : '✗'})
                        </div>
                      )}
                      {selectedActionData.requirements.mind && (
                        <div className={gameState.mind >= selectedActionData.requirements.mind ? 'text-green-400' : 'text-red-400'}>
                          Mente: {selectedActionData.requirements.mind} ({gameState.mind >= selectedActionData.requirements.mind ? '✓' : '✗'})
                        </div>
                      )}
                      {selectedActionData.requirements.qi && (
                        <div className={gameState.qi >= selectedActionData.requirements.qi ? 'text-green-400' : 'text-red-400'}>
                          Qi: {formatNumber(selectedActionData.requirements.qi)} ({gameState.qi >= selectedActionData.requirements.qi ? '✓' : '✗'})
                        </div>
                      )}
                      {selectedActionData.requirements.realm && (
                        <div className={gameState.realm >= selectedActionData.requirements.realm ? 'text-green-400' : 'text-red-400'}>
                          Reino: {selectedActionData.requirements.realm} ({gameState.realm >= selectedActionData.requirements.realm ? '✓' : '✗'})
                        </div>
                      )}
                      {selectedActionData.requirements.karma_max !== undefined && (
                        <div className={gameState.karma <= selectedActionData.requirements.karma_max ? 'text-green-400' : 'text-red-400'}>
                          Karma máx: {selectedActionData.requirements.karma_max} ({gameState.karma <= selectedActionData.requirements.karma_max ? '✓' : '✗'})
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Efeitos */}
              <div className="bg-black/40 rounded-lg p-4">
                <h4 className="font-bold mb-2 text-green-400">Efeitos</h4>
                <div className="space-y-1 text-sm">
                  {selectedActionData.effects.body && (
                    <div className="text-green-300">+ {selectedActionData.effects.body} Corpo</div>
                  )}
                  {selectedActionData.effects.mind && (
                    <div className="text-blue-300">+ {selectedActionData.effects.mind} Mente</div>
                  )}
                  {selectedActionData.effects.qi && (
                    <div className="text-purple-300">+ {formatNumber(selectedActionData.effects.qi)} Qi</div>
                  )}
                  {selectedActionData.effects.karma && (
                    <div className={selectedActionData.effects.karma > 0 ? 'text-yellow-300' : 'text-red-300'}>
                      {selectedActionData.effects.karma > 0 ? '+' : ''} {selectedActionData.effects.karma} Karma
                    </div>
                  )}
                  {selectedActionData.effects.lifespan_penalty && (
                    <div className="text-red-300">- {selectedActionData.effects.lifespan_penalty} Anos de Vida</div>
                  )}
                </div>

                {selectedActionData.ui_reward_summary && (
                  <div className="mt-3 p-2 bg-purple-500/20 rounded text-xs text-purple-200 italic">
                    💡 {selectedActionData.ui_reward_summary}
                  </div>
                )}
              </div>

              {/* Desbloqueia */}
              {selectedActionData.unlocks && selectedActionData.unlocks.length > 0 && (
                <div className="bg-black/40 rounded-lg p-4">
                  <h4 className="font-bold mb-2 text-purple-400">Desbloqueia</h4>
                  <div className="space-y-1 text-sm">
                    {selectedActionData.unlocks.map(id => (
                      <div key={id} className="text-gray-300">
                        → {JOURNEY_ACTIONS[id]?.name || id}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botão Executar */}
              <button
                onClick={() => executeAction(selectedAction)}
                disabled={
                  !canExecuteAction(selectedAction) ||
                  !gameState.journey.unlockedActions.includes(selectedAction) ||
                  gameState.journey.blockedActions.includes(selectedAction) ||
                  gameState.journey.activeAction !== null
                }
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-bold transition-all"
              >
                {gameState.journey.activeAction ? '⏸️ Ação em Progresso' :
                 gameState.journey.blockedActions.includes(selectedAction) ? '🔒 Bloqueado pela Rota' :
                 !gameState.journey.unlockedActions.includes(selectedAction) ? '🔒 Trancado' :
                 !canExecuteAction(selectedAction) ? '⚠️ Requisitos não atendidos' :
                 '▶️ Executar Ação'}
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              Clique em um nodo no grafo para ver detalhes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
