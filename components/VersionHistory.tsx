import React from 'react';
import { StoryVersion } from '../types';
import { History, RotateCcw, X, Clock, FileText, GitBranch } from 'lucide-react';

interface VersionHistoryProps {
  versions: StoryVersion[];
  currentNodesCount: number;
  onRestore: (version: StoryVersion) => void;
  onClose: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  currentNodesCount,
  onRestore,
  onClose
}) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('Added') || action.includes('Created')) return '➕';
    if (action.includes('Deleted') || action.includes('Removed')) return '🗑️';
    if (action.includes('Modified') || action.includes('Updated') || action.includes('Edited')) return '✏️';
    if (action.includes('Connected') || action.includes('Connection')) return '🔗';
    if (action.includes('Generated')) return '✨';
    if (action.includes('Moved') || action.includes('Position')) return '📍';
    return '📝';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center">
              <History size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Version History</h2>
              <p className="text-xs text-neutral-400">{versions.length} versions saved</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current State */}
        <div className="p-3 bg-neutral-800/50 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <GitBranch size={14} className="text-green-400" />
            <span className="text-green-400 font-medium">Current state:</span>
            <span>{currentNodesCount} nodes</span>
          </div>
        </div>

        {/* Version List */}
        <div className="flex-1 overflow-y-auto p-2">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <History size={48} className="mb-4 opacity-30" />
              <p className="text-sm">No version history yet</p>
              <p className="text-xs mt-1">Changes will be tracked automatically</p>
            </div>
          ) : (
            <div className="space-y-1">
              {versions.slice().reverse().map((version, index) => (
                <div
                  key={version.id}
                  className="group p-3 rounded-lg hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-neutral-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{getActionIcon(version.action)}</span>
                        <span className="text-sm text-neutral-200 font-medium truncate">
                          {version.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(version.timestamp)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText size={10} />
                          {version.nodes.length} nodes
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRestore(version)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md flex items-center gap-1.5 transition-all"
                    >
                      <RotateCcw size={12} />
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-850">
          <p className="text-[10px] text-neutral-500 text-center">
            Versions are saved automatically when you make changes. Maximum 50 versions are kept.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
