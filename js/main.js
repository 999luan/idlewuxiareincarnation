let lastTick = Date.now();
const TICK_RATE = 100; // 10 ticks por segundo (100ms)
let autoSaveTimer = 0;

let inTribulation = false;
let tribulationTimer = 0;

function getTribulationDurationYears() {
    const baseYears = GAME_DATA.realms[gameState.realm]?.tribulationYears || Math.pow(10, gameState.realm);
    const graceLevel = gameState.metaUpgrades.dao_tribulation_grace || 0;
    return Math.max(1, Math.ceil(baseYears * (1 - (0.08 * graceLevel))));
}

function resolveRealmPromotion() {
    const currentRealm = gameState.realm;
    const maxRealm = getMaxRealm();
    const currentRealmData = GAME_DATA.realms[currentRealm];

    if (currentRealm >= maxRealm) {
        inTribulation = false;
        gameState.qi = currentRealmData.qiCap;
        refreshTribulationUnlock();
        pushGameToast(t('max_realm_toast'), 'warning');
        updateUI();
        return;
    }

    gameState.realm = currentRealm + 1;
    gameState.subRealm = 1;
    const newRealmData = GAME_DATA.realms[gameState.realm];
    const reserveBonus = (gameState.metaUpgrades.dao_retain || 0) * 0.05 + (gameState.metaUpgrades.dao_origin_reserve || 0) * 0.1;
    const qiReserveRatio = Math.min(0.9, (currentRealmData.qiReserveRatio ?? 0.5) + reserveBonus);
    gameState.qi = Math.floor(newRealmData.qiCap * qiReserveRatio);
    syncCultivationMilestones();
    refreshTribulationUnlock();

    if (gameState.realm >= 5) {
        gameState.isImmortal = true;
    } else if (!gameState.isImmortal) {
        const lifespanReward = currentRealmData.lifespanReward ?? Math.max(50, Math.ceil(currentRealmData.tribulationYears * 2));
        gameState.lifespan += lifespanReward;
    }

    if (!gameState.isImmortal && gameState.age >= gameState.lifespan) {
        gameState.lifespan = Math.ceil(gameState.age + 10);
    }

    const lifeMsg = gameState.isImmortal ? t('immortal_log_suffix') : t('lifespan_up_log_suffix');
    gameState.currentObjectiveKey = 'objective_master_realm';
    gameState.currentObjectiveData = { realm: newRealmData.name };
    gameState.currentObjective = t('objective_master_realm', { realm: newRealmData.name });

    pushGameToast(t('realm_up_toast', { realm: newRealmData.name }), 'success');
    addJourneyLog(t('realm_transition_log', {
        realmDesc: newRealmData.desc,
        lifeMsg,
        qi: formatNumber(gameState.qi)
    }));
    checkSectUnlock();
}

let isDead = false;

function init() {
    loadGame();
    initializeLocalization();
    syncCultivationMilestones();
    syncFullscreenHudLayout();
    setupAudioHud();
    // calculateOfflineGains foi removido para focar na jornada ativa
    renderTechniques();
    renderJourney();
    updateUI();
    renderTechniques();
    checkSectUnlock();
    
    // Se o jogador recarregou a página enquanto tinha uma ação ativa, restaura a UI da ação
    if (gameState.activeAction && GAME_DATA.journeyActions[gameState.activeAction]) {
        const actionData = GAME_DATA.journeyActions[gameState.activeAction];
        document.getElementById('active-action-section').style.display = 'block';
        document.getElementById('active-action-name').innerText = actionData.name;
        document.getElementById('active-action-desc').innerText = actionData.desc;
        
        const currentProgress = gameState.actionProgresses[gameState.activeAction] || 0;
        const percent = Math.min(100, (currentProgress / actionData.time_cost) * 100);
        document.getElementById('action-progress-bar-fill').style.width = `${percent}%`;
        
        const timeLeft = Math.max(0, actionData.time_cost - currentProgress);
        document.getElementById('action-time-left').innerText = timeLeft.toFixed(2);
    }
    
    // Configurar botões
    document.getElementById('meditate-btn').addEventListener('click', handleMeditate);
    document.getElementById('tribulation-btn').addEventListener('click', handleTribulation);
    document.getElementById('ascend-btn').addEventListener('click', handleAscend);
    document.getElementById('reincarnate-btn').addEventListener('click', handleReincarnate);
    document.getElementById('stance-select').addEventListener('change', handleStanceChange);
    document.getElementById('stance-select').value = gameState.stance || 'balance';
    document.getElementById('open-tree-btn').addEventListener('click', () => {
        renderDaoTree();
        document.getElementById('tree-modal').style.display = 'flex';
    });
    document.getElementById('cancel-action-btn').addEventListener('click', cancelCurrentAction);

    // Ocultar modais se clicar fora
    window.onclick = function(event) {
        const treeModal = document.getElementById('tree-modal');
        const deathModal = document.getElementById('death-modal');
        if (event == treeModal) {
            treeModal.style.display = "none";
        }
    }
    window.addEventListener('resize', () => {
        syncFullscreenHudLayout();
        drawJourneyGraph();
    });
    requestAnimationFrame(gameLoop);
}

function checkSectUnlock() {
    const sectSec = document.getElementById('sect-section');
    if (gameState.unlocks.canJoinSect) {
        sectSec.style.display = 'block';
        document.getElementById('sect-select').value = gameState.sect;
        document.getElementById('sect-select').addEventListener('change', (e) => {
            gameState.sect = e.target.value;
            updateUI();
        });
    } else {
        sectSec.style.display = 'none';
    }
}

// Função calculateOfflineGains removida (O tempo passa apenas com o jogo aberto e nas ações)

function handleMeditate(e) {
    const qpc = getQiPerClick();
    addQi(qpc);
    
    // Efeito visual
    showFloatingText(e.clientX, e.clientY, `+${formatNumber(qpc)}`);
    
    updateUI();
}

function handleStanceChange(e) {
    gameState.stance = e.target.value;
    updateUI();
}

function handleBuyBuilding(buildingId) {
    if (buyBuilding(buildingId)) {
        updateUI();
    }
}

function handleBuyMeta(upgId) {
    if (buyMetaUpgrade(upgId)) {
        updateUI();
        renderDaoTree(); // Atualiza a árvore visualmente
    }
}

function handleAscend() {
    if (confirm(t('ascension_confirm'))) {
        if (ascend()) {
            pushGameToast(t('ascension_success'), 'success');
            addJourneyLog(t('ascension_log'));
            renderTechniques();
            renderJourney();
            updateUI();
        } else {
            pushGameToast(t('ascension_fail'), 'warning');
        }
    }
}

function handleDeath() {
    isDead = true;
    inTribulation = false;
    cancelCurrentAction();
    
    const karmaGained = calculateKarmaGain();

    document.getElementById('death-age').innerText = Math.floor(gameState.age);
    document.getElementById('death-realm').innerText = GAME_DATA.realms[gameState.realm].name;
    document.getElementById('death-qi').innerText = formatNumber(gameState.totalQi);
    document.getElementById('death-karma').innerText = formatNumber(karmaGained);
    document.getElementById('death-ending-title').innerText = gameState.endingTitle || t('death_unfinished_title');
    document.getElementById('death-ending-text').innerText = gameState.endingText || t('death_unfinished_text');
    document.getElementById('death-modal').style.display = 'flex';
    
    saveGame();
}

function handleReincarnate() {
    reincarnateFromDeath();
    isDead = false;
    
    document.getElementById('death-modal').style.display = 'none';
    document.getElementById('active-action-section').style.display = 'none';
    
    renderTechniques();
    renderJourney();
    updateUI();
    checkSectUnlock();
    closeAllHudDrawers();
    saveGame();
}

function ensureJourneySafety() {
    ['work_farm', 'rest_under_tree'].forEach(actionId => {
        if (!gameState.unlockedActions.includes(actionId)) {
            gameState.unlockedActions.push(actionId);
        }
        if (!gameState.discoveredActions.includes(actionId)) {
            gameState.discoveredActions.push(actionId);
        }
    });
}

function ensureNarrativeMemoryState() {
    if (!gameState.narrativeMemory) {
        gameState.narrativeMemory = {
            samsaraCycles: 0,
            lifetimeActionCounts: {},
            totalActionCounts: {}
        };
    }
    if (!gameState.narrativeMemory.lifetimeActionCounts) gameState.narrativeMemory.lifetimeActionCounts = {};
    if (!gameState.narrativeMemory.totalActionCounts) gameState.narrativeMemory.totalActionCounts = {};
    if (gameState.narrativeMemory.samsaraCycles === undefined) gameState.narrativeMemory.samsaraCycles = 0;
}

function recordNarrativeActionContext(actionId) {
    ensureNarrativeMemoryState();

    const lifeCount = (gameState.narrativeMemory.lifetimeActionCounts[actionId] || 0) + 1;
    const totalCount = (gameState.narrativeMemory.totalActionCounts[actionId] || 0) + 1;

    gameState.narrativeMemory.lifetimeActionCounts[actionId] = lifeCount;
    gameState.narrativeMemory.totalActionCounts[actionId] = totalCount;
    gameState.actionUseCounts[actionId] = lifeCount;

    return {
        age: Math.floor(gameState.age),
        lifeCount,
        totalCount,
        samsaraCycles: gameState.narrativeMemory.samsaraCycles || 0
    };
}

// ====================
// MOTOR DA JORNADA
// ====================

function processJourneyAction(secondsPassed) {
    const actionId = gameState.activeAction;
    const actionData = GAME_DATA.journeyActions[actionId];
    if (!actionData) {
        cancelCurrentAction();
        return;
    }

    // Calcular tempo em anos (1 segundo real = 1 ano no jogo)
    const yearsPassed = secondsPassed;
    
    // Atualizar o progresso da ação e a idade simultaneamente
    if (gameState.actionProgresses[actionId] === undefined) {
        gameState.actionProgresses[actionId] = 0;
    }
    
    gameState.actionProgresses[actionId] += yearsPassed;
    if (!gameState.isImmortal) {
        gameState.age += yearsPassed;
    }

    const currentProgress = gameState.actionProgresses[actionId];

    // Atualizar UI da barra de progresso
    const percent = Math.min(100, (currentProgress / actionData.time_cost) * 100);
    const progressBar = document.getElementById('action-progress-bar-fill');
    if (progressBar) progressBar.style.width = `${percent}%`;

    const timeLeft = Math.max(0, actionData.time_cost - currentProgress);
    document.getElementById('action-time-left').innerText = timeLeft.toFixed(2);
    drawJourneyGraph();
    updateJourneyGraphInfo(gameState.journeyView?.selectedNode || gameState.activeAction);
    
    // Atualizar a UI de Idade na esquerda
    document.getElementById('current-age').innerText = Math.floor(gameState.age);
    if (!gameState.isImmortal) {
        const agePercent = Math.min(100, (gameState.age / gameState.lifespan) * 100);
        const ageBar = document.getElementById('age-progress-bar-fill');
        if (ageBar) {
            ageBar.style.width = `${agePercent}%`;
            if (agePercent > 90) {
                ageBar.style.backgroundColor = "#8a2424";
                ageBar.style.boxShadow = "0 0 5px #8a2424";
            } else if (agePercent > 75) {
                ageBar.style.backgroundColor = "#D4AF37";
                ageBar.style.boxShadow = "0 0 5px #D4AF37";
            } else {
                ageBar.style.backgroundColor = "#57A773";
                ageBar.style.boxShadow = "0 0 5px #57A773";
            }
        }
    }

    // Checar Morte por velhice DURANTE a ação
    if (!gameState.isImmortal && gameState.age >= gameState.lifespan) {
        handleDeath();
        return;
    }

    // Se completou
    if (currentProgress >= actionData.time_cost) {
        completeJourneyAction(actionId, actionData);
    }
}

function completeJourneyAction(actionId, actionData) {
    const narrativeContext = recordNarrativeActionContext(actionId);
    const statMultiplier = getJourneyStatRewardMultiplier();
    if (actionData.effects) {
        if (actionData.effects.qi) addQi(actionData.effects.qi * getJourneyQiRewardMultiplier());
        if (actionData.effects.body) gameState.body += Math.max(1, Math.round(actionData.effects.body * statMultiplier));
        if (actionData.effects.mind) gameState.mind += Math.max(1, Math.round(actionData.effects.mind * statMultiplier));
        if (actionData.effects.karma) gameState.karma += actionData.effects.karma;
        if (actionData.effects.lifespan_penalty) gameState.lifespan -= actionData.effects.lifespan_penalty;
    }

    if (actionData.unlock_flags) {
        actionData.unlock_flags.forEach(flag => {
            gameState.unlocks[flag] = true;
            addJourneyLog(t('unlock_mechanic_log'));
        });
    }

    if (actionData.set_route) {
        gameState.currentRoute = actionData.set_route;
    }

    if (actionData.ending) {
        gameState.endingId = actionId;
        gameState.endingTitle = actionData.ending.title;
        gameState.endingText = actionData.ending.text;
        gameState.currentObjectiveKey = 'ending_objective';
        gameState.currentObjectiveData = {};
        gameState.currentObjective = t('ending_objective');
        pushGameToast(actionData.ending.title, 'success');
            addJourneyLog(t('ending_log', { text: actionData.ending.text }));
    }

    if (typeof window.createJourneyDynamicActionLog === 'function') {
        addJourneyLog(window.createJourneyDynamicActionLog(actionId, narrativeContext));
    } else {
        addJourneyLog(`[${Math.floor(gameState.age)} ${t('years')}] ${actionData.log}`);
    }

    const newlyUnlocked = [];
    if (actionData.unlocks) {
        actionData.unlocks.forEach(newId => {
            if (!gameState.unlockedActions.includes(newId) && !gameState.blockedActions.includes(newId)) {
                gameState.unlockedActions.push(newId);
                newlyUnlocked.push(newId);
                if (!gameState.discoveredActions.includes(newId)) {
                    gameState.discoveredActions.push(newId);
                    addJourneyLog(t('new_choice_log', { action: GAME_DATA.journeyActions[newId].name }));
                }
            }
        });
    }

    if (actionData.blocks) {
        actionData.blocks.forEach(blockId => {
            if (!gameState.blockedActions.includes(blockId)) {
                gameState.blockedActions.push(blockId);
                const index = gameState.unlockedActions.indexOf(blockId);
                if (index > -1) gameState.unlockedActions.splice(index, 1);
            }
        });
    }

    if (actionData.cooldownYears) {
        const cooldownYears = getActionCooldownDurationYears(actionId);
        gameState.actionCooldowns[actionId] = gameState.age + cooldownYears;
        addJourneyLog(t('cooldown_log', { action: actionData.name, years: cooldownYears }));
        pushGameToast(t('cooldown_toast', { action: actionData.name, years: cooldownYears }), 'warning');
    }

    if (!actionData.repeatable) {
        const index = gameState.unlockedActions.indexOf(actionId);
        if (index > -1) {
            gameState.unlockedActions.splice(index, 1);
        }
    }

    ensureJourneySafety();
    if (newlyUnlocked.length > 0 && !actionData.ending) {
        gameState.currentObjectiveKey = 'next_step_objective';
        gameState.currentObjectiveData = { action: GAME_DATA.journeyActions[newlyUnlocked[0]].name };
        gameState.currentObjective = t('next_step_objective', { action: GAME_DATA.journeyActions[newlyUnlocked[0]].name });
    } else if (!actionData.ending && actionData.repeatable) {
        gameState.currentObjectiveKey = 'grind_objective';
        gameState.currentObjectiveData = {};
        gameState.currentObjective = t('grind_objective');
    }

    pushGameToast(t('action_completed_toast', { action: actionData.name }), 'success');

    gameState.activeAction = null;
    gameState.actionProgresses[actionId] = 0;
    
    document.getElementById('active-action-section').style.display = 'none';
    
    renderJourney();
    updateUI();
    
    saveGame();
}

function startJourneyAction(actionId) {
    if (gameState.activeAction === actionId) return;

    const actionData = GAME_DATA.journeyActions[actionId];
    if (!actionData) return;

    const failures = getActionRequirementFailures(actionData);
    if (failures.length > 0) {
        pushGameToast(t('action_not_ready_toast', { action: actionData.name }), 'warning');
        return;
    }

    if (gameState.activeAction) {
        addJourneyLog(t('switched_focus_log', { age: Math.floor(gameState.age), action: actionData.name }));
    }

    gameState.activeAction = actionId;
    if (gameState.journeyView) {
        gameState.journeyView.selectedNode = actionId;
    }
    if (gameState.actionProgresses[actionId] === undefined) {
        gameState.actionProgresses[actionId] = 0;
    }
    const currentProgress = gameState.actionProgresses[actionId];

    document.getElementById('active-action-section').style.display = 'block';
    document.getElementById('active-action-name').innerText = actionData.name;
    document.getElementById('active-action-desc').innerText = actionData.desc;
    
    const percent = Math.min(100, (currentProgress / actionData.time_cost) * 100);
    document.getElementById('action-progress-bar-fill').style.width = `${percent}%`;
    
    const timeLeft = Math.max(0, actionData.time_cost - currentProgress);
    document.getElementById('action-time-left').innerText = timeLeft.toFixed(2);
    
    updateUI();
    renderJourney(); // Atualiza a lista para mostrar o botão verde "Em Andamento"
}

function cancelCurrentAction() {
    if (gameState.activeAction) {
        addJourneyLog(t('abandon_action_log', { age: Math.floor(gameState.age) }));
        gameState.activeAction = null;
        document.getElementById('active-action-section').style.display = 'none';
        updateUI();
        renderJourney();
    }
}

function addJourneyLog(text) {
    gameState.actionLogs.push(text);
    if (gameState.actionLogs.length > 50) { // Limitar histórico
        gameState.actionLogs.shift();
    }
    renderJourneyLog();
}

function handleTribulation() {
    if (inTribulation) return;
    const cap = GAME_DATA.realms[gameState.realm].qiCap;
    if (canStartTribulation() && gameState.qi >= cap) {
        inTribulation = true;
        tribulationTimer = getTribulationDurationYears();
        document.getElementById('tribulation-btn').innerText = t('survive_years', { years: Math.ceil(tribulationTimer) });
        document.getElementById('tribulation-btn').disabled = true;
        pushGameToast(t('tribulation_start_toast', { years: formatNumber(tribulationTimer) }), 'warning');
        addJourneyLog(t('tribulation_demand_log', { years: formatNumber(tribulationTimer) }));
    } else if (gameState.realm >= getMaxRealm()) {
        pushGameToast(t('max_realm_toast'), 'warning');
    } else if (!isRealmPeak()) {
        pushGameToast(t('peak_required_toast'), 'warning');
    }
}

function gameLoop() {
    const now = Date.now();
    const dt = now - lastTick;

    if (dt >= TICK_RATE) {
        const secondsPassed = dt / 1000;
        
        if (inTribulation) {
            // Lógica de Tribulação
            const realmData = GAME_DATA.realms[gameState.realm];
            const dps = realmData.tribulationDps;
            
            // Processa a cascata de recursos mesmo na tribulação
            processCascade(secondsPassed);
            const qps = getQiPerSecond();
            gameState.age += secondsPassed;
            
            // Dano contínuo
            gameState.qi -= dps * secondsPassed;
            // Regeneração (se houver, o addQi lida com o cap)
            if (qps > 0) {
                gameState.qi += qps * secondsPassed;
                if (gameState.qi > realmData.qiCap) gameState.qi = realmData.qiCap;
            }
            if (gameState.qi < 0) {
                gameState.qi = 0;
            }
            
            tribulationTimer -= secondsPassed;
            
            if (tribulationTimer <= 0) {
                inTribulation = false;
                resolveRealmPromotion();
                document.getElementById('tribulation-btn').innerText = t('start_tribulation');
            }
            updateUI();
        } else {
            // Lógica normal
            processCascade(secondsPassed);
            const qps = getQiPerSecond();
            if (qps > 0) {
                addQi(qps * secondsPassed);
            }
            updateUI();
        }

        // Processar Jornada (Grafo de Ações)
        if (!isDead && gameState.activeAction) {
            processJourneyAction(secondsPassed);
        }

        lastTick = now;
        
        // Auto Save (a cada 5 segundos)
        autoSaveTimer += dt;
        if (autoSaveTimer >= 5000 && !inTribulation && !isDead) { // Evita salvar no meio da tribulação ou morte
            saveGame();
            autoSaveTimer = 0;
        }
    }

    requestAnimationFrame(gameLoop);
}

// O resto das funções continuam aqui (handleTribulation, etc)

function manualSave() {
    saveGame();
    const ind = document.getElementById('save-indicator');
    if (ind) {
        ind.style.opacity = 1;
        setTimeout(() => { ind.style.opacity = 0; }, 2000);
    }
}

function manualLoad() {
    if (confirm(t('load_confirm'))) {
        loadGame();
        syncCultivationMilestones();
        
        // Sincronizar UI de ação ativa caso tenha carregado um save com ação em andamento
        if (gameState.activeAction && GAME_DATA.journeyActions[gameState.activeAction]) {
            const actionData = GAME_DATA.journeyActions[gameState.activeAction];
            document.getElementById('active-action-section').style.display = 'block';
            document.getElementById('active-action-name').innerText = actionData.name;
            document.getElementById('active-action-desc').innerText = actionData.desc;
            
            const currentProgress = gameState.actionProgresses[gameState.activeAction] || 0;
            const percent = Math.min(100, (currentProgress / actionData.time_cost) * 100);
            document.getElementById('action-progress-bar-fill').style.width = `${percent}%`;
            
            const timeLeft = Math.max(0, actionData.time_cost - currentProgress);
            document.getElementById('action-time-left').innerText = timeLeft.toFixed(2);
        } else {
            document.getElementById('active-action-section').style.display = 'none';
        }
        
        renderTechniques();
        syncFullscreenHudLayout(true);
        renderJourney();
        updateUI();
        checkSectUnlock();
    }
}

// Salvar antes de fechar a aba
window.addEventListener('beforeunload', () => {
    if (!window.__skipBeforeUnloadSave) {
        saveGame();
    }
});

// Iniciar o jogo quando a página carregar
window.onload = init;
