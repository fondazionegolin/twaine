import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoryNode, StoryStyle, VNSprite, VNAudio } from '../types';
import { ArrowRight, Volume2, VolumeX, Settings, Home } from 'lucide-react';

interface GameState {
  hp?: number;
  maxHp?: number;
  gold?: number;
  inventory?: string[];
  [key: string]: unknown;
}

interface VisualNovelPlayerProps {
  node: StoryNode;
  style?: StoryStyle;
  onChoice: (targetNodeId: string) => void;
  onExit: () => void;
  gameState?: GameState;
  gameLog?: string[];
}

const VisualNovelPlayer: React.FC<VisualNovelPlayerProps> = ({
  node,
  style,
  onChoice,
  onExit,
  gameState = {} as GameState,
  gameLog = []
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [textSpeed, setTextSpeed] = useState(30); // ms per character
  
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // Get background - prefer vnBackground, fallback to mediaUri
  const backgroundImage = node.vnBackground || (node.mediaType === 'image' ? node.mediaUri : undefined);

  // Typewriter effect
  useEffect(() => {
    if (node.vnTextEffect === 'typewriter' && !showFullText) {
      setDisplayedText('');
      setIsTyping(true);
      let index = 0;
      const text = node.content;

      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }

      typewriterRef.current = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          if (typewriterRef.current) {
            clearInterval(typewriterRef.current);
          }
        }
      }, textSpeed);

      return () => {
        if (typewriterRef.current) {
          clearInterval(typewriterRef.current);
        }
      };
    } else {
      setDisplayedText(node.content);
      setIsTyping(false);
    }
  }, [node.id, node.content, node.vnTextEffect, textSpeed, showFullText]);

  // Handle click to skip typewriter
  const handleTextClick = useCallback(() => {
    if (isTyping) {
      setShowFullText(true);
      setDisplayedText(node.content);
      setIsTyping(false);
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    }
  }, [isTyping, node.content]);

  // Reset showFullText when node changes
  useEffect(() => {
    setShowFullText(false);
  }, [node.id]);

  // Audio management
  useEffect(() => {
    if (!node.vnAudio || isMuted) return;

    // Handle BGM
    const bgm = node.vnAudio.find(a => a.type === 'bgm');
    if (bgm) {
      if (bgmRef.current) {
        bgmRef.current.pause();
      }
      const audio = new Audio(bgm.uri);
      audio.loop = bgm.loop !== false;
      audio.volume = bgm.volume ?? 0.5;
      audio.play().catch(console.error);
      bgmRef.current = audio;
    }

    // Handle SFX
    const sfxList = node.vnAudio.filter(a => a.type === 'sfx');
    sfxList.forEach(sfx => {
      const audio = new Audio(sfx.uri);
      audio.loop = sfx.loop ?? false;
      audio.volume = sfx.volume ?? 1;
      audio.play().catch(console.error);
      sfxRefs.current.set(sfx.uri, audio);
    });

    return () => {
      // Cleanup SFX on node change
      sfxRefs.current.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      sfxRefs.current.clear();
    };
  }, [node.id, node.vnAudio, isMuted]);

  // Cleanup BGM on unmount
  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (bgmRef.current) {
        bgmRef.current.muted = newMuted;
      }
      return newMuted;
    });
  }, []);

  // Get sprite position styles
  const getSpriteStyle = (sprite: VNSprite): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      bottom: '20%',
      transform: 'translateX(-50%)',
      maxHeight: '70vh',
      objectFit: 'contain',
      transition: 'all 0.3s ease-out',
      filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))',
    };

    const scale = sprite.scale ?? 1;
    const offsetY = sprite.offsetY ?? 0;

    switch (sprite.position) {
      case 'left':
        return { ...baseStyle, left: '20%', transform: `translateX(-50%) scale(${scale}) translateY(${offsetY}px)` };
      case 'right':
        return { ...baseStyle, left: '80%', transform: `translateX(-50%) scale(${scale}) translateY(${offsetY}px)` };
      case 'center':
      default:
        return { ...baseStyle, left: '50%', transform: `translateX(-50%) scale(${scale}) translateY(${offsetY}px)` };
    }
  };

  const accentColor = style?.accentColor || '#60a5fa';
  const textColor = style?.textColor || '#ffffff';

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      {/* Background Layer */}
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: style?.background || 'linear-gradient(to bottom, #1a1a2e, #0f0f1a)' }}
        />
      )}

      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
      }} />

      {/* Sprites Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {node.vnSprites?.map(sprite => (
          <img
            key={sprite.id}
            src={sprite.imageUri}
            alt={sprite.name}
            style={getSpriteStyle(sprite)}
            className="animate-in fade-in slide-in-from-bottom-4 duration-300"
          />
        ))}
      </div>

      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={toggleMute}
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm"
          title="Settings"
        >
          <Settings size={20} />
        </button>
        <button
          onClick={onExit}
          className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors backdrop-blur-sm"
          title="Exit to Editor"
        >
          <Home size={20} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-50 bg-black/80 backdrop-blur-md rounded-lg p-4 w-64 border border-white/10">
          <h3 className="text-white font-semibold mb-3">Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="text-white/70 text-sm block mb-1">Text Speed</label>
              <input
                type="range"
                min="10"
                max="100"
                value={100 - textSpeed}
                onChange={(e) => setTextSpeed(100 - parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-white/50">
                <span>Slow</span>
                <span>Fast</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Game State Display (if any) */}
      {(gameState.hp !== undefined || gameState.gold !== undefined || gameState.inventory?.length > 0) && (
        <div className="absolute top-4 left-4 z-40 flex gap-3 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-sm">
          {gameState.hp !== undefined && (
            <span className="text-red-400">❤️ {gameState.hp}/{gameState.maxHp || '?'}</span>
          )}
          {gameState.gold !== undefined && (
            <span className="text-yellow-400">💰 {gameState.gold}</span>
          )}
          {gameState.inventory?.length > 0 && (
            <span className="text-blue-400">🎒 {gameState.inventory.length}</span>
          )}
        </div>
      )}

      {/* Game Log */}
      {gameLog.length > 0 && (
        <div className="absolute top-20 left-4 z-40 max-w-xs bg-black/70 backdrop-blur-sm rounded-lg p-3 text-sm font-mono text-yellow-200 border-l-2 border-yellow-500">
          {gameLog.slice(-3).map((log, i) => (
            <div key={i} className="opacity-80">&gt; {log}</div>
          ))}
        </div>
      )}

      {/* Dialogue Box */}
      <div 
        className="absolute bottom-0 left-0 right-0 z-40"
        onClick={handleTextClick}
      >
        {/* Speaker Name */}
        {node.vnSpeaker && (
          <div 
            className="ml-8 mb-[-1px] inline-block px-6 py-2 rounded-t-lg font-semibold text-lg"
            style={{
              background: `linear-gradient(to bottom, ${accentColor}dd, ${accentColor}aa)`,
              color: textColor,
              fontFamily: style?.titleFontFamily || style?.fontFamily || 'sans-serif',
            }}
          >
            {node.vnSpeaker}
          </div>
        )}

        {/* Main Dialogue Box */}
        <div 
          className="mx-4 mb-4 p-6 rounded-xl backdrop-blur-md border transition-all"
          style={{
            background: 'rgba(0, 0, 0, 0.75)',
            borderColor: `${accentColor}40`,
            boxShadow: `0 -10px 40px rgba(0,0,0,0.5), inset 0 1px 0 ${accentColor}20`,
          }}
        >
          {/* Title (optional, shown if no speaker) */}
          {!node.vnSpeaker && node.title && (
            <h2 
              className="text-xl font-bold mb-3"
              style={{ 
                color: accentColor,
                fontFamily: style?.titleFontFamily || style?.fontFamily,
              }}
            >
              {node.title}
            </h2>
          )}

          {/* Dialogue Text */}
          <p 
            className="text-lg leading-relaxed min-h-[4rem] cursor-pointer"
            style={{ 
              color: textColor,
              fontFamily: style?.fontFamily || 'sans-serif',
              fontSize: style?.textFontSize || '1.125rem',
            }}
          >
            {displayedText}
            {isTyping && (
              <span className="inline-block w-2 h-5 ml-1 bg-current animate-pulse" />
            )}
          </p>

          {/* Click to continue indicator */}
          {!isTyping && node.connections.length === 0 && (
            <div className="text-center mt-4 text-sm opacity-60" style={{ color: textColor }}>
              Click to continue...
            </div>
          )}

          {/* Choices */}
          {!isTyping && node.connections.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              {node.connections.map(conn => (
                <button
                  key={conn.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChoice(conn.targetNodeId);
                  }}
                  className="group flex items-center justify-between p-4 rounded-lg transition-all text-left hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)`,
                    border: `1px solid ${accentColor}40`,
                    color: textColor,
                  }}
                >
                  <span className="font-medium">{conn.label}</span>
                  <ArrowRight 
                    className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
                    size={18} 
                    style={{ color: accentColor }}
                  />
                </button>
              ))}
            </div>
          )}

          {/* End of story */}
          {!isTyping && node.connections.length === 0 && (
            <div className="mt-6 text-center">
              <p className="italic opacity-60 mb-4" style={{ color: textColor }}>~ The End ~</p>
              <button
                onClick={onExit}
                className="px-6 py-2 rounded-lg transition-all hover:scale-105"
                style={{
                  background: `${accentColor}30`,
                  border: `1px solid ${accentColor}50`,
                  color: accentColor,
                }}
              >
                Return to Editor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Game Container (if node has interaction code) */}
      {node.interactionCode && (
        <div
          id={`game-container-${node.id}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 min-w-[300px] min-h-[200px] bg-black/80 backdrop-blur-md rounded-xl border border-white/20 p-6"
        />
      )}
    </div>
  );
};

export default VisualNovelPlayer;
