import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlowProvider, Node, Edge, Connection, MarkerType, NodeChange, EdgeChange } from 'reactflow';
import EditorGraph from './components/EditorGraph';
import NodeInspector from './components/NodeInspector';
import StoryChat, { StoryUpdateResult } from './components/StoryChat';
import VersionHistory from './components/VersionHistory';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import Logo from './components/Logo';
import BookLayout from './components/BookLayout';
import StyleEditor from './components/StyleEditor';
import VisualNovelPlayer from './components/VisualNovelPlayer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StoryNode, ViewMode, WorldSettings, SavedStory, StoryStyle, ChatMessage, StoryVersion, CharacterReference } from './types';
import * as GeminiService from './services/geminiService';
import * as DatabaseService from './services/databaseService';
import { storiesAPI } from './services/apiService';
import { getGoogleFontsUrl, getAllFonts } from './utils/stylePresets';
import { detectLanguage } from './utils/languageDetection';
import { Play, PenTool, Sparkles, Loader2, ArrowRight, BookOpen, PlusCircle, Trash2, Home, Save, Coins, Sword, Backpack, Palette, X, Code, History, LogOut, Settings, Menu } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

// Simple execution environment for the generated code
const executeInteraction = (code: string, gameState: any, log: (msg: string) => void, container?: HTMLElement) => {
    try {
        // Sanitize code: replace common mistakes
        let sanitizedCode = code;
        // Replace 'State.' with 'gameState.' (case-sensitive)
        sanitizedCode = sanitizedCode.replace(/\bState\./g, 'gameState.');
        // Replace standalone 'State' with 'gameState'
        sanitizedCode = sanitizedCode.replace(/\bState\b/g, 'gameState');

        // Helper function to render interactive games
        const renderGame = (html: string) => {
            if (container) {
                container.innerHTML = html;
                return container;
            }
            return null;
        };

        // eslint-disable-next-line no-new-func
        const func = new Function('gameState', 'log', 'renderGame', 'container', sanitizedCode);
        func(gameState, log, renderGame, container);
    } catch (e) {
        console.error("Interaction Error:", e);
        log(`[Error] ${e}`);
    }
};


const AppContent: React.FC = () => {
    const { user, logout, isLoading: authLoading, isOnline } = useAuth();

    const [nodes, setNodes] = useState<StoryNode[]>([]); // Our internal StoryNode[]
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [prompt, setPrompt] = useState(""); // Master prompt for the story
    const [isGeneratingSkeleton, setIsGeneratingSkeleton] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('LANDING'); // Start at landing page
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // Master prompt chat state
    const [promptChatHistory, setPromptChatHistory] = useState<ChatMessage[]>([]);

    // Story persistence
    const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
    const [currentStoryId, setCurrentStoryId] = useState<string | null>(null); // ID of the story being edited
    const [storyName, setStoryName] = useState("Untitled Story");

    // World System Settings
    const [worldSettings, setWorldSettings] = useState<WorldSettings>({
        useInventory: false,
        useEconomy: false,
        useCombat: false
    });

    // Style State
    const [currentStyle, setCurrentStyle] = useState<StoryStyle | undefined>(undefined);
    const [isGeneratingStyle, setIsGeneratingStyle] = useState(false);
    const [showStylePrompt, setShowStylePrompt] = useState(false);
    const [stylePrompt, setStylePrompt] = useState("");

    // Character References for consistent image generation
    const [characters, setCharacters] = useState<CharacterReference[]>([]);

    // Language State
    const [storyLanguage, setStoryLanguage] = useState<string>('en');

    // Player State
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
    const [gameState, setGameState] = useState<any>({});
    const [gameLog, setGameLog] = useState<string[]>([]);

    // Code Editor Panel State
    const [showCodeEditor, setShowCodeEditor] = useState(false);
    const [codeEditorMode, setCodeEditorMode] = useState<'global-css' | 'node-code'>('global-css');
    const [editingGlobalCss, setEditingGlobalCss] = useState("");
    const [editingNodeCode, setEditingNodeCode] = useState("");

    // WYSIWYG Style Editor State
    const [showStyleEditor, setShowStyleEditor] = useState(false);
    const [previewBackground, setPreviewBackground] = useState("#0a0a0a");
    const [previewTextColor, setPreviewTextColor] = useState("#f5f5f5");
    const [previewAccentColor, setPreviewAccentColor] = useState("#60a5fa");
    const [previewFontFamily, setPreviewFontFamily] = useState("Inter, sans-serif");
    // Advanced typography
    const [previewTitleSize, setPreviewTitleSize] = useState("2.25rem");
    const [previewTextSize, setPreviewTextSize] = useState("1.125rem");
    const [previewTitleWeight, setPreviewTitleWeight] = useState("700");
    const [previewTextWeight, setPreviewTextWeight] = useState("400");
    const [previewItalic, setPreviewItalic] = useState(false);
    const [previewUnderline, setPreviewUnderline] = useState(false);
    const [previewSecondaryColor, setPreviewSecondaryColor] = useState("#a3a3a3");

    // Version History State
    const [storyVersions, setStoryVersions] = useState<StoryVersion[]>([]);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [lastSavedState, setLastSavedState] = useState<string>('');
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pendingActionRef = useRef<string>('');

    // --- Effects ---

    // Load saved stories from database on mount (when user is available)
    useEffect(() => {
        if (!user) return;

        const loadStories = async () => {
            try {
                if (isOnline) {
                    // Load from remote API
                    const remoteStories = await storiesAPI.getAll();
                    // Convert API format to SavedStory format
                    const stories: SavedStory[] = await Promise.all(
                        remoteStories.map(async (s) => {
                            const fullStory = await storiesAPI.getById(s.id);
                            return {
                                id: fullStory.id,
                                userId: user.id,
                                name: fullStory.name,
                                masterPrompt: fullStory.prompt,
                                nodes: fullStory.nodes as unknown as StoryNode[],
                                worldSettings: fullStory.worldSettings as WorldSettings,
                                createdAt: new Date(fullStory.createdAt).getTime(),
                                style: fullStory.style as unknown as StoryStyle,
                                characters: fullStory.characters as unknown as CharacterReference[],
                                versions: fullStory.versions?.map(v => ({
                                    ...v,
                                    timestamp: new Date(v.timestamp).getTime(),
                                    action: v.description || 'Version saved'
                                })) as StoryVersion[]
                            };
                        })
                    );
                    setSavedStories(stories);
                } else {
                    // Fallback to local IndexedDB
                    const loaded = await DatabaseService.loadUserStories(user.id);
                    setSavedStories(loaded);
                }
            } catch (err) {
                console.error('Failed to load stories:', err);
                // Fallback to local on error
                try {
                    const loaded = await DatabaseService.loadUserStories(user.id);
                    setSavedStories(loaded);
                } catch (localErr) {
                    console.error('Local fallback also failed:', localErr);
                }
            }
        };

        loadStories();
    }, [user, isOnline]);

    // Save stories to database whenever they change
    useEffect(() => {
        if (!user) return;

        const saveStories = async () => {
            for (const story of savedStories) {
                try {
                    if (isOnline) {
                        // Check if story exists on server
                        try {
                            await storiesAPI.getById(story.id);
                            // Update existing story
                            await storiesAPI.update(story.id, {
                                name: story.name,
                                prompt: story.masterPrompt,
                                nodes: story.nodes as any,
                                worldSettings: story.worldSettings as any,
                                style: story.style as any,
                                characters: story.characters as any,
                                versions: story.versions?.map(v => ({
                                    ...v,
                                    timestamp: new Date(v.timestamp),
                                    description: v.action
                                })) as any
                            });
                        } catch {
                            // Story doesn't exist, create it
                            await storiesAPI.create({
                                name: story.name,
                                prompt: story.masterPrompt,
                                nodes: story.nodes as any,
                                worldSettings: story.worldSettings as any,
                                style: story.style as any,
                                characters: story.characters as any
                            });
                        }
                    }
                    // Always save locally as backup
                    await DatabaseService.saveStory(story);
                } catch (err) {
                    console.error('Failed to save story:', err);
                }
            }
        };

        // Debounce saves to avoid too many API calls
        const timeoutId = setTimeout(saveStories, 2000);
        return () => clearTimeout(timeoutId);
    }, [savedStories, user, isOnline]);

    // Auto-save story name when it changes
    useEffect(() => {
        if (currentStoryId && storyName) {
            setSavedStories(prev => prev.map(story =>
                story.id === currentStoryId
                    ? { ...story, name: storyName }
                    : story
            ));
        }
    }, [storyName, currentStoryId]);

    // Detect language when prompt changes
    useEffect(() => {
        if (prompt.trim()) {
            const detected = detectLanguage(prompt);
            setStoryLanguage(detected);
        }
    }, [prompt]);

    // --- Version Control Functions ---

    // Create a new version snapshot
    const createVersion = useCallback((action: string) => {
        if (nodes.length === 0 && !prompt.trim()) return;

        const currentState = JSON.stringify({ nodes, prompt });

        // Don't create duplicate versions for the same state
        if (currentState === lastSavedState) return;

        const newVersion: StoryVersion = {
            id: `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            action: action,
            nodes: JSON.parse(JSON.stringify(nodes)), // Deep clone
            masterPrompt: prompt
        };

        setStoryVersions(prev => {
            // Keep max 50 versions
            const updated = [...prev, newVersion].slice(-50);
            return updated;
        });

        setLastSavedState(currentState);

        // Auto-create story if it doesn't exist yet
        if (!currentStoryId && nodes.length > 0 && user) {
            const newStoryId = crypto.randomUUID();
            setCurrentStoryId(newStoryId);

            const existingStoryNames = savedStories.map(s => s.name);
            const newStoryName = DatabaseService.getNewStoryName(existingStoryNames);
            setStoryName(newStoryName);

            const newStory: SavedStory = {
                id: newStoryId,
                userId: user.id,
                name: newStoryName,
                masterPrompt: prompt,
                nodes: nodes,
                worldSettings: worldSettings,
                style: currentStyle,
                createdAt: Date.now(),
                versions: [newVersion],
                lastAutoSave: Date.now()
            };

            setSavedStories(prev => [...prev, newStory]);
        } else if (currentStoryId) {
            // Update existing story
            setSavedStories(prev => prev.map(story =>
                story.id === currentStoryId
                    ? {
                        ...story,
                        nodes: nodes,
                        masterPrompt: prompt,
                        worldSettings: worldSettings,
                        style: currentStyle,
                        versions: [...(story.versions || []), newVersion].slice(-50),
                        lastAutoSave: Date.now()
                    }
                    : story
            ));
        }
    }, [nodes, prompt, lastSavedState, currentStoryId, savedStories, worldSettings, currentStyle]);

    // Auto-save with debouncing - triggers on any node/prompt change
    useEffect(() => {
        if (viewMode !== 'EDITOR' || nodes.length === 0) return;

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Set new timeout for auto-save
        autoSaveTimeoutRef.current = setTimeout(() => {
            const action = pendingActionRef.current || 'Auto-saved changes';
            createVersion(action);
            pendingActionRef.current = '';
        }, 2000); // 2 second debounce

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [nodes, prompt, viewMode, createVersion]);

    // Restore a version
    const restoreVersion = useCallback((version: StoryVersion) => {
        setNodes(JSON.parse(JSON.stringify(version.nodes)));
        setPrompt(version.masterPrompt);
        setShowVersionHistory(false);

        // Create a new version marking the restore
        setTimeout(() => {
            createVersion(`Restored to version from ${new Date(version.timestamp).toLocaleString()}`);
        }, 100);
    }, [createVersion]);

    // Track pending action for version description
    const trackAction = useCallback((action: string) => {
        pendingActionRef.current = action;
    }, []);

    // --- Editor Handlers ---

    const handleSkeletonGeneration = async () => {
        if (!prompt.trim()) return;
        setIsGeneratingSkeleton(true);
        try {
            const skeleton = await GeminiService.generateStorySkeleton(prompt, worldSettings, storyLanguage);
            setNodes(skeleton);
            setSelectedNodeId(null);
            if (!currentStoryId) { // Assign a new ID if it's a new story
                setCurrentStoryId(crypto.randomUUID());
            }
            setIsGeneratingSkeleton(false);
            trackAction(`Generated story skeleton with ${skeleton.length} nodes`);
        } catch (e) {
            console.error(e);
            alert("Failed to generate story skeleton");
            setIsGeneratingSkeleton(false);
        }
    };

    const handleStyleGeneration = async () => {
        if (!stylePrompt.trim()) return;
        setIsGeneratingStyle(true);
        try {
            const style = await GeminiService.generateStoryStyle(stylePrompt);
            setCurrentStyle(style);
            // Sync CSS to code editor
            if (style.customCss) {
                setEditingGlobalCss(style.customCss);
            }
            setShowStylePrompt(false);
            trackAction(`Generated style: "${stylePrompt}"`);
        } catch (e) {
            console.error(e);
            alert("Failed to generate style");
        }
        setIsGeneratingStyle(false);
    };

    // Auto-save when style changes
    useEffect(() => {
        if (viewMode !== 'EDITOR' || !currentStoryId || !currentStyle) return;

        setSavedStories(prev => prev.map(story =>
            story.id === currentStoryId
                ? { ...story, style: currentStyle }
                : story
        ));
    }, [currentStyle, currentStoryId, viewMode]);

    // Derived ReactFlow nodes and edges from our internal StoryNode[]
    const reactFlowNodes: Node[] = React.useMemo(() => {
        return nodes.map(sn => ({
            id: sn.id,
            data: { label: sn.title },
            position: sn.position
        }));
    }, [nodes]);

    const reactFlowEdges: Edge[] = React.useMemo(() => {
        const uniqueEdgeIds = new Set<string>();
        const edges: Edge[] = [];

        nodes.forEach(sn => {
            sn.connections.forEach(conn => {
                const edgeId = `${sn.id}-${conn.targetNodeId}`;
                if (!uniqueEdgeIds.has(edgeId)) {
                    uniqueEdgeIds.add(edgeId);
                    edges.push({
                        id: edgeId,
                        source: sn.id,
                        target: conn.targetNodeId,
                        animated: true,
                        label: conn.label,
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
                        style: { stroke: '#60a5fa', strokeWidth: 2 },
                        labelStyle: { fill: '#d4d4d4', fontWeight: 500, fontSize: 11 },
                        labelBgStyle: { fill: '#171717', fillOpacity: 0.8, rx: 4, ry: 4 },
                        labelBgPadding: [4, 2]
                    });
                }
            });
        });
        return edges;
    }, [nodes]);

    // Memoize node titles for dependency tracking
    const nodeTitlesKey = React.useMemo(
        () => nodes.map(n => `${n.id}:${n.title}`).join(','),
        [nodes]
    );

    // Update connection labels when node titles change
    useEffect(() => {
        setNodes(prevNodes => {
            let hasChanged = false;
            const updatedNodes = prevNodes.map(node => {
                const updatedConnections = node.connections.map(conn => {
                    const targetNode = prevNodes.find(n => n.id === conn.targetNodeId);
                    const newLabel = targetNode?.title || "Next";
                    if (conn.label !== newLabel) {
                        hasChanged = true;
                        return { ...conn, label: newLabel };
                    }
                    return conn;
                });

                if (updatedConnections !== node.connections) {
                    return { ...node, connections: updatedConnections };
                }
                return node;
            });

            return hasChanged ? updatedNodes : prevNodes;
        });
    }, [nodeTitlesKey]);

    const handleNodeUpdate = useCallback((updatedNode: StoryNode) => {
        setNodes((prev) => {
            let hasChanged = false;
            let changeDescription = '';
            const newNodes = prev.map(n => {
                if (n.id === updatedNode.id) {
                    if (JSON.stringify(n) === JSON.stringify(updatedNode)) {
                        return n; // No semantic change, return original object
                    }
                    hasChanged = true;
                    // Determine what changed
                    if (n.title !== updatedNode.title) changeDescription = `Renamed node to "${updatedNode.title}"`;
                    else if (n.content !== updatedNode.content) changeDescription = `Edited content of "${updatedNode.title}"`;
                    else if (n.mediaUri !== updatedNode.mediaUri) changeDescription = `Updated media for "${updatedNode.title}"`;
                    else if (n.interactionCode !== updatedNode.interactionCode) changeDescription = `Modified code for "${updatedNode.title}"`;
                    else changeDescription = `Updated node "${updatedNode.title}"`;
                    return updatedNode; // Semantic change, return new object
                }
                return n;
            });
            if (hasChanged && changeDescription) {
                pendingActionRef.current = changeDescription;
            }
            return hasChanged ? newNodes : prev; // Return new array only if something actually changed
        });
    }, []);

    const handleConnect = useCallback((sourceId: string, targetId: string) => {
        setNodes(prevNodes => {
            const sourceNode = prevNodes.find(n => n.id === sourceId);
            const targetNode = prevNodes.find(n => n.id === targetId);

            return prevNodes.map(node => {
                if (node.id === sourceId) {
                    // Prevent duplicate connections
                    if (node.connections.some(c => c.targetNodeId === targetId)) {
                        return node; // Return original node object if no change
                    }

                    const newConnection = {
                        id: crypto.randomUUID(),
                        targetNodeId: targetId,
                        label: targetNode?.title || "Next"
                    };

                    pendingActionRef.current = `Connected "${sourceNode?.title}" → "${targetNode?.title}"`;

                    return {
                        ...node,
                        connections: [...node.connections, newConnection]
                    };
                }
                return node;
            });
        });
    }, []);

    // Handler for node position changes (called only on drag end)
    const handleNodePositionChange = useCallback((nodeId: string, position: { x: number; y: number }) => {
        setNodes(prevNodes => prevNodes.map(node =>
            node.id === nodeId ? { ...node, position } : node
        ));
    }, []);

    // Handler for node removal
    const handleNodeRemove = useCallback((nodeId: string) => {
        setNodes(prevNodes => {
            const nodeToRemove = prevNodes.find(n => n.id === nodeId);
            if (nodeToRemove) {
                pendingActionRef.current = `Removed node "${nodeToRemove.title}"`;
            }
            const remainingNodes = prevNodes.filter(node => node.id !== nodeId);
            // Also remove connections targeting this node
            return remainingNodes.map(node => ({
                ...node,
                connections: node.connections.filter(conn => conn.targetNodeId !== nodeId)
            }));
        });
    }, []);


    // Custom handler for ReactFlow's onEdgesChange
    const onReactFlowEdgesChange = useCallback((changes: EdgeChange[]) => {
        setNodes(prevNodes => {
            let updatedNodes = prevNodes; // Start with previous reference
            let hasChanged = false;

            for (const change of changes) {
                if (change.type === 'remove') {
                    const edgeIdToRemove = change.id;
                    // Assuming edgeId is `sourceId-targetId` (convention from handleConnect)
                    const [sourceId, targetId] = edgeIdToRemove.split('-');

                    if (sourceId && targetId) {
                        const sourceNodeIndex = updatedNodes.findIndex(node => node.id === sourceId);
                        if (sourceNodeIndex > -1) {
                            const originalConnections = updatedNodes[sourceNodeIndex].connections;
                            const filteredConnections = originalConnections.filter(conn => conn.targetNodeId !== targetId);

                            if (filteredConnections.length < originalConnections.length) { // Check if a connection was actually removed
                                updatedNodes = updatedNodes.map((node, i) =>
                                    i === sourceNodeIndex ? { ...node, connections: filteredConnections } : node
                                );
                                hasChanged = true;
                            }
                        }
                    }
                }
            }
            return hasChanged ? updatedNodes : prevNodes;
        });
    }, [setNodes]);

    const handleAddNode = () => {
        const newNode: StoryNode = {
            id: `node-${crypto.randomUUID()}`,
            title: "New Node",
            content: "Enter story content here...",
            connections: [],
            position: { x: 100 + nodes.length * 20, y: 100 + nodes.length * 20 },
            mediaType: 'image', // Default media type
        };
        setNodes(prev => [...prev, newNode]);
        setSelectedNodeId(newNode.id);
        trackAction('Added new node manually');
    };

    const handleDeleteNode = () => {
        if (!selectedNodeId) return;
        const nodeToDelete = nodes.find(n => n.id === selectedNodeId);
        if (!confirm("Are you sure you want to delete this node?")) return;

        setNodes(prev => {
            // Remove the node from our internal state
            const remainingNodes = prev.filter(n => n.id !== selectedNodeId);
            // Remove connections pointing TO this node from other nodes
            const updatedNodes = remainingNodes.map(n => ({
                ...n,
                connections: n.connections.filter(c => c.targetNodeId !== selectedNodeId)
            }));
            return updatedNodes;
        });
        setSelectedNodeId(null);
        trackAction(`Deleted node "${nodeToDelete?.title || 'Unknown'}"`);
    };

    const toggleSetting = (key: keyof WorldSettings) => {
        setWorldSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // --- Story Management (Save/Load/New) ---

    const saveCurrentStory = () => {
        if (!user) return;
        if (nodes.length === 0 || !prompt.trim()) {
            alert("Cannot save an empty or untitled story.");
            return;
        }

        const storyId = currentStoryId || crypto.randomUUID();
        const existingStoryNames = savedStories.map(s => s.name);
        let finalStoryName;

        if (currentStoryId) { // If it's an existing story, keep its name
            finalStoryName = savedStories.find(s => s.id === currentStoryId)?.name || DatabaseService.getNewStoryName(existingStoryNames);
        } else { // If it's a new story, generate a fresh name
            finalStoryName = DatabaseService.getNewStoryName(existingStoryNames);
        }

        const newStory: SavedStory = {
            id: storyId,
            userId: user.id,
            name: finalStoryName,
            masterPrompt: prompt,
            nodes: nodes,
            worldSettings: worldSettings,
            createdAt: currentStoryId ? (savedStories.find(s => s.id === currentStoryId)?.createdAt || Date.now()) : Date.now(),
            style: currentStyle,
            characters: characters // Save character references
        };

        setSavedStories(prev => {
            const existingIndex = prev.findIndex(s => s.id === storyId);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex] = newStory;
                return updated;
            } else {
                return [...prev, newStory];
            }
        });

        setCurrentStoryId(storyId);
        alert(`Story "${storyName}" saved!`);
    };

    const loadSelectedStory = (story: SavedStory) => {
        setNodes(story.nodes);
        setPrompt(story.masterPrompt);
        setWorldSettings(story.worldSettings);
        setCurrentStyle(story.style); // Load the style
        setCharacters(story.characters || []); // Load character references
        setCurrentStoryId(story.id);
        setStoryName(story.name); // Load story name
        setSelectedNodeId(null);
        setViewMode('EDITOR');

        // Load version history
        setStoryVersions(story.versions || []);
        setLastSavedState(JSON.stringify({ nodes: story.nodes, prompt: story.masterPrompt }));

        // Also initialize the code editor with the loaded style
        if (story.style?.customCss) {
            setEditingGlobalCss(story.style.customCss);
        }
    };

    const deleteSelectedStory = async (storyId: string) => {
        try {
            if (isOnline) {
                await storiesAPI.delete(storyId);
            }
            await DatabaseService.deleteStory(storyId);
            setSavedStories(prev => prev.filter(s => s.id !== storyId));
        } catch (err) {
            console.error('Failed to delete story:', err);
        }
    };

    const startNewStory = () => {
        setNodes([]);
        setPrompt("");
        setWorldSettings({ useInventory: false, useEconomy: false, useCombat: false });
        setCurrentStyle(undefined); // Reset style
        setCharacters([]); // Reset character references
        setCurrentStoryId(null);
        setSelectedNodeId(null);
        setStoryVersions([]); // Reset version history
        setLastSavedState('');
        setViewMode('EDITOR');
    };

    // Handle story updates from StoryChat
    const handleStoryUpdate = useCallback((result: StoryUpdateResult) => {
        setNodes(prevNodes => {
            let updatedNodes = [...prevNodes];

            // Handle node additions
            if (result.action === 'add_nodes' && result.nodesToAdd) {
                const newNodes: StoryNode[] = result.nodesToAdd.map(n => ({
                    id: n.id,
                    title: n.title,
                    content: n.content,
                    position: n.position,
                    connections: n.connections || [],
                    mediaType: n.mediaType || 'image'
                }));
                updatedNodes = [...updatedNodes, ...newNodes];
            }

            // Handle node modifications
            if (result.action === 'modify_nodes' && result.nodesToModify) {
                result.nodesToModify.forEach(mod => {
                    const index = updatedNodes.findIndex(n => n.id === mod.id);
                    if (index > -1) {
                        updatedNodes[index] = {
                            ...updatedNodes[index],
                            ...(mod.title && { title: mod.title }),
                            ...(mod.content && { content: mod.content })
                        };
                    }
                });
            }

            // Handle node deletions
            if (result.action === 'delete_nodes' && result.nodeIdsToDelete) {
                updatedNodes = updatedNodes.filter(n => !result.nodeIdsToDelete!.includes(n.id));
                // Also remove connections to deleted nodes
                updatedNodes = updatedNodes.map(n => ({
                    ...n,
                    connections: n.connections.filter(c => !result.nodeIdsToDelete!.includes(c.targetNodeId))
                }));
            }

            // Handle new connections (can be combined with other actions)
            if (result.newConnections) {
                result.newConnections.forEach(conn => {
                    const sourceIndex = updatedNodes.findIndex(n => n.id === conn.sourceId);
                    if (sourceIndex > -1) {
                        const existingConn = updatedNodes[sourceIndex].connections.find(
                            c => c.targetNodeId === conn.targetId
                        );
                        if (!existingConn) {
                            updatedNodes[sourceIndex] = {
                                ...updatedNodes[sourceIndex],
                                connections: [
                                    ...updatedNodes[sourceIndex].connections,
                                    {
                                        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                        targetNodeId: conn.targetId,
                                        label: conn.label
                                    }
                                ]
                            };
                        }
                    }
                });
            }

            return updatedNodes;
        });

        // Track the action from AI
        trackAction(result.message || `AI: ${result.action}`);
    }, [trackAction]);

    // --- Player Handlers ---

    const startPlayer = () => {
        if (nodes.length === 0) return;
        startPlayerFromNode(nodes[0].id);
    };

    // Start player from a specific node (used by play button on nodes)
    const startPlayerFromNode = useCallback((nodeId: string) => {
        const startNode = nodes.find(n => n.id === nodeId);
        if (!startNode) return;

        setGameState({});
        setGameLog([]);
        setCurrentNodeId(nodeId);
        setViewMode('PLAYER');

        // Execute interaction for the starting node if exists
        const initialGameState: any = {};
        if (startNode.interactionCode) {
            executeInteraction(startNode.interactionCode, initialGameState, (msg) => setGameLog(l => [...l, msg]));
        }
        setGameState(initialGameState);
    }, [nodes]);

    const handlePlayerChoice = (targetId: string) => {
        const nextNode = nodes.find(n => n.id === targetId);
        if (nextNode) {
            setCurrentNodeId(targetId);

            // Clear node-specific variables from gameState to allow fresh execution
            // Keep global variables like hp, gold, inventory
            setGameState(prevState => {
                const newState = { ...prevState };

                // Remove all keys that don't look like global game variables
                // Keep: hp, maxHp, gold, inventory
                const globalKeys = ['hp', 'maxHp', 'gold', 'inventory'];
                Object.keys(newState).forEach(key => {
                    if (!globalKeys.includes(key)) {
                        delete newState[key];
                    }
                });

                return newState;
            });
        }
    };

    // Execute interaction code when node changes
    useEffect(() => {
        if (currentNodeId && viewMode === 'PLAYER') {
            const node = nodes.find(n => n.id === currentNodeId);
            if (node?.interactionCode) {
                const container = document.getElementById(`game-container-${currentNodeId}`);
                const updatedGameState = { ...gameState };
                executeInteraction(
                    node.interactionCode,
                    updatedGameState,
                    (msg) => setGameLog(prev => [...prev, msg]),
                    container || undefined
                );
                setGameState(updatedGameState);
            }
        }
    }, [currentNodeId, viewMode]);

    // --- Render ---

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const currentNode = nodes.find(n => n.id === currentNodeId);

    return (
        <div className="h-screen w-screen flex bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
            
            {/* Mobile Sidebar */}
            {showMobileSidebar && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileSidebar(false)} />
                    <aside className="absolute left-0 top-0 h-full w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
                        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                            <Logo size="sm" />
                            <button onClick={() => setShowMobileSidebar(false)} className="p-1 text-neutral-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <nav className="flex-1 p-4 space-y-2">
                            <button
                                onClick={() => { setViewMode('LANDING'); setShowMobileSidebar(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'LANDING' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'}`}
                            >
                                <Home size={18} /> Home
                            </button>
                            <button
                                onClick={() => { setViewMode('EDITOR'); setShowMobileSidebar(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'EDITOR' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'}`}
                            >
                                <PenTool size={18} /> Editor
                            </button>
                            <button
                                onClick={() => { startPlayer(); setShowMobileSidebar(false); }}
                                disabled={nodes.length === 0}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 ${viewMode === 'PLAYER' ? 'bg-green-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'}`}
                            >
                                <Play size={18} /> Play
                            </button>
                            
                            {viewMode === 'EDITOR' && (
                                <>
                                    <div className="border-t border-neutral-800 my-3" />
                                    <button
                                        onClick={() => { 
                                            setShowStyleEditor(true);
                                            setShowMobileSidebar(false);
                                            // Initialize preview with current style
                                            if (currentStyle) {
                                                setPreviewBackground(currentStyle.background);
                                                setPreviewTextColor(currentStyle.textColor);
                                                setPreviewAccentColor(currentStyle.accentColor);
                                                setPreviewFontFamily(currentStyle.fontFamily);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentStyle ? 'bg-purple-900/50 text-purple-300' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'}`}
                                    >
                                        <Palette size={18} /> Style
                                    </button>
                                    <button
                                        onClick={() => { setShowVersionHistory(!showVersionHistory); setShowMobileSidebar(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                                    >
                                        <History size={18} /> History
                                    </button>
                                </>
                            )}
                        </nav>
                        
                        <div className="p-4 border-t border-neutral-800">
                            <div className="text-xs text-neutral-500 mb-2 truncate">{user?.email}</div>
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                            >
                                <LogOut size={16} /> Sign Out
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main Layout */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 bg-neutral-900 border-b border-neutral-800 flex items-center px-3 lg:px-6 justify-between shrink-0 z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile menu button */}
                        <button 
                            onClick={() => setShowMobileSidebar(true)}
                            className="lg:hidden p-1.5 text-neutral-400 hover:text-white"
                        >
                            <Menu size={20} />
                        </button>
                        
                        <Logo size="sm" showText={false} className="hidden lg:flex" />
                        
                        {viewMode === 'EDITOR' && (
                            <input
                                type="text"
                                value={storyName}
                                onChange={(e) => setStoryName(e.target.value)}
                                className="bg-neutral-800 border border-neutral-700 rounded px-2 lg:px-3 py-1 lg:py-1.5 text-white text-xs lg:text-sm font-medium focus:outline-none focus:border-blue-500 w-28 sm:w-40 lg:w-64"
                                placeholder="Story Name"
                            />
                        )}
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-4">
                        {viewMode === 'EDITOR' && (
                            <>
                                <div className="flex items-center gap-2 mr-2">
                                    <button
                                        onClick={() => {
                                            setShowStyleEditor(true);
                                            // Initialize preview with current style
                                            if (currentStyle) {
                                                setPreviewBackground(currentStyle.background);
                                                setPreviewTextColor(currentStyle.textColor);
                                                setPreviewAccentColor(currentStyle.accentColor);
                                                setPreviewFontFamily(currentStyle.fontFamily);
                                            }
                                        }}
                                        className={`p-1.5 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider border transition-all ${currentStyle ? 'bg-purple-900 border-purple-600 text-purple-200' : 'bg-neutral-800 border-neutral-700 text-neutral-500'}`}
                                        title="Open Style Editor"
                                    >
                                        <Palette size={14} /> Style
                                    </button>
                            </div>

                        </>
                    )}

                    {/* Master Prompt - Centered in navbar */}
                    {viewMode === 'EDITOR' && (
                        <div className="flex-1 flex justify-center px-4">
                            <div className="w-full max-w-xl">
                                <StoryChat
                                    masterPrompt={prompt}
                                    nodes={nodes}
                                    worldSettings={worldSettings}
                                    chatHistory={promptChatHistory}
                                    onChatHistoryUpdate={setPromptChatHistory}
                                    onStoryUpdate={handleStoryUpdate}
                                    onPromptUpdate={setPrompt}
                                    onGenerateSkeleton={handleSkeletonGeneration}
                                    isGenerating={isGeneratingSkeleton}
                                />
                            </div>
                        </div>
                    )}

                    <div className="h-6 w-px bg-neutral-700 mx-2"></div>

                    {viewMode === 'EDITOR' && (
                        <div className="flex items-center gap-2 mr-2">
                            <button
                                onClick={handleAddNode}
                                className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700"
                                title="Add New Node"
                            >
                                <PlusCircle size={18} />
                            </button>
                            {selectedNodeId && (
                                <button
                                    onClick={handleDeleteNode}
                                    className="p-1.5 rounded bg-red-900/50 hover:bg-red-900 text-red-300 border border-red-800 animate-in fade-in zoom-in duration-200"
                                    title="Delete Selected Node"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <button
                                onClick={saveCurrentStory}
                                className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-green-400 border border-neutral-700"
                                title="Save Current Story"
                            >
                                <Save size={18} />
                            </button>
                            <button
                                onClick={() => setShowVersionHistory(true)}
                                className={`p-1.5 rounded border relative ${storyVersions.length > 0 ? 'bg-indigo-900/50 border-indigo-600 text-indigo-300' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'}`}
                                title="Version History"
                            >
                                <History size={18} />
                                {storyVersions.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                                        {storyVersions.length > 9 ? '9+' : storyVersions.length}
                                    </span>
                                )}
                            </button>
                            {/* Code Editor button hidden - JS game generation not working
                            <button
                                onClick={() => setShowCodeEditor(!showCodeEditor)}
                                className={`p-1.5 rounded border ${showCodeEditor ? 'bg-blue-900 border-blue-600 text-blue-200' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'}`}
                                title="Toggle Code Editor"
                            >
                                <Code size={18} />
                            </button>
                            */}
                        </div>
                    )}

                    {/* Desktop Navigation */}
                    <div className="flex bg-neutral-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('LANDING')}
                            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'LANDING' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
                        >
                            <Home size={14} /> Home
                        </button>
                        <button
                            onClick={() => setViewMode('EDITOR')}
                            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'EDITOR' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
                        >
                            <PenTool size={14} /> Editor
                        </button>
                        <button
                            onClick={startPlayer}
                            disabled={nodes.length === 0}
                            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'PLAYER' ? 'bg-green-600 text-white shadow-sm' : 'text-neutral-400 hover:text-neutral-200 disabled:opacity-30'}`}
                        >
                            <Play size={14} /> Play
                        </button>
                    </div>

                    {/* User menu */}
                    <div className="flex items-center gap-3 ml-4 pl-4 border-l border-neutral-700">
                        <span className="text-neutral-500 text-xs">{user?.email}</span>
                        <button
                            onClick={logout}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden relative">
                {viewMode === 'LANDING' ? (
                    <LandingPage
                        savedStories={savedStories}
                        onLoadStory={loadSelectedStory}
                        onDeleteStory={deleteSelectedStory}
                        onNewStory={startNewStory}
                    />
                ) : viewMode === 'EDITOR' ? (
                    <ReactFlowProvider>
                        <div className="flex-1 h-full relative">
                            {nodes.length === 0 && !isGeneratingSkeleton && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 z-10 p-4 text-center">
                                    <BookOpen size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm">Enter a story prompt above and generate your story skeleton.</p>
                                </div>
                            )}
                            <EditorGraph
                                reactFlowNodes={reactFlowNodes}
                                reactFlowEdges={reactFlowEdges}
                                selectedNodeId={selectedNodeId}
                                onNodePositionChange={handleNodePositionChange}
                                onNodeRemove={handleNodeRemove}
                                onEdgesChange={onReactFlowEdgesChange}
                                onNodeSelect={setSelectedNodeId}
                                onConnectParent={handleConnect}
                                onPlayFromNode={startPlayerFromNode}
                            />
                        </div>
                        {selectedNode && (
                            <div className="fixed inset-0 z-40 md:relative md:inset-auto">
                                {/* Mobile overlay backdrop */}
                                <div 
                                    className="absolute inset-0 bg-black/50 md:hidden"
                                    onClick={() => setSelectedNodeId(null)}
                                />
                                {/* Inspector panel */}
                                <div className="absolute right-0 top-0 h-full w-full max-w-md md:relative md:max-w-none">
                                    <NodeInspector
                                        node={selectedNode}
                                        worldSettings={worldSettings}
                                        storyNodes={nodes}
                                        masterPrompt={prompt}
                                        storyLanguage={storyLanguage}
                                        currentStyle={currentStyle}
                                        characters={characters}
                                        onCharactersChange={setCharacters}
                                        onUpdate={handleNodeUpdate}
                                        onClose={() => setSelectedNodeId(null)}
                                    />
                                </div>
                            </div>
                        )}
                    </ReactFlowProvider>
                ) : (
                    <div
                        className={`w-full h-full flex justify-center overflow-y-auto ${currentStyle?.animationClass || ''}`}
                        style={{
                            background: currentStyle?.background || '#0a0a0a',
                            fontFamily: currentStyle?.fontFamily || 'sans-serif',
                        }}
                    >
                        {currentStyle?.customCss && <style>{currentStyle.customCss}</style>}
                        {currentNode ? (
                            <>
                                {/* Visual Novel Layout Mode - Full screen, no header needed */}
                                {currentStyle?.layoutMode === 'visual-novel' ? (
                                    <VisualNovelPlayer
                                        node={currentNode}
                                        style={currentStyle}
                                        onChoice={handlePlayerChoice}
                                        onExit={() => setViewMode('EDITOR')}
                                        gameState={gameState}
                                        gameLog={gameLog}
                                    />
                                ) : (
                                <>
                                {/* Player Stats Header - Always visible (except VN mode) */}
                                {(worldSettings.useCombat || worldSettings.useEconomy || worldSettings.useInventory) && (
                                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 flex flex-wrap gap-4 p-3 bg-neutral-900/90 backdrop-blur-sm rounded-lg border border-neutral-800 text-sm shadow-lg">
                                        {worldSettings.useCombat && (
                                            <div className="flex items-center gap-2 text-red-400 font-mono">
                                                <Sword size={16} />
                                                <span>HP: {gameState.hp ?? '?'} / {gameState.maxHp ?? '?'}</span>
                                            </div>
                                        )}
                                        {worldSettings.useEconomy && (
                                            <div className="flex items-center gap-2 text-yellow-400 font-mono">
                                                <Coins size={16} />
                                                <span>Gold: {gameState.gold ?? 0}</span>
                                            </div>
                                        )}
                                        {worldSettings.useInventory && (
                                            <div className="flex items-center gap-2 text-blue-400 font-mono">
                                                <Backpack size={16} />
                                                <span>Items: {gameState.inventory?.join(', ') || 'Empty'}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Book Layout Mode */}
                                {currentStyle?.layoutMode === 'book' ? (
                                    <BookLayout
                                        style={currentStyle}
                                        imageUrl={currentNode.mediaType === 'image' ? currentNode.mediaUri : undefined}
                                        title={currentNode.title}
                                        content={currentNode.content}
                                    >
                                        {/* Interactive Game Container */}
                                        {currentNode.interactionCode && (
                                            <div
                                                id={`game-container-${currentNode.id}`}
                                                className="w-full min-h-[100px] bg-neutral-900/30 rounded-lg border border-neutral-700/50 p-4"
                                            ></div>
                                        )}

                                        {gameLog.length > 0 && (
                                            <div className="bg-amber-900/20 border-l-4 border-amber-600 p-3 rounded text-sm font-mono" style={{ color: currentStyle?.textColor }}>
                                                {gameLog.map((log, i) => <div key={i}>&gt; {log}</div>)}
                                            </div>
                                        )}

                                        {/* Choices */}
                                        {currentNode.connections.map(conn => (
                                            <button
                                                key={conn.id}
                                                onClick={() => handlePlayerChoice(conn.targetNodeId)}
                                                className="w-full group flex items-center justify-between p-4 rounded-lg transition-all text-left hover:scale-[1.02]"
                                                style={{
                                                    background: `${currentStyle?.accentColor}15`,
                                                    border: `2px solid ${currentStyle?.accentColor}40`,
                                                    color: currentStyle?.textColor
                                                }}
                                            >
                                                <span className="font-medium">{conn.label}</span>
                                                <ArrowRight className="opacity-50 group-hover:translate-x-1 transition-transform" size={18} />
                                            </button>
                                        ))}
                                        {currentNode.connections.length === 0 && (
                                            <div className="text-center py-8 italic opacity-60">
                                                ~ The End ~
                                                <br />
                                                <button onClick={() => setViewMode('EDITOR')} className="mt-4 underline not-italic text-sm" style={{ color: currentStyle?.accentColor }}>
                                                    Return to Editor
                                                </button>
                                            </div>
                                        )}
                                    </BookLayout>
                                ) : (
                                    /* Standard Layout Mode */
                                    <div
                                        className="w-full max-w-3xl p-8 space-y-8 animate-in fade-in duration-500 pb-20"
                                        style={{
                                            color: currentStyle?.textColor || '#f5f5f5'
                                        }}
                                    >
                                        {currentNode.mediaUri && (
                                            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-neutral-800">
                                                {currentNode.mediaType === 'image' ? (
                                                    <img src={currentNode.mediaUri} alt={currentNode.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <video src={currentNode.mediaUri} controls autoPlay muted loop className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <h2
                                                className="text-4xl font-bold"
                                                style={{
                                                    color: currentStyle?.accentColor || '#60a5fa',
                                                    fontFamily: currentStyle?.titleFontFamily || currentStyle?.fontFamily,
                                                    fontSize: currentStyle?.titleFontSize || '2.5rem'
                                                }}
                                            >
                                                {currentNode.title}
                                            </h2>
                                            <p
                                                className="leading-relaxed whitespace-pre-line"
                                                style={{ fontSize: currentStyle?.textFontSize || '1.125rem' }}
                                            >
                                                {currentNode.content}
                                            </p>
                                        </div>

                                        {/* Interactive Game Container */}
                                        {currentNode.interactionCode && (
                                            <div
                                                id={`game-container-${currentNode.id}`}
                                                className="w-full min-h-[300px] bg-neutral-900/50 rounded-lg border border-neutral-700 p-4"
                                            ></div>
                                        )}

                                        {gameLog.length > 0 && (
                                            <div className="bg-neutral-900 border-l-4 border-yellow-500 p-4 rounded text-sm text-yellow-100 font-mono">
                                                {gameLog.map((log, i) => <div key={i}>&gt; {log}</div>)}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
                                            {currentNode.connections.map(conn => (
                                                <button
                                                    key={conn.id}
                                                    onClick={() => handlePlayerChoice(conn.targetNodeId)}
                                                    className="group flex items-center justify-between p-4 rounded-lg transition-all text-left"
                                                    style={{
                                                        background: `${currentStyle?.accentColor || '#3b82f6'}20`,
                                                        border: `1px solid ${currentStyle?.accentColor || '#3b82f6'}50`,
                                                    }}
                                                >
                                                    <span className="font-medium" style={{ color: currentStyle?.textColor }}>{conn.label}</span>
                                                    <ArrowRight className="opacity-50 group-hover:translate-x-1 transition-transform" size={18} style={{ color: currentStyle?.accentColor }} />
                                                </button>
                                            ))}
                                            {currentNode.connections.length === 0 && (
                                                <div className="col-span-full text-center py-12 italic" style={{ color: currentStyle?.textColor, opacity: 0.6 }}>
                                                    The End.
                                                    <br />
                                                    <button onClick={() => setViewMode('EDITOR')} className="mt-4 hover:underline not-italic text-sm" style={{ color: currentStyle?.accentColor }}>Return to Editor</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                </>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-neutral-500">
                                Loading Story...
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Code Editor Panel - Hidden: JS game generation not working
            {showCodeEditor && viewMode === 'EDITOR' && (
                <div className="fixed right-0 top-16 bottom-0 w-96 bg-neutral-900 border-l border-neutral-700 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
                    ...
                </div>
            )}
            */}

            {/* Advanced Style Editor */}
            {showStyleEditor && viewMode === 'EDITOR' && (
                <StyleEditor
                    style={currentStyle}
                    onStyleChange={(newStyle) => {
                        setCurrentStyle(newStyle);
                        trackAction('Updated style from editor');
                    }}
                    onClose={() => setShowStyleEditor(false)}
                    onGenerateStyle={async (prompt) => {
                        setIsGeneratingStyle(true);
                        try {
                            const style = await GeminiService.generateStoryStyle(prompt);
                            setCurrentStyle(style);
                            trackAction(`Generated style: "${prompt}"`);
                        } catch (e) {
                            console.error(e);
                            alert("Failed to generate style");
                        } finally {
                            setIsGeneratingStyle(false);
                        }
                    }}
                    isGenerating={isGeneratingStyle}
                />
            )}

            {/* Legacy WYSIWYG Style Editor - keeping for reference but hidden */}
            {false && showStyleEditor && viewMode === 'EDITOR' && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-neutral-100">Visual Style Editor</h2>
                            <button onClick={() => setShowStyleEditor(false)} className="p-2 hover:bg-neutral-800 rounded">
                                <X size={20} className="text-neutral-400" />
                            </button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-80 border-r border-neutral-700 p-4 overflow-y-auto space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">Background</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={previewBackground}
                                            onChange={(e) => setPreviewBackground(e.target.value)}
                                            className="w-12 h-10 rounded border border-neutral-700 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={previewBackground}
                                            onChange={(e) => setPreviewBackground(e.target.value)}
                                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white"
                                            placeholder="#0a0a0a"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">Text Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={previewTextColor}
                                            onChange={(e) => setPreviewTextColor(e.target.value)}
                                            className="w-12 h-10 rounded border border-neutral-700 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={previewTextColor}
                                            onChange={(e) => setPreviewTextColor(e.target.value)}
                                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white"
                                            placeholder="#f5f5f5"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">Accent Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={previewAccentColor}
                                            onChange={(e) => setPreviewAccentColor(e.target.value)}
                                            className="w-12 h-10 rounded border border-neutral-700 cursor-pointer"
                                        />
                                        <input
                                            type="text"
                                            value={previewAccentColor}
                                            onChange={(e) => setPreviewAccentColor(e.target.value)}
                                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white"
                                            placeholder="#60a5fa"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-2">Font Family</label>
                                    <select
                                        value={previewFontFamily}
                                        onChange={(e) => setPreviewFontFamily(e.target.value)}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-sm text-white"
                                    >
                                        <option value="Inter, sans-serif">Inter</option>
                                        <option value="'Roboto', sans-serif">Roboto</option>
                                        <option value="'Playfair Display', serif">Playfair Display</option>
                                        <option value="'Courier New', monospace">Courier New</option>
                                        <option value="Georgia, serif">Georgia</option>
                                        <option value="'Fira Code', monospace">Fira Code (Ligatures)</option>
                                        <option value="'JetBrains Mono', monospace">JetBrains Mono (Ligatures)</option>
                                    </select>
                                </div>

                                <div className="border-t border-neutral-700 pt-4">
                                    <h4 className="text-sm font-bold text-neutral-200 mb-3">Typography</h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-neutral-400 mb-1">Title Size</label>
                                            <input
                                                type="text"
                                                value={previewTitleSize}
                                                onChange={(e) => setPreviewTitleSize(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white"
                                                placeholder="2.25rem"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-neutral-400 mb-1">Text Size</label>
                                            <input
                                                type="text"
                                                value={previewTextSize}
                                                onChange={(e) => setPreviewTextSize(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white"
                                                placeholder="1.125rem"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <div>
                                            <label className="block text-xs text-neutral-400 mb-1">Title Weight</label>
                                            <select
                                                value={previewTitleWeight}
                                                onChange={(e) => setPreviewTitleWeight(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white"
                                            >
                                                <option value="300">Light (300)</option>
                                                <option value="400">Normal (400)</option>
                                                <option value="500">Medium (500)</option>
                                                <option value="600">Semibold (600)</option>
                                                <option value="700">Bold (700)</option>
                                                <option value="800">Extra Bold (800)</option>
                                                <option value="900">Black (900)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-neutral-400 mb-1">Text Weight</label>
                                            <select
                                                value={previewTextWeight}
                                                onChange={(e) => setPreviewTextWeight(e.target.value)}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white"
                                            >
                                                <option value="300">Light (300)</option>
                                                <option value="400">Normal (400)</option>
                                                <option value="500">Medium (500)</option>
                                                <option value="600">Semibold (600)</option>
                                                <option value="700">Bold (700)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="block text-xs text-neutral-400 mb-2">Text Style</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPreviewTextWeight(previewTextWeight === "700" ? "400" : "700")}
                                                className={`flex-1 px-3 py-2 rounded border font-bold ${previewTextWeight === "700" ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}
                                            >
                                                B
                                            </button>
                                            <button
                                                onClick={() => setPreviewItalic(!previewItalic)}
                                                className={`flex-1 px-3 py-2 rounded border italic ${previewItalic ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}
                                            >
                                                I
                                            </button>
                                            <button
                                                onClick={() => setPreviewUnderline(!previewUnderline)}
                                                className={`flex-1 px-3 py-2 rounded border underline ${previewUnderline ? 'bg-blue-600 border-blue-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}
                                            >
                                                U
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <label className="block text-xs text-neutral-400 mb-1">Secondary Text Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={previewSecondaryColor}
                                                onChange={(e) => setPreviewSecondaryColor(e.target.value)}
                                                className="w-12 h-10 rounded border border-neutral-700 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={previewSecondaryColor}
                                                onChange={(e) => setPreviewSecondaryColor(e.target.value)}
                                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white"
                                                placeholder="#a3a3a3"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setCurrentStyle({
                                            background: previewBackground,
                                            textColor: previewTextColor,
                                            accentColor: previewAccentColor,
                                            fontFamily: previewFontFamily,
                                            animationClass: 'fade-in',
                                            customCss: currentStyle?.customCss,
                                            titleFontSize: previewTitleSize,
                                            textFontSize: previewTextSize,
                                            titleFontWeight: previewTitleWeight,
                                            textFontWeight: previewTextWeight,
                                            textDecoration: `${previewItalic ? 'italic' : 'normal'} ${previewUnderline ? 'underline' : 'none'}`,
                                            secondaryTextColor: previewSecondaryColor
                                        });
                                        setShowStyleEditor(false);
                                        trackAction('Updated visual style from editor');
                                    }}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded font-medium"
                                >
                                    Apply Style
                                </button>
                            </div>

                            {/* Preview Panel */}
                            <div className="flex-1 p-6 overflow-y-auto" style={{ background: previewBackground }}>
                                <div className="max-w-2xl mx-auto space-y-6" style={{ fontFamily: previewFontFamily }}>
                                    <h1
                                        style={{
                                            color: previewAccentColor,
                                            fontSize: previewTitleSize,
                                            fontWeight: previewTitleWeight
                                        }}
                                    >
                                        Story Preview
                                    </h1>
                                    <p
                                        style={{
                                            color: previewTextColor,
                                            fontSize: previewTextSize,
                                            fontWeight: previewTextWeight,
                                            fontStyle: previewItalic ? 'italic' : 'normal',
                                            textDecoration: previewUnderline ? 'underline' : 'none'
                                        }}
                                        className="leading-relaxed"
                                    >
                                        This is how your story will look with the selected style. You can see the background color, text color, font sizes, and typography applied in real-time.
                                    </p>
                                    <p
                                        style={{
                                            color: previewSecondaryColor,
                                            fontSize: `calc(${previewTextSize} * 0.9)`
                                        }}
                                        className="leading-relaxed"
                                    >
                                        This is secondary text with a different color. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                                    </p>
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            className="px-6 py-3 rounded font-medium transition-colors"
                                            style={{
                                                backgroundColor: previewAccentColor,
                                                color: previewBackground
                                            }}
                                        >
                                            Choice 1
                                        </button>
                                        <button
                                            className="px-6 py-3 rounded font-medium border-2 transition-colors"
                                            style={{
                                                borderColor: previewAccentColor,
                                                color: previewAccentColor
                                            }}
                                        >
                                            Choice 2
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Version History Modal */}
            {showVersionHistory && (
                <VersionHistory
                    versions={storyVersions}
                    currentNodesCount={nodes.length}
                    onRestore={restoreVersion}
                    onClose={() => setShowVersionHistory(false)}
                />
            )}
            </div>
        </div>
    );
};

// Main App component with Auth wrapper
const App: React.FC = () => {
    const { user, isLoading } = useAuth();

    // Show loading state
    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    // Show auth screen if not logged in
    if (!user) {
        return <AuthScreen />;
    }

    // Show main app content
    return <AppContent />;
};

// Export with AuthProvider wrapper
const AppWithAuth: React.FC = () => (
    <AuthProvider>
        <App />
    </AuthProvider>
);

export default AppWithAuth;