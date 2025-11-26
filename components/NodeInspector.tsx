import React, { useState, useEffect, useRef } from 'react';
import { StoryNode, GenerationState, WorldSettings, StoryStyle, ChatMessage } from '../types';
import { Wand2, Image as ImageIcon, Terminal, Loader2, X, Film, Send, Code2 } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

interface NodeInspectorProps {
  node: StoryNode;
  worldSettings: WorldSettings;
  storyNodes: StoryNode[];
  masterPrompt: string;
  currentStyle?: StoryStyle;
  onUpdate: (updatedNode: StoryNode) => void;
  onClose: () => void;
}

const NodeInspector: React.FC<NodeInspectorProps> = ({ node, worldSettings, storyNodes, masterPrompt, currentStyle, onUpdate, onClose }) => {
  const [genState, setGenState] = useState<GenerationState>({ isGenerating: false });
  const [localTitle, setLocalTitle] = useState(node.title);
  const [localContent, setLocalContent] = useState(node.content);
  const [localMediaPrompt, setLocalMediaPrompt] = useState(node.mediaPrompt || "");
  const [localMediaType, setLocalMediaType] = useState<'image' | 'video'>(node.mediaType || 'image');
  const [localImageModel, setLocalImageModel] = useState<'flux-schnell' | 'flux-dev-gguf' | 'sdxl'>(node.imageModel || 'flux-schnell');
  const [localImageWidth, setLocalImageWidth] = useState<number>(node.imageWidth || 512);
  const [localImageHeight, setLocalImageHeight] = useState<number>(node.imageHeight || 512);
  const [localInteraction, setLocalInteraction] = useState(node.interactionDescription || "");
  const [localCode, setLocalCode] = useState(node.interactionCode || "");
  const [localTextGenerationPrompt, setLocalTextGenerationPrompt] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Chat state for code iteration
  const [codeChatHistory, setCodeChatHistory] = useState<ChatMessage[]>(node.codeChatHistory || []);
  const [chatMessage, setChatMessage] = useState("");
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(720);
  const [isResizing, setIsResizing] = useState(false);

  // Sync local state when node prop changes
  useEffect(() => {
    setLocalTitle(node.title);
    setLocalContent(node.content);
    setLocalMediaPrompt(node.mediaPrompt || "");
    setLocalMediaType(node.mediaType || 'image');
    setLocalImageModel(node.imageModel || 'flux-schnell');
    setLocalImageWidth(node.imageWidth || 512);
    setLocalImageHeight(node.imageHeight || 512);
    setLocalInteraction(node.interactionDescription || "");
    setLocalCode(node.interactionCode || "");
    setCodeChatHistory(node.codeChatHistory || []);
    setLocalTextGenerationPrompt("");
    setStatusMessage("");
  }, [node]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [codeChatHistory]);

  // Auto-save with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdate({
        ...node,
        title: localTitle,
        content: localContent,
        mediaPrompt: localMediaPrompt,
        mediaType: localMediaType,
        imageModel: localImageModel,
        imageWidth: localImageWidth,
        imageHeight: localImageHeight,
        interactionDescription: localInteraction,
        interactionCode: localCode,
        codeChatHistory: codeChatHistory
      });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localTitle, localContent, localMediaPrompt, localMediaType, localInteraction, localCode, codeChatHistory]);

  const generateText = async () => {
    if (!localTextGenerationPrompt.trim()) return alert("Please enter a brief prompt for text generation.");
    setGenState({ isGenerating: true, type: 'TEXT' });
    setStatusMessage("Generating text...");
    try {
      const newText = await GeminiService.generateNodeText(storyNodes, node.id, localTextGenerationPrompt, masterPrompt);
      setLocalContent(newText);
      setStatusMessage("");
    } catch (e) {
      console.error(e);
      alert("Failed to generate text");
      setStatusMessage("Failed.");
    }
    setGenState({ isGenerating: false });
  };

  const generateMedia = async () => {
    if (localMediaType === 'video') {
      alert("Video generation is not yet implemented.");
      return;
    }
    if (!localMediaPrompt) return alert("Please enter an image prompt first.");
    setGenState({ isGenerating: true, type: 'MEDIA', mediaType: localMediaType });
    setStatusMessage("Generating image...");
    try {
      const uri = await GeminiService.generateNodeMedia(localMediaPrompt, localMediaType, localImageModel, localImageWidth, localImageHeight, (msg) => setStatusMessage(msg));
      onUpdate({ ...node, mediaUri: uri, mediaPrompt: localMediaPrompt, mediaType: localMediaType, imageModel: localImageModel, imageWidth: localImageWidth, imageHeight: localImageHeight });
      setStatusMessage("");
    } catch (e) {
      console.error(e);
      alert("Failed to generate image");
      setStatusMessage("Failed.");
    }
    setGenState({ isGenerating: false });
  };

  const generateCode = async () => {
    if (!localInteraction) return alert("Describe the interaction first.");
    setGenState({ isGenerating: true, type: 'CODE' });
    setStatusMessage("Generating code...");
    try {
      const code = await GeminiService.generateInteractionCode(localInteraction, worldSettings, currentStyle);
      setLocalCode(code);

      // Add initial generation message to chat
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `✨ Generated new JavaScript code based on: "${localInteraction}"`,
        timestamp: Date.now()
      };
      setCodeChatHistory(prev => [...prev, aiMessage]);
      setStatusMessage("");
    } catch (e) {
      console.error(e);
      alert("Failed to generate code");
      setStatusMessage("Failed.");
    }
    setGenState({ isGenerating: false });
  };

  // Handle code iteration through chat with detailed feedback
  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || isChatProcessing) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: chatMessage.trim(),
      timestamp: Date.now()
    };

    const updatedHistory = [...codeChatHistory, userMsg];
    setCodeChatHistory(updatedHistory);
    setChatMessage("");
    setIsChatProcessing(true);

    try {
      const oldCode = localCode;
      const newCode = await GeminiService.iterateCode(
        localCode,
        chatMessage.trim(),
        codeChatHistory,
        { worldSettings, currentStyle }
      );
      setLocalCode(newCode);

      // Generate detailed feedback about changes
      const feedback = generateCodeChangeFeedback(oldCode, newCode, chatMessage.trim());

      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: feedback,
        timestamp: Date.now()
      };
      setCodeChatHistory([...updatedHistory, aiMessage]);
    } catch (error) {
      console.error('Code iteration error:', error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to process request'}`,
        timestamp: Date.now()
      };
      setCodeChatHistory([...updatedHistory, errorMessage]);
    } finally {
      setIsChatProcessing(false);
    }
  };

  // Generate feedback about what changed in the code
  const generateCodeChangeFeedback = (oldCode: string, newCode: string, request: string): string => {
    const oldLines = oldCode.split('\n').length;
    const newLines = newCode.split('\n').length;
    const linesDiff = newLines - oldLines;

    let feedback = `✅ Code updated for: "${request}"\n\n`;

    // Analyze changes
    const changes: string[] = [];

    if (linesDiff > 0) {
      changes.push(`📝 Added ${linesDiff} new line${linesDiff > 1 ? 's' : ''}`);
    } else if (linesDiff < 0) {
      changes.push(`🗑️ Removed ${Math.abs(linesDiff)} line${Math.abs(linesDiff) > 1 ? 's' : ''}`);
    }

    // Check for common patterns
    if (newCode.includes('addEventListener') && !oldCode.includes('addEventListener')) {
      changes.push('🎯 Added event listener');
    }
    if (newCode.includes('setTimeout') && !oldCode.includes('setTimeout')) {
      changes.push('⏱️ Added timer/timeout');
    }
    if (newCode.includes('setInterval') && !oldCode.includes('setInterval')) {
      changes.push('🔄 Added interval');
    }
    if (newCode.includes('gameState.') && !oldCode.includes('gameState.')) {
      changes.push('💾 Added game state usage');
    }
    if ((newCode.match(/renderGame/g) || []).length > (oldCode.match(/renderGame/g) || []).length) {
      changes.push('🎨 Updated UI rendering');
    }
    if (newCode.includes('animation') || newCode.includes('animate')) {
      if (!oldCode.includes('animation') && !oldCode.includes('animate')) {
        changes.push('✨ Added animations');
      }
    }

    if (changes.length > 0) {
      feedback += changes.join('\n');
    } else {
      feedback += '🔧 Code structure modified';
    }

    return feedback;
  };

  const isGeneratingMedia = genState.isGenerating && genState.type === 'MEDIA';

  // Resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(600, Math.min(1200, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="bg-neutral-900 border-l border-neutral-700 h-full flex shadow-2xl overflow-hidden" style={{ width: `${panelWidth}px` }}>
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 bg-neutral-700 hover:bg-blue-500 cursor-ew-resize transition-colors flex-shrink-0"
      />

      {/* LEFT COLUMN - Code Editor & Chat */}
      <div className="w-[360px] flex-shrink-0 flex flex-col border-r border-neutral-700 bg-neutral-950">
        {/* Code Header */}
        <div className="p-3 border-b border-neutral-700 bg-neutral-900">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-indigo-400" />
            <span className="text-sm font-semibold text-neutral-200">JavaScript Logic</span>
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 overflow-hidden min-h-0">
          <CodeMirror
            value={localCode}
            onChange={(value) => setLocalCode(value)}
            extensions={[javascript()]}
            theme="dark"
            height="100%"
            className="h-full text-xs"
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: true,
              foldGutter: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              highlightActiveLine: true
            }}
          />
        </div>

        {/* Chat Box - Fixed at bottom */}
        <div className="h-64 flex-shrink-0 border-t border-neutral-700 flex flex-col bg-neutral-900">
          <div className="px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase">AI Chat</span>
            <span className="text-[10px] text-neutral-500">{codeChatHistory.length} messages</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-neutral-950">
            {codeChatHistory.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-4">
                Ask AI to modify the code...
              </p>
            ) : (
              codeChatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] px-3 py-2 rounded-lg text-xs ${msg.role === 'user'
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
          <div className="p-2 border-t border-neutral-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChatMessage()}
                placeholder="e.g., 'add a score counter'"
                disabled={isChatProcessing}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={handleSendChatMessage}
                disabled={!chatMessage.trim() || isChatProcessing}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isChatProcessing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN - Node Inspector */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="p-3 border-b border-neutral-700 flex justify-between items-center bg-neutral-900 flex-shrink-0">
          <h2 className="font-semibold text-neutral-100 flex items-center gap-2 text-sm">
            Node Inspector
            <span className="text-[10px] text-green-400 font-normal">● Auto-saving</span>
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-700 rounded text-neutral-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Content Section */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Story Content</label>
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              rows={4}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-neutral-300 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              placeholder="Write the story segment here..."
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={localTextGenerationPrompt}
                onChange={(e) => setLocalTextGenerationPrompt(e.target.value)}
                placeholder="Brief prompt for AI generation..."
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white outline-none"
              />
              <button
                onClick={generateText}
                disabled={genState.isGenerating || !localTextGenerationPrompt.trim()}
                className="text-xs flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded disabled:opacity-50"
              >
                {genState.isGenerating && genState.type === 'TEXT' ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
              </button>
            </div>
          </div>

          {/* Compact Media Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Visuals</label>

            <div className="flex bg-neutral-800 rounded p-0.5 gap-0.5">
              <button
                onClick={() => setLocalMediaType('image')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${localMediaType === 'image' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:bg-neutral-700'
                  }`}
              >
                <ImageIcon size={14} /> Image
              </button>
              <button
                onClick={() => setLocalMediaType('video')}
                disabled
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium text-neutral-600 cursor-not-allowed line-through"
                title="Video generation coming soon"
              >
                <Film size={14} /> Video
              </button>
            </div>

            {/* Model Selection (only for images) */}
            {localMediaType === 'image' && (
              <div className="space-y-1">
                <label className="text-[9px] font-medium text-neutral-400">Model</label>
                <select
                  value={localImageModel}
                  onChange={(e) => setLocalImageModel(e.target.value as 'flux-schnell' | 'flux-dev-gguf' | 'sdxl')}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                >
                  <option value="flux-schnell">Flux Schnell (Fast)</option>
                  <option value="flux-dev-gguf">Flux Dev GGUF (Quality)</option>
                  <option value="sdxl">SDXL (Alternative)</option>
                </select>

                {/* Dimension Controls */}
                <div className="space-y-1 mt-2">
                  <label className="text-[9px] font-medium text-neutral-400">Dimensions</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={localImageWidth}
                        onChange={(e) => setLocalImageWidth(Math.max(256, Math.min(2048, parseInt(e.target.value) || 512)))}
                        min="256"
                        max="2048"
                        step="64"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                        placeholder="Width"
                      />
                    </div>
                    <span className="text-neutral-500 text-xs flex items-center">×</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={localImageHeight}
                        onChange={(e) => setLocalImageHeight(Math.max(256, Math.min(2048, parseInt(e.target.value) || 512)))}
                        min="256"
                        max="2048"
                        step="64"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                        placeholder="Height"
                      />
                    </div>
                  </div>

                  {/* Preset Sizes */}
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => { setLocalImageWidth(512); setLocalImageHeight(512); }}
                      className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-[10px]"
                    >
                      512²
                    </button>
                    <button
                      onClick={() => { setLocalImageWidth(768); setLocalImageHeight(768); }}
                      className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-[10px]"
                    >
                      768²
                    </button>
                    <button
                      onClick={() => { setLocalImageWidth(1024); setLocalImageHeight(1024); }}
                      className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-[10px]"
                    >
                      1024²
                    </button>
                    <button
                      onClick={() => { setLocalImageWidth(1024); setLocalImageHeight(768); }}
                      className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-[10px]"
                    >
                      4:3
                    </button>
                    <button
                      onClick={() => { setLocalImageWidth(1280); setLocalImageHeight(720); }}
                      className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-[10px]"
                    >
                      16:9
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Only show preview if generating or has media */}
            {isGeneratingMedia && (
              <div className="h-24 bg-neutral-800 rounded border border-neutral-700 flex items-center justify-center text-blue-400 animate-pulse text-xs">
                <Loader2 className="animate-spin mr-2" size={16} />
                <span>{statusMessage || 'Generating...'}</span>
              </div>
            )}

            {!isGeneratingMedia && node.mediaUri && (
              <div className="relative group rounded overflow-hidden border border-neutral-700 h-32">
                <img src={node.mediaUri} alt="Node visual" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => onUpdate({ ...node, mediaUri: undefined, mediaPrompt: "" })}
                    className="text-white text-xs bg-red-600 hover:bg-red-500 px-3 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={localMediaPrompt}
                onChange={(e) => setLocalMediaPrompt(e.target.value)}
                placeholder="Describe the image scene..."
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white outline-none"
              />
              <button
                onClick={generateMedia}
                disabled={isGeneratingMedia || localMediaType === 'video'}
                className="bg-purple-600 hover:bg-purple-700 text-white p-1.5 rounded disabled:opacity-50"
                title="Generate image"
              >
                {isGeneratingMedia ? <Loader2 className="animate-spin" size={14} /> : <ImageIcon size={14} />}
              </button>
            </div>
          </div>

          {/* Interaction Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Interaction Logic</label>
              {/* Active Systems Pills */}
              <div className="flex gap-1">
                {worldSettings.useInventory && <span className="px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded text-[9px] border border-blue-800">Inv</span>}
                {worldSettings.useEconomy && <span className="px-1.5 py-0.5 bg-yellow-900/50 text-yellow-300 rounded text-[9px] border border-yellow-800">Gold</span>}
                {worldSettings.useCombat && <span className="px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded text-[9px] border border-red-800">HP</span>}
              </div>
            </div>

            <textarea
              value={localInteraction}
              onChange={(e) => setLocalInteraction(e.target.value)}
              rows={2}
              placeholder="E.g. 'Create a rhythm game where player presses A and L keys'"
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-xs text-neutral-300 outline-none resize-none"
            />
            <button
              onClick={generateCode}
              disabled={genState.isGenerating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded text-xs flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
            >
              {genState.isGenerating && genState.type === 'CODE' ? <Loader2 className="animate-spin" size={14} /> : <Terminal size={14} />}
              Generate JavaScript
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeInspector;