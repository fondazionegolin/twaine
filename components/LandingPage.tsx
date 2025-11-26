import React from 'react';
import { Plus, BookOpen, Sparkles, Zap, Layers, Wand2 } from 'lucide-react';
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

  const features = [
    {
      icon: Wand2,
      title: 'AI-Powered Writing',
      description: 'Generate story content, dialogue, and branching paths with advanced AI'
    },
    {
      icon: Layers,
      title: 'Visual Node Editor',
      description: 'Design complex narratives with an intuitive drag-and-drop interface'
    },
    {
      icon: Zap,
      title: 'Interactive Elements',
      description: 'Add mini-games, inventory systems, and custom JavaScript interactions'
    },
    {
      icon: Sparkles,
      title: 'Dynamic Styling',
      description: 'Generate unique visual themes that match your story\'s atmosphere'
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-950 overflow-y-auto">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          
          <div className="flex items-center gap-4">
            <span className="text-neutral-400 text-sm hidden sm:block">
              {user?.email}
            </span>
            <button
              onClick={logout}
              className="text-neutral-400 hover:text-white text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Create Interactive Stories
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto">
            Build branching narratives, add game mechanics, and bring your stories to life 
            with the power of artificial intelligence.
          </p>

          <button
            onClick={onNewStory}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
          >
            <Plus size={24} />
            Create New Story
          </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 border-t border-neutral-800/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">
            Everything you need to create
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-neutral-700 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon size={24} className="text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-400 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Your Stories Section */}
      <section className="py-16 px-6 border-t border-neutral-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <BookOpen size={28} className="text-indigo-400" />
              Your Stories
            </h2>
            
            {savedStories.length > 0 && (
              <span className="text-neutral-500 text-sm">
                {savedStories.length} {savedStories.length === 1 ? 'story' : 'stories'}
              </span>
            )}
          </div>

          {savedStories.length === 0 ? (
            <div className="bg-neutral-900/30 border border-neutral-800 border-dashed rounded-xl p-12 text-center">
              <BookOpen size={48} className="text-neutral-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-400 mb-2">
                No stories yet
              </h3>
              <p className="text-neutral-500 text-sm mb-6">
                Create your first interactive story to get started
              </p>
              <button
                onClick={onNewStory}
                className="inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                <Plus size={18} />
                Create Story
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedStories
                .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
                .map(story => (
                  <div
                    key={story.id}
                    className="group bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all cursor-pointer"
                    onClick={() => onLoadStory(story)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate flex-1">
                        {story.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this story?')) {
                            onDeleteStory(story.id);
                          }
                        }}
                        className="text-neutral-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete story"
                      >
                        ×
                      </button>
                    </div>
                    
                    <p className="text-neutral-500 text-sm mb-4 line-clamp-2">
                      {story.masterPrompt || 'No description'}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-neutral-600">
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
                className="bg-neutral-900/30 border border-neutral-800 border-dashed rounded-xl p-5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all flex flex-col items-center justify-center min-h-[160px] group"
              >
                <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-indigo-500/20 flex items-center justify-center mb-3 transition-colors">
                  <Plus size={24} className="text-neutral-500 group-hover:text-indigo-400 transition-colors" />
                </div>
                <span className="text-neutral-500 group-hover:text-indigo-400 font-medium transition-colors">
                  New Story
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-neutral-600 text-sm">
            © 2024 twAIne • AI-Powered Interactive Fiction Engine
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
