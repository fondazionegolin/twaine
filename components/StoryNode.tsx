import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play } from 'lucide-react';

interface StoryNodeData {
  label: string;
  onPlayFromNode?: (nodeId: string) => void;
}

const StoryNode: React.FC<NodeProps<StoryNodeData>> = ({ id, data, selected }) => {
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onPlayFromNode) {
      data.onPlayFromNode(id);
    }
  };

  return (
    <div
      className={`
        relative group
        min-w-[180px] max-w-[220px]
        px-4 py-3
        rounded-2xl
        transition-all duration-200
        ${selected 
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-950' 
          : ''
        }
      `}
      style={{
        // Neomorphic style - balanced raised bubble effect
        background: 'linear-gradient(160deg, #2d2d2d 0%, #1a1a1a 100%)',
        boxShadow: selected
          ? '0 8px 24px rgba(0,0,0,0.6), 0 -2px 8px rgba(60,60,60,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 6px 20px rgba(0,0,0,0.5), 0 -1px 6px rgba(60,60,60,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Top Handle - Target */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-gradient-to-br !from-blue-400 !to-blue-600 !border-2 !border-neutral-800 hover:!scale-125 transition-transform !-top-2"
        style={{
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.5)',
        }}
      />

      {/* Node Content */}
      <div className="flex items-center justify-between gap-2">
        <span 
          className="text-sm font-semibold text-neutral-100 truncate flex-1 text-center"
          title={data.label}
        >
          {data.label}
        </span>
        
        {/* Play Button - appears on hover */}
        <button
          onClick={handlePlayClick}
          className="
            opacity-0 group-hover:opacity-100
            w-7 h-7
            flex items-center justify-center
            rounded-full
            bg-gradient-to-br from-green-500 to-green-600
            hover:from-green-400 hover:to-green-500
            text-white
            shadow-lg shadow-green-500/30
            transition-all duration-200
            hover:scale-110
            flex-shrink-0
          "
          title="Play from this node"
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>

      {/* Bottom Handle - Source */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-gradient-to-br !from-purple-400 !to-purple-600 !border-2 !border-neutral-800 hover:!scale-125 transition-transform !-bottom-2"
        style={{
          boxShadow: '0 2px 8px rgba(147, 51, 234, 0.5)',
        }}
      />

      {/* Subtle glow effect on hover */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};

export default memo(StoryNode);
