import React, { useState, useEffect, useRef } from 'react';
import { StoryNode, GenerationState, WorldSettings, StoryStyle, ChatMessage, VNSprite, VNAudio, CharacterReference } from '../types';
import { Wand2, Image as ImageIcon, Terminal, Loader2, X, Film, Send, Code2, User, Music, Trash2, Plus, Volume2, ChevronDown, ChevronRight, Type, Gamepad2, Link, Upload, Sparkles } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { ImageGenerationControls, ImageQuality, ImageStyle, getStepsFromQuality, enhancePromptWithStyle, QUALITY_STEPS } from './ImageGenerationControls';

interface NodeInspectorProps {
  node: StoryNode;
  worldSettings: WorldSettings;
  storyNodes: StoryNode[];
  masterPrompt: string;
  storyLanguage?: string;
  currentStyle?: StoryStyle;
  characters?: CharacterReference[];
  onCharactersChange?: (characters: CharacterReference[]) => void;
  onUpdate: (updatedNode: StoryNode) => void;
  onClose: () => void;
}

const NodeInspector: React.FC<NodeInspectorProps> = ({ node, worldSettings, storyNodes, masterPrompt, storyLanguage = 'en', currentStyle, characters = [], onCharactersChange, onUpdate, onClose }) => {
  // Check if we're in Visual Novel mode
  const isVNMode = currentStyle?.layoutMode === 'visual-novel';
  
  const [genState, setGenState] = useState<GenerationState>({ isGenerating: false });
  const [localTitle, setLocalTitle] = useState(node.title);
  const [localContent, setLocalContent] = useState(node.content);
  const [localMediaPrompt, setLocalMediaPrompt] = useState(node.mediaPrompt || "");
  const [localMediaType, setLocalMediaType] = useState<'image' | 'video'>(node.mediaType || 'image');
  const [localImageModel, setLocalImageModel] = useState<'sd-turbo' | 'flux-schnell' | 'flux-dev' | 'flux-krea-dev' | 'sdxl'>(node.imageModel || 'sd-turbo');
  const [localImageWidth, setLocalImageWidth] = useState<number>(node.imageWidth || 512);
  const [localImageHeight, setLocalImageHeight] = useState<number>(node.imageHeight || 512);
  const [localImageSteps, setLocalImageSteps] = useState<number>(node.imageSteps || 1);
  const [localInteraction, setLocalInteraction] = useState(node.interactionDescription || "");
  const [localCode, setLocalCode] = useState(node.interactionCode || "");
  const [localTextGenerationPrompt, setLocalTextGenerationPrompt] = useState("");
  const [localImageSceneDesc, setLocalImageSceneDesc] = useState(node.imageSceneDescription || "");
  const [statusMessage, setStatusMessage] = useState("");

  // Visual Novel state
  const [localVnBackground, setLocalVnBackground] = useState(node.vnBackground || "");
  const [localVnSprites, setLocalVnSprites] = useState<VNSprite[]>(node.vnSprites || []);
  const [localVnAudio, setLocalVnAudio] = useState<VNAudio[]>(node.vnAudio || []);
  const [localVnSpeaker, setLocalVnSpeaker] = useState(node.vnSpeaker || "");
  const [localVnTextEffect, setLocalVnTextEffect] = useState<'none' | 'typewriter' | 'fade'>(node.vnTextEffect || 'typewriter');

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    content: true,
    visuals: true,
    interaction: false,
    visualNovel: currentStyle?.layoutMode === 'visual-novel'
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Chat state for code iteration
  const [codeChatHistory, setCodeChatHistory] = useState<ChatMessage[]>(node.codeChatHistory || []);
  const [chatMessage, setChatMessage] = useState("");
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sprite generation state
  const [generatingSpriteIndex, setGeneratingSpriteIndex] = useState<number | null>(null);

  // Character reference state
  const [localCharacterId, setLocalCharacterId] = useState<string | undefined>(node.characterId);
  const [showCharacterManager, setShowCharacterManager] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterDesc, setNewCharacterDesc] = useState("");

  // Image quality and style state (from global style or defaults)
  const [localImageQuality, setLocalImageQuality] = useState<ImageQuality>(currentStyle?.imageQuality || 'medium');
  const [localImageStyle, setLocalImageStyle] = useState<ImageStyle>(currentStyle?.imageStyle || 'illustration');

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(720);
  const [isResizing, setIsResizing] = useState(false);

  // Sync local state when node prop changes
  useEffect(() => {
    setLocalTitle(node.title);
    setLocalContent(node.content);
    setLocalMediaPrompt(node.mediaPrompt || "");
    setLocalMediaType(node.mediaType || 'image');
    setLocalImageModel(node.imageModel || 'sd-turbo');
    setLocalImageWidth(node.imageWidth || 512);
    setLocalImageHeight(node.imageHeight || 512);
    setLocalImageSteps(node.imageSteps || 1);
    setLocalInteraction(node.interactionDescription || "");
    setLocalCode(node.interactionCode || "");
    setLocalImageSceneDesc(node.imageSceneDescription || "");
    setCodeChatHistory(node.codeChatHistory || []);
    setLocalTextGenerationPrompt("");
    setStatusMessage("");
    // Visual Novel
    setLocalVnBackground(node.vnBackground || "");
    setLocalVnSprites(node.vnSprites || []);
    setLocalVnAudio(node.vnAudio || []);
    setLocalVnSpeaker(node.vnSpeaker || "");
    setLocalVnTextEffect(node.vnTextEffect || 'typewriter');
    // Character reference
    setLocalCharacterId(node.characterId);
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
        imageSteps: localImageSteps,
        imageSceneDescription: localImageSceneDesc,
        interactionDescription: localInteraction,
        interactionCode: localCode,
        codeChatHistory: codeChatHistory,
        // Visual Novel fields
        vnBackground: localVnBackground || undefined,
        vnSprites: localVnSprites.length > 0 ? localVnSprites : undefined,
        vnAudio: localVnAudio.length > 0 ? localVnAudio : undefined,
        vnSpeaker: localVnSpeaker || undefined,
        vnTextEffect: localVnTextEffect,
        // Character reference
        characterId: localCharacterId
      });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localTitle, localContent, localMediaPrompt, localMediaType, localImageSceneDesc, localInteraction, localCode, codeChatHistory, localVnBackground, localVnSprites, localVnAudio, localVnSpeaker, localVnTextEffect, localCharacterId]);

  const generateText = async () => {
    if (!localTextGenerationPrompt.trim()) return alert("Please enter a brief prompt for text generation.");
    setGenState({ isGenerating: true, type: 'TEXT' });
    setStatusMessage("Generating text...");
    try {
      const newText = await GeminiService.generateNodeText(storyNodes, node.id, localTextGenerationPrompt, masterPrompt, storyLanguage);
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

    // Use scene description if available, otherwise use media prompt
    const basePrompt = localImageSceneDesc || localMediaPrompt;
    if (!basePrompt) return alert("Please enter an image prompt or generate a scene description first.");

    // Enhance prompt with selected style
    const promptToUse = enhancePromptWithStyle(basePrompt, localImageStyle);
    
    // Get steps from quality setting
    const stepsToUse = getStepsFromQuality(localImageQuality);

    setGenState({ isGenerating: true, type: 'MEDIA', mediaType: localMediaType });
    
    // Check if we have a character reference for img2img
    const selectedCharacter = localCharacterId ? characters.find(c => c.id === localCharacterId) : undefined;
    
    let referenceImage: string | undefined;
    let modelToUse = localImageModel;
    let img2imgStrength = 0.75; // Default strength
    
    if (selectedCharacter?.referenceImage) {
      // Use character reference for img2img consistency
      referenceImage = selectedCharacter.referenceImage;
      modelToUse = selectedCharacter.model; // Use the character's model for consistency
      img2imgStrength = selectedCharacter.strength || 0.7; // Use character's strength setting
      setStatusMessage(`Generating ${localImageQuality} quality with ${selectedCharacter.name}...`);
    } else if (node.uploadedImage && node.mediaUri) {
      // Fallback to uploaded image if available
      referenceImage = node.mediaUri;
      img2imgStrength = 0.75;
      setStatusMessage(`Generating ${localImageQuality} quality image...`);
    } else {
      setStatusMessage(`Generating ${localImageQuality} quality image...`);
    }

    try {
      const uri = await GeminiService.generateNodeMedia(
        promptToUse,
        localMediaType,
        modelToUse,
        localImageWidth,
        localImageHeight,
        stepsToUse,
        (msg) => setStatusMessage(msg),
        referenceImage,
        img2imgStrength
      );

      onUpdate({
        ...node,
        mediaUri: uri,
        mediaPrompt: localMediaPrompt,
        imageSceneDescription: localImageSceneDesc,
        mediaType: localMediaType,
        imageModel: modelToUse,
        imageWidth: localImageWidth,
        imageHeight: localImageHeight,
        imageSteps: localImageSteps,
        characterId: localCharacterId,
        uploadedImage: false // Mark as generated, not uploaded
      });
      setStatusMessage("");
    } catch (e) {
      console.error(e);
      alert("Failed to generate image");
      setStatusMessage("Failed.");
    }
    setGenState({ isGenerating: false });
  };

  // Handle image upload
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file is too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdate({
        ...node,
        mediaUri: base64,
        uploadedImage: true // Mark as uploaded
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle image download
  const handleDownloadImage = () => {
    if (!node.mediaUri) return;

    const link = document.createElement('a');
    link.href = node.mediaUri;
    link.download = `${node.title.replace(/\s+/g, '_')}_image.png`;
    link.click();
  };

  // Generate character sprite using SDXL
  const generateCharacterSprite = async (index: number, description: string) => {
    if (!description.trim()) {
      alert("Please enter a character description first.");
      return;
    }

    setGeneratingSpriteIndex(index);
    
    // Get steps from quality setting
    const stepsToUse = getStepsFromQuality(localImageQuality);
    
    // Optimized prompt for VN sprite with style
    const basePrompt = `visual novel character sprite, full body portrait, ${description}, standing pose, facing viewer, simple clean lineart, cel shading, solid color background, white background, no background details, isolated character, game asset, transparent background ready`;
    const spritePrompt = enhancePromptWithStyle(basePrompt, localImageStyle);

    setStatusMessage(`Generating ${localImageQuality} quality sprite...`);

    try {
      const uri = await GeminiService.generateNodeMedia(
        spritePrompt,
        'image',
        currentStyle?.vnCharacterModel || 'sdxl', // Use VN character model from style
        currentStyle?.vnCharacterWidth || 512,    // Width
        currentStyle?.vnCharacterHeight || 768,   // Height (taller for full body)
        stepsToUse,     // Steps from quality
        (msg) => setStatusMessage(msg)
      );

      // Update the sprite with generated image
      const updated = [...localVnSprites];
      updated[index] = { ...updated[index], imageUri: uri };
      setLocalVnSprites(updated);
      setStatusMessage("");
    } catch (e) {
      console.error(e);
      alert("Failed to generate sprite. Try again or use a different description.");
      setStatusMessage("Failed.");
    }
    
    setGeneratingSpriteIndex(null);
  };

  // State for VN background generation
  const [vnBgPrompt, setVnBgPrompt] = useState("");
  const [isGeneratingVnBg, setIsGeneratingVnBg] = useState(false);

  // Generate VN background using AI
  const generateVnBackground = async () => {
    if (!vnBgPrompt.trim()) {
      alert("Please enter a background description first.");
      return;
    }

    setIsGeneratingVnBg(true);
    
    // Get steps from quality setting
    const stepsToUse = getStepsFromQuality(localImageQuality);
    
    setStatusMessage(`Generating ${localImageQuality} quality background...`);
    
    // Optimized prompt for VN background with style
    const basePrompt = `visual novel background, ${vnBgPrompt}, detailed environment, atmospheric lighting, no characters, wide shot, game background asset`;
    const bgPrompt = enhancePromptWithStyle(basePrompt, localImageStyle);

    try {
      const uri = await GeminiService.generateNodeMedia(
        bgPrompt,
        'image',
        currentStyle?.vnBackgroundModel || localImageModel,
        currentStyle?.vnBackgroundWidth || 1024,   // Width - wider for backgrounds
        currentStyle?.vnBackgroundHeight || 768,    // Height
        stepsToUse,
        (msg) => setStatusMessage(msg)
      );

      setLocalVnBackground(uri);
      setStatusMessage("");
    } catch (e) {
      console.error(e);
      alert("Failed to generate background. Try again.");
      setStatusMessage("Failed.");
    }
    
    setIsGeneratingVnBg(false);
  };

  // Generate scene description
  const generateSceneDescription = async () => {
    setGenState({ isGenerating: true, type: 'TEXT' });
    setStatusMessage("Generating scene description...");
    try {
      const desc = await GeminiService.generateImageSceneDescription(
        localContent,
        localTitle,
        masterPrompt,
        storyNodes,
        node.id
      );
      setLocalImageSceneDesc(desc);
      setStatusMessage("");
    } catch (e) {
      console.error(e);
      alert("Failed to generate scene description");
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

  // Show code panel only when there's code
  const showCodePanel = localCode.trim().length > 0;

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

      {/* LEFT COLUMN - Code Editor & Chat - CONDITIONAL */}
      {showCodePanel && (
        <div className="w-[360px] flex-shrink-0 flex flex-col border-r border-neutral-700 bg-neutral-950 animate-in slide-in-from-left duration-300">
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
      )}

      {/* RIGHT COLUMN - Node Inspector */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-neutral-900">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="font-semibold text-white text-base">Node Inspector</h2>
            <span className="text-xs text-emerald-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Auto-saving
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title - Always visible */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400">Title</label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-3 text-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-colors"
              placeholder="Enter node title..."
            />
          </div>

          {/* Standard Mode Sections - Hidden in VN Mode */}
          {!isVNMode && (
          <>
          {/* Content Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-400 flex items-center gap-2">
                <Type size={14} className="text-indigo-400" />
                Story Content
              </label>
              <button
                onClick={generateText}
                disabled={genState.isGenerating || !localTextGenerationPrompt.trim()}
                className="text-xs flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors"
              >
                {genState.isGenerating && genState.type === 'TEXT' ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
                Generate
              </button>
            </div>
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              rows={8}
              className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-3 text-neutral-200 text-sm leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none resize-none transition-colors"
              placeholder="Write the story segment here..."
            />
            <input
              type="text"
              value={localTextGenerationPrompt}
              onChange={(e) => setLocalTextGenerationPrompt(e.target.value)}
              placeholder="AI prompt: describe what to generate..."
              className="w-full bg-neutral-800/30 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-300 outline-none focus:border-indigo-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && generateText()}
            />
          </div>

          <div className="border-t border-neutral-800"></div>

          {/* Visuals Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-400 flex items-center gap-2">
                <ImageIcon size={14} className="text-purple-400" />
                Image Generation
              </label>
              <button
                onClick={generateMedia}
                disabled={isGeneratingMedia || (!localImageSceneDesc && !localMediaPrompt)}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {isGeneratingMedia ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                Generate
              </button>
            </div>

            {/* Image Preview */}
            {isGeneratingMedia && (
              <div className="aspect-video bg-neutral-800/50 rounded-xl border border-neutral-700 flex flex-col items-center justify-center text-indigo-400">
                <Loader2 className="animate-spin mb-2" size={24} />
                <span className="text-xs text-neutral-400">{statusMessage || 'Generating image...'}</span>
              </div>
            )}

            {!isGeneratingMedia && node.mediaUri && (
              <div className="relative group rounded-xl overflow-hidden border border-neutral-700 aspect-video">
                <img src={node.mediaUri} alt="Node visual" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={handleDownloadImage}
                    className="text-white text-xs bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => onUpdate({ ...node, mediaUri: undefined, mediaPrompt: "", uploadedImage: false })}
                    className="text-white text-xs bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-lg font-medium"
                  >
                    Remove
                  </button>
                </div>
                {node.uploadedImage && (
                  <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-md font-medium">
                    Uploaded
                  </div>
                )}
              </div>
            )}

            {/* Scene Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-500">Scene Description</label>
                <button
                  onClick={generateSceneDescription}
                  disabled={genState.isGenerating}
                  className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 flex items-center gap-1"
                >
                  <Wand2 size={10} /> Auto-generate
                </button>
              </div>
              <textarea
                value={localImageSceneDesc}
                onChange={(e) => setLocalImageSceneDesc(e.target.value)}
                rows={3}
                placeholder="Describe the scene for AI image generation..."
                className="w-full bg-neutral-800/30 border border-neutral-700/50 rounded-lg px-4 py-3 text-sm text-neutral-300 outline-none resize-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Simple Prompt Alternative */}
            <input
              type="text"
              value={localMediaPrompt}
              onChange={(e) => setLocalMediaPrompt(e.target.value)}
              placeholder="Or enter a simple prompt..."
              className="w-full bg-neutral-800/30 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-300 outline-none focus:border-purple-500 transition-colors"
            />

            {/* Quality & Style Controls */}
            <div className="bg-neutral-800/30 rounded-lg p-3 border border-neutral-700/50">
              <ImageGenerationControls
                quality={localImageQuality}
                style={localImageStyle}
                onQualityChange={setLocalImageQuality}
                onStyleChange={setLocalImageStyle}
              />
            </div>

            {/* Model & Format Selection */}
            <div className="grid grid-cols-2 gap-3">
              {/* Model */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Model</label>
                <select
                  value={localImageModel}
                  onChange={(e) => setLocalImageModel(e.target.value as 'sd-turbo' | 'flux-schnell' | 'flux-dev' | 'flux-krea-dev' | 'sdxl')}
                  className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500"
                >
                  <option value="sd-turbo">SD Turbo ⚡</option>
                  <option value="flux-schnell">Flux Schnell</option>
                  <option value="flux-dev">Flux Dev</option>
                  <option value="sdxl">SDXL</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Format</label>
                <div className="flex gap-1.5">
                  {[
                    { w: 512, h: 512, label: '1:1' },
                    { w: 768, h: 512, label: '3:2' },
                    { w: 1024, h: 576, label: '16:9' },
                  ].map(({ w, h, label }) => (
                    <button
                      key={label}
                      onClick={() => { setLocalImageWidth(w); setLocalImageHeight(h); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        localImageWidth === w && localImageHeight === h
                          ? 'bg-purple-600 text-white'
                          : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Character Reference for Consistency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <User size={12} className="text-indigo-400" />
                  Character Reference
                </label>
                <button
                  onClick={() => setShowCharacterManager(!showCharacterManager)}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {showCharacterManager ? 'Hide' : 'Manage'}
                </button>
              </div>
              
              {/* Character Selector */}
              <select
                value={localCharacterId || ''}
                onChange={(e) => setLocalCharacterId(e.target.value || undefined)}
                className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="">No character (text-to-image)</option>
                {characters.map(char => (
                  <option key={char.id} value={char.id}>
                    {char.name} ({char.model})
                  </option>
                ))}
              </select>

              {/* Selected Character Preview with Strength Control */}
              {localCharacterId && characters.find(c => c.id === localCharacterId) && (() => {
                const char = characters.find(c => c.id === localCharacterId)!;
                return (
                  <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <img 
                        src={char.referenceImage} 
                        alt="Character ref" 
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">{char.name}</div>
                        <div className="text-[10px] text-neutral-400">img2img with {char.model}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-neutral-400">Variation</span>
                        <span className="text-indigo-300">{Math.round((char.strength || 0.7) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.3"
                        max="0.9"
                        step="0.05"
                        value={char.strength || 0.7}
                        onChange={(e) => {
                          const newStrength = parseFloat(e.target.value);
                          onCharactersChange?.(characters.map(c => 
                            c.id === char.id ? { ...c, strength: newStrength } : c
                          ));
                        }}
                        className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-neutral-500">
                        <span>More similar</span>
                        <span>More creative</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Character Manager */}
              {showCharacterManager && (
                <div className="space-y-3 bg-neutral-800/30 border border-neutral-700 rounded-lg p-3">
                  <div className="text-xs font-medium text-neutral-300">Create New Character</div>
                  
                  {/* New Character Form */}
                  <input
                    type="text"
                    value={newCharacterName}
                    onChange={(e) => setNewCharacterName(e.target.value)}
                    placeholder="Character name..."
                    className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                  <textarea
                    value={newCharacterDesc}
                    onChange={(e) => setNewCharacterDesc(e.target.value)}
                    placeholder="Character description (for prompt enhancement)..."
                    rows={2}
                    className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none resize-none"
                  />
                  
                  <div className="text-[10px] text-neutral-500">
                    Generate or upload an image above, then save it as a character reference.
                  </div>
                  
                  <button
                    onClick={() => {
                      if (!newCharacterName.trim()) return alert("Enter a character name");
                      if (!node.mediaUri) return alert("Generate or upload an image first");
                      
                      const newChar: CharacterReference = {
                        id: `char_${Date.now()}`,
                        name: newCharacterName.trim(),
                        description: newCharacterDesc.trim(),
                        referenceImage: node.mediaUri,
                        model: localImageModel,
                        strength: 0.7 // Default: 70% creativity, 30% reference similarity
                      };
                      
                      onCharactersChange?.([...characters, newChar]);
                      setLocalCharacterId(newChar.id);
                      setNewCharacterName("");
                      setNewCharacterDesc("");
                      setShowCharacterManager(false);
                    }}
                    disabled={!node.mediaUri || !newCharacterName.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-medium py-2 rounded-lg transition-colors"
                  >
                    Save Current Image as Character
                  </button>

                  {/* Existing Characters */}
                  {characters.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-700">
                      <div className="text-xs font-medium text-neutral-400">Saved Characters</div>
                      {characters.map(char => (
                        <div key={char.id} className="flex gap-2 items-center bg-neutral-800/50 rounded-lg p-2">
                          <img src={char.referenceImage} alt={char.name} className="w-10 h-10 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-white truncate">{char.name}</div>
                            <div className="text-[10px] text-neutral-500">{char.model}</div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Delete character "${char.name}"?`)) {
                                onCharactersChange?.(characters.filter(c => c.id !== char.id));
                                if (localCharacterId === char.id) setLocalCharacterId(undefined);
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Upload / URL */}
            <div className="flex gap-2">
              <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" id="image-upload" />
              <label
                htmlFor="image-upload"
                className="flex-1 flex items-center justify-center gap-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white py-2.5 rounded-lg text-xs cursor-pointer transition-colors"
              >
                <Upload size={14} /> Upload Image
              </label>
              <div className="flex-1 relative">
                <input
                  type="url"
                  placeholder="Paste URL..."
                  className="w-full h-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 pl-8 text-xs text-white outline-none focus:border-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const url = (e.target as HTMLInputElement).value.trim();
                      if (url) {
                        onUpdate({ ...node, mediaUri: url, uploadedImage: false });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
                <Link size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              </div>
            </div>
          </div>

          {/* Interaction Section - Hidden: JS game generation not working
          <div className="border border-neutral-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('interaction')}
              className="w-full flex items-center justify-between p-3 bg-neutral-800/50 hover:bg-neutral-800 transition-colors"
            >
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Gamepad2 size={12} /> Interaction Logic
              </span>
            </button>
          </div>
          */}
          </>
          )}

          {/* Visual Novel Section - Only in VN Mode */}
          {isVNMode && (
          <div className="space-y-5">
            {/* Dialogue Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400 flex items-center gap-2">
                  <Type size={14} className="text-pink-400" />
                  Dialogue / Narration
                </label>
                <button
                  onClick={generateText}
                  disabled={genState.isGenerating || !localTextGenerationPrompt.trim()}
                  className="text-xs flex items-center gap-1.5 text-pink-400 hover:text-pink-300 disabled:opacity-40 transition-colors"
                >
                  {genState.isGenerating && genState.type === 'TEXT' ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
                  Generate
                </button>
              </div>
              <textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                rows={6}
                className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-3 text-neutral-200 text-sm leading-relaxed focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20 outline-none resize-none transition-colors"
                placeholder="Write the dialogue or narration for this scene..."
              />
              <input
                type="text"
                value={localTextGenerationPrompt}
                onChange={(e) => setLocalTextGenerationPrompt(e.target.value)}
                placeholder="AI prompt: describe the scene mood..."
                className="w-full bg-neutral-800/30 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-300 outline-none focus:border-pink-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && generateText()}
              />
            </div>

            <div className="border-t border-neutral-800"></div>

            {/* Speaker & Effects */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400 flex items-center gap-2">
                  <User size={14} className="text-pink-400" />
                  Speaker
                </label>
                <input
                  type="text"
                  value={localVnSpeaker}
                  onChange={(e) => setLocalVnSpeaker(e.target.value)}
                  placeholder="Character name..."
                  className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:border-pink-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-400">Text Effect</label>
                <div className="flex gap-1.5">
                  {(['none', 'typewriter', 'fade'] as const).map(effect => (
                    <button
                      key={effect}
                      onClick={() => setLocalVnTextEffect(effect)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        localVnTextEffect === effect 
                          ? 'bg-pink-600 text-white' 
                          : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
                      }`}
                    >
                      {effect.charAt(0).toUpperCase() + effect.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-800"></div>

            {/* Background Image */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-neutral-400 flex items-center gap-2">
                <ImageIcon size={14} className="text-pink-400" />
                Background Image
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setLocalVnBackground(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="vn-bg-upload"
                />
                <label
                  htmlFor="vn-bg-upload"
                  className="flex-1 flex items-center justify-center gap-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white py-2.5 rounded-lg text-xs cursor-pointer transition-colors"
                >
                  <Upload size={14} /> Upload
                </label>
                <div className="flex-1 relative">
                  <input
                    type="url"
                    placeholder="Paste URL..."
                    className="w-full h-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 pl-8 text-xs text-white outline-none focus:border-pink-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const url = (e.target as HTMLInputElement).value.trim();
                        if (url) {
                          setLocalVnBackground(url);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <Link size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                </div>
                {localVnBackground && (
                  <button
                    onClick={() => setLocalVnBackground("")}
                    className="p-2.5 bg-red-900/50 hover:bg-red-800 text-red-300 rounded-lg"
                    title="Remove background"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              
              {/* Background Preview */}
              {localVnBackground && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-neutral-700">
                  <img src={localVnBackground} alt="BG Preview" className="w-full h-full object-cover" />
                </div>
              )}
              
              {/* AI Background Generator */}
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={vnBgPrompt}
                    onChange={(e) => setVnBgPrompt(e.target.value)}
                    placeholder="AI prompt for background..."
                    className="flex-1 bg-neutral-800/30 border border-neutral-700/50 rounded-lg px-4 py-2.5 text-sm text-neutral-300 outline-none focus:border-pink-500 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && generateVnBackground()}
                  />
                  <button
                    onClick={generateVnBackground}
                    disabled={isGeneratingVnBg}
                    className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-600/50 text-white text-xs font-medium px-3 py-2.5 rounded-lg transition-colors"
                  >
                    {isGeneratingVnBg ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    Generate
                  </button>
                </div>
                {/* Compact Quality & Style for VN */}
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>Quality & Style:</span>
                  <ImageGenerationControls
                    quality={localImageQuality}
                    style={localImageStyle}
                    onQualityChange={setLocalImageQuality}
                    onStyleChange={setLocalImageStyle}
                    compact={true}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-800"></div>

            {/* Character Sprites */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400 flex items-center gap-2">
                  <User size={14} className="text-pink-400" /> Character Sprites
                </label>
                <button
                  onClick={() => {
                    const newSprite: VNSprite = {
                      id: `sprite_${Date.now()}`,
                      name: '',
                      imageUri: '',
                      position: 'center',
                      scale: 1
                    };
                    setLocalVnSprites([...localVnSprites, newSprite]);
                  }}
                  className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              
              {localVnSprites.map((sprite, index) => (
                <div key={sprite.id} className="bg-neutral-800/30 rounded-lg p-3 space-y-3 border border-neutral-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sprite.name}
                      onChange={(e) => {
                        const updated = [...localVnSprites];
                        updated[index] = { ...sprite, name: e.target.value };
                        setLocalVnSprites(updated);
                      }}
                      placeholder="Character name"
                      className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                    <select
                      value={sprite.position}
                      onChange={(e) => {
                        const updated = [...localVnSprites];
                        updated[index] = { ...sprite, position: e.target.value as 'left' | 'center' | 'right' };
                        setLocalVnSprites(updated);
                      }}
                      className="bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                    <button
                      onClick={() => setLocalVnSprites(localVnSprites.filter((_, i) => i !== index))}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const updated = [...localVnSprites];
                            updated[index] = { ...sprite, imageUri: ev.target?.result as string };
                            setLocalVnSprites(updated);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id={`sprite-upload-${sprite.id}`}
                    />
                    <label
                      htmlFor={`sprite-upload-${sprite.id}`}
                      className="flex items-center gap-1 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 py-2 px-3 rounded-lg text-xs cursor-pointer"
                    >
                      <Upload size={12} />
                    </label>
                    <input
                      type="url"
                      placeholder="Or paste sprite URL..."
                      defaultValue={sprite.imageUri?.startsWith('http') ? sprite.imageUri : ''}
                      className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const url = (e.target as HTMLInputElement).value.trim();
                          if (url) {
                            const updated = [...localVnSprites];
                            updated[index] = { ...sprite, imageUri: url };
                            setLocalVnSprites(updated);
                          }
                        }
                      }}
                    />
                    {sprite.imageUri && (
                      <img src={sprite.imageUri} alt={sprite.name} className="h-10 w-10 object-contain rounded-lg border border-neutral-700" />
                    )}
                  </div>
                  {/* AI Sprite Generator */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="AI: describe character..."
                      className="flex-1 bg-neutral-800/30 border border-neutral-700/50 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                      id={`sprite-desc-${sprite.id}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          generateCharacterSprite(index, (e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`sprite-desc-${sprite.id}`) as HTMLInputElement;
                        generateCharacterSprite(index, input?.value || '');
                      }}
                      disabled={generatingSpriteIndex === index}
                      className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-600/50 text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                    >
                      {generatingSpriteIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Generate
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-800"></div>

            {/* Audio */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-400 flex items-center gap-2">
                  <Music size={14} className="text-pink-400" /> Audio
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const newAudio: VNAudio = {
                        type: 'bgm',
                        uri: '',
                        name: 'Background Music',
                        loop: true,
                        volume: 0.5
                      };
                      setLocalVnAudio([...localVnAudio, newAudio]);
                    }}
                    className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  >
                    <Plus size={12} /> BGM
                  </button>
                  <button
                    onClick={() => {
                      const newAudio: VNAudio = {
                        type: 'sfx',
                        uri: '',
                        name: 'Sound Effect',
                        loop: false,
                        volume: 1
                      };
                      setLocalVnAudio([...localVnAudio, newAudio]);
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Plus size={12} /> SFX
                  </button>
                </div>
              </div>

              {localVnAudio.map((audio, index) => (
                <div key={index} className="bg-neutral-800/30 rounded-lg p-3 space-y-2 border border-neutral-700">
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${audio.type === 'bgm' ? 'bg-pink-900/50 text-pink-300' : 'bg-indigo-900/50 text-indigo-300'}`}>
                      {audio.type.toUpperCase()}
                    </span>
                    <input
                      type="text"
                      value={audio.name || ''}
                      onChange={(e) => {
                        const updated = [...localVnAudio];
                        updated[index] = { ...audio, name: e.target.value };
                        setLocalVnAudio(updated);
                      }}
                      placeholder="Audio name"
                      className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                    <button
                      onClick={() => setLocalVnAudio(localVnAudio.filter((_, i) => i !== index))}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const updated = [...localVnAudio];
                            updated[index] = { ...audio, uri: ev.target?.result as string };
                            setLocalVnAudio(updated);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id={`audio-upload-${index}`}
                    />
                    <label
                      htmlFor={`audio-upload-${index}`}
                      className="flex items-center gap-1 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 py-2 px-3 rounded-lg text-xs cursor-pointer"
                    >
                      <Upload size={12} />
                    </label>
                    <input
                      type="url"
                      placeholder="Or paste audio URL..."
                      defaultValue={audio.uri?.startsWith('http') ? audio.uri : ''}
                      className="flex-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const url = (e.target as HTMLInputElement).value.trim();
                          if (url) {
                            const updated = [...localVnAudio];
                            updated[index] = { ...audio, uri: url };
                            setLocalVnAudio(updated);
                          }
                        }
                      }}
                    />
                    {audio.uri && <Volume2 size={14} className="text-emerald-400" />}
                  </div>
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2 text-xs text-neutral-400">
                      <input
                        type="checkbox"
                        checked={audio.loop ?? (audio.type === 'bgm')}
                        onChange={(e) => {
                          const updated = [...localVnAudio];
                          updated[index] = { ...audio, loop: e.target.checked };
                          setLocalVnAudio(updated);
                        }}
                        className="accent-pink-500 w-4 h-4"
                      />
                      Loop
                    </label>
                    <div className="flex-1 flex items-center gap-2">
                      <label className="text-xs text-neutral-500">Vol:</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={audio.volume ?? 1}
                        onChange={(e) => {
                          const updated = [...localVnAudio];
                          updated[index] = { ...audio, volume: parseFloat(e.target.value) };
                          setLocalVnAudio(updated);
                        }}
                        className="flex-1 accent-pink-500"
                      />
                      <span className="text-xs text-neutral-400 w-8">{Math.round((audio.volume ?? 1) * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeInspector;