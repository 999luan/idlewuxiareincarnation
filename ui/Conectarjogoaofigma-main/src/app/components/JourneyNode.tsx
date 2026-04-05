import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { JourneyAction } from '../data/journeyActions';

interface JourneyNodeData {
  action: JourneyAction;
  isUnlocked: boolean;
  isCompleted: boolean;
  isActive: boolean;
  isBlocked: boolean;
  canExecute: boolean;
  onClick: () => void;
}

const typeColors = {
  corpo: 'from-red-600 to-orange-600',
  cultivo: 'from-purple-600 to-blue-600',
  social: 'from-green-600 to-emerald-600',
  risco: 'from-red-800 to-red-900'
};

const typeIcons = {
  corpo: '💪',
  cultivo: '🧘',
  social: '👥',
  risco: '⚠️'
};

export default memo(({ data }: NodeProps<JourneyNodeData>) => {
  const { action, isUnlocked, isCompleted, isActive, isBlocked, canExecute, onClick } = data;

  const getBorderColor = () => {
    if (isActive) return 'border-yellow-400 shadow-lg shadow-yellow-500/50';
    if (isCompleted) return 'border-green-500';
    if (isBlocked) return 'border-red-500';
    if (!isUnlocked) return 'border-gray-600';
    if (canExecute) return 'border-blue-400';
    return 'border-gray-500';
  };

  const getOpacity = () => {
    if (!isUnlocked || isBlocked) return 'opacity-40';
    return 'opacity-100';
  };

  return (
    <>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />

      <div
        onClick={onClick}
        className={`
          relative px-4 py-3 rounded-lg border-2 min-w-[200px] max-w-[250px]
          bg-gradient-to-br ${typeColors[action.type]}
          ${getBorderColor()} ${getOpacity()}
          cursor-pointer transition-all hover:scale-105
          ${!isUnlocked || isBlocked ? 'cursor-not-allowed' : ''}
        `}
      >
        {/* Icon */}
        <div className="absolute -top-3 -right-3 text-2xl bg-black/80 rounded-full w-10 h-10 flex items-center justify-center border-2 border-current">
          {typeIcons[action.type]}
        </div>

        {/* Status Badges */}
        <div className="flex gap-1 mb-2">
          {isCompleted && (
            <span className="text-xs bg-green-500/80 px-2 py-0.5 rounded">✓ Completo</span>
          )}
          {isActive && (
            <span className="text-xs bg-yellow-500/80 px-2 py-0.5 rounded animate-pulse">▶ Ativo</span>
          )}
          {isBlocked && (
            <span className="text-xs bg-red-500/80 px-2 py-0.5 rounded">🔒 Bloqueado</span>
          )}
          {!isUnlocked && !isBlocked && (
            <span className="text-xs bg-gray-500/80 px-2 py-0.5 rounded">🔒 Trancado</span>
          )}
          {action.set_route && (
            <span className="text-xs bg-purple-500/80 px-2 py-0.5 rounded">★ Rota</span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-sm mb-1 text-white">{action.name}</h3>

        {/* Description */}
        <p className="text-xs text-gray-100 mb-2 line-clamp-2">{action.desc}</p>

        {/* Time Cost */}
        <div className="flex items-center gap-1 text-xs text-gray-200">
          <span>⏱️ {action.time_cost} anos</span>
          {action.repeatable && <span className="ml-auto">♻️</span>}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500" />
    </>
  );
});
