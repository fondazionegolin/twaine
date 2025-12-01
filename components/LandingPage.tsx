import React from 'react';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import Logo from './Logo';
import { SavedStory } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LandingPageProps {
  savedStories: SavedStory[];
  onNewStory: () => void;
  onLoadStory: (story: SavedStory) => void;
  onDeleteStory: (storyId: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  savedStories,
  onNewStory,
  onLoadStory,
  onDeleteStory
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="w-full h-full bg-neutral-950 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className="border-b border-neutral-800/50 bg-neutral-900/80 backdrop-blur-sm shrink-0">
        <div className="max-w-xl mx-auto px-6 py-3 flex items-center justify-between">
          <Logo size="sm" />
          
          <div className="flex items-center gap-3">
            <span className="text-neutral-500 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="text-neutral-400 hover:text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 px-6">
        <div className="max-w-xl mx-auto">
          {/* Stories Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-400" />
              Your Stories
              {savedStories.length > 0 && (
                <span className="text-neutral-500 text-sm font-normal ml-2">
                  ({savedStories.length})
                </span>
              )}
            </h1>
            
            <button
              onClick={onNewStory}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Story</span>
            </button>
          </div>

          {/* Stories Grid */}
          {savedStories.length === 0 ? (
            <div className="border border-neutral-800 border-dashed rounded-xl p-8 sm:p-12 text-center">
              <BookOpen size={40} className="text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm mb-4">
                No stories yet. Create your first one!
              </p>
              <button
                onClick={onNewStory}
                className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Create Story
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {savedStories
                .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
                .map(story => (
                  <div
                    key={story.id}
                    className="group bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-all cursor-pointer"
                    onClick={() => onLoadStory(story)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-medium text-white group-hover:text-indigo-400 transition-colors truncate text-sm sm:text-base">
                        {story.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this story?')) {
                            onDeleteStory(story.id);
                          }
                        }}
                        className="text-neutral-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                        title="Delete story"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <p className="text-neutral-500 text-xs sm:text-sm mb-3 line-clamp-2">
                      {story.masterPrompt || 'No description'}
                    </p>
                    
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-neutral-600">
                      <span>{story.nodes.length} nodes</span>
                      <span>
                        {new Date(story.updatedAt || story.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              
              {/* New Story Card */}
              <button
                onClick={onNewStory}
                className="border border-neutral-800 border-dashed rounded-lg p-4 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center min-h-[120px] group"
              >
                <Plus size={20} className="text-neutral-600 group-hover:text-indigo-400 transition-colors mb-2" />
                <span className="text-neutral-500 group-hover:text-indigo-400 text-sm font-medium transition-colors">
                  New Story
                </span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/30 py-4 px-6 shrink-0">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-neutral-600 text-xs">
            © 2024 twAIne
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
