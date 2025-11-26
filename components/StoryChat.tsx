import React, { useState, useRef, useEffect } from 'react';
import { StoryNode, ChatMessage, WorldSettings } from '../types';
import { ChevronDown, ChevronUp, Send, Loader2, Sparkles, MessageSquare } from 'lucide-react';

interface StoryChatProps {
  masterPrompt: string;
  nodes: StoryNode[];
  worldSettings: WorldSettings;
  chatHistory: ChatMessage[];
  onChatHistoryUpdate: (history: ChatMessage[]) => void;
  onStoryUpdate: (updates: StoryUpdateResult) => void;
  onPromptUpdate: (newPrompt: string) => void;
  onGenerateSkeleton: () => void;
  isGenerating: boolean;
}

export interface StoryUpdateResult {
  action: 'add_nodes' | 'modify_nodes' | 'delete_nodes' | 'update_connections' | 'full_regenerate';
  nodesToAdd?: StoryNode[];
  nodesToModify?: Partial<StoryNode>[];
  nodeIdsToDelete?: string[];
  newConnections?: { sourceId: string; targetId: string; label: string }[];
  message: string;
}

const StoryChat: React.FC<StoryChatProps> = ({
  masterPrompt,
  nodes,
  worldSettings,
  chatHistory,
  onChatHistoryUpdate,
  onStoryUpdate,
  onPromptUpdate,
  onGenerateSkeleton,
  isGenerating
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(masterPrompt);
  const [chatMessage, setChatMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalPrompt(masterPrompt);
  }, [masterPrompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Build context from current nodes
  const buildNodesContext = (): string => {
    if (nodes.length === 0) return 'No nodes exist yet.';

    return nodes.map(node => {
      const connections = node.connections.map(c => {
        const targetNode = nodes.find(n => n.id === c.targetNodeId);
        return `→ "${targetNode?.title || c.targetNodeId}" (${c.label})`;
      }).join('\n    ');

      return `[Node: ${node.id}]
  Title: "${node.title}"
  Content: "${node.content.substring(0, 200)}${node.content.length > 200 ? '...' : ''}"
  Has Media: ${node.mediaUri ? 'Yes' : 'No'}
  Has Interaction: ${node.interactionCode ? 'Yes' : 'No'}
  Connections:
    ${connections || 'None (end node)'}`;
    }).join('\n\n');
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: chatMessage.trim(),
      timestamp: Date.now()
    };

    const updatedHistory = [...chatHistory, userMsg];
    onChatHistoryUpdate(updatedHistory);
    setChatMessage('');
    setIsProcessing(true);

    try {
      // Import dynamically to avoid circular deps
      const GeminiService = await import('../services/geminiService');
      
      const nodesContext = buildNodesContext();
      const result = await GeminiService.iterateStory(
        masterPrompt,
        chatMessage.trim(),
        nodesContext,
        worldSettings,
        chatHistory
      );

      // Apply the changes
      onStoryUpdate(result);

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: result.message,
        timestamp: Date.now()
      };
      onChatHistoryUpdate([...updatedHistory, aiMessage]);

    } catch (error) {
      console.error('Story iteration error:', error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to process request'}`,
        timestamp: Date.now()
      };
      onChatHistoryUpdate([...updatedHistory, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);
    onPromptUpdate(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (isExpanded) {
        handleSendMessage();
      } else {
        onGenerateSkeleton();
      }
    }
  };

  return (
    <div className="relative">
      {/* Main Input Bar */}
      <div className="flex items-center bg-neutral-800 rounded-lg border border-neutral-700 overflow-hidden">
        <input
          ref={inputRef}
          type="text"
          placeholder="Describe your story idea..."
          value={localPrompt}
          onChange={e => handlePromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none px-4 py-2 text-sm flex-1 text-neutral-200 placeholder-neutral-500 min-w-[300px]"
        />
        
        {/* Generate Button */}
        <button
          onClick={onGenerateSkeleton}
          disabled={isGenerating || !localPrompt.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
          Generate
        </button>

        {/* Expand Chat Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-3 py-2 transition-colors border-l border-neutral-700 ${
            isExpanded ? 'bg-indigo-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
          }`}
          title="Expand story chat"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Chat Panel */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Chat Header */}
          <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between bg-neutral-850">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-indigo-400" />
              <span className="text-xs font-semibold text-neutral-300">Story Assistant</span>
            </div>
            <span className="text-[10px] text-neutral-500">
              {nodes.length} nodes • {chatHistory.length} messages
            </span>
          </div>

          {/* Chat Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-2 bg-neutral-950">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-neutral-500 mb-2">Ask me to modify your story...</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    'Add a plot twist',
                    'Create alternate endings',
                    'Add a new character',
                    'Make it darker'
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setChatMessage(suggestion)}
                      className="text-[10px] px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded border border-neutral-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-800 text-neutral-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-neutral-800 bg-neutral-900">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="e.g., 'Add a secret passage that leads to a hidden treasure'"
                disabled={isProcessing}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim() || isProcessing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryChat;
