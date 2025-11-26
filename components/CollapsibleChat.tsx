import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface CollapsibleChatProps {
    title: string;
    currentValue: string;
    onIterate: (message: string) => Promise<string>;
    chatHistory: ChatMessage[];
    onChatHistoryUpdate: (history: ChatMessage[]) => void;
    isExpanded: boolean;
    onToggle: () => void;
    placeholder?: string;
    renderValue?: (value: string) => React.ReactNode;
}

const CollapsibleChat: React.FC<CollapsibleChatProps> = ({
    title,
    currentValue,
    onIterate,
    chatHistory,
    onChatHistoryUpdate,
    isExpanded,
    onToggle,
    placeholder = "Type to refine...",
    renderValue
}) => {
    const [userMessage, setUserMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const autoCollapseTimerRef = useRef<NodeJS.Timeout>();

    // Auto-scroll to bottom when chat history updates
    useEffect(() => {
        if (isExpanded && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isExpanded]);

    // Auto-collapse after 10 seconds of inactivity
    useEffect(() => {
        if (isExpanded) {
            // Clear existing timer
            if (autoCollapseTimerRef.current) {
                clearTimeout(autoCollapseTimerRef.current);
            }

            // Set new timer
            autoCollapseTimerRef.current = setTimeout(() => {
                onToggle();
            }, 10000);
        }

        return () => {
            if (autoCollapseTimerRef.current) {
                clearTimeout(autoCollapseTimerRef.current);
            }
        };
    }, [isExpanded, chatHistory]); // Reset timer when chat updates

    const handleSendMessage = async () => {
        if (!userMessage.trim() || isProcessing) return;

        const newUserMessage: ChatMessage = {
            id: `msg-${Date.now()}-user`,
            role: 'user',
            content: userMessage.trim(),
            timestamp: Date.now()
        };

        // Add user message to history
        const updatedHistory = [...chatHistory, newUserMessage];
        onChatHistoryUpdate(updatedHistory);
        setUserMessage('');
        setIsProcessing(true);

        try {
            // Call the iteration function
            const result = await onIterate(userMessage.trim());

            // Add AI response to history
            const aiMessage: ChatMessage = {
                id: `msg-${Date.now()}-ai`,
                role: 'assistant',
                content: `Updated successfully`,
                timestamp: Date.now()
            };

            onChatHistoryUpdate([...updatedHistory, aiMessage]);
        } catch (error) {
            console.error('Iteration error:', error);

            // Add error message
            const errorMessage: ChatMessage = {
                id: `msg-${Date.now()}-error`,
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'Failed to process request'}`,
                timestamp: Date.now()
            };

            onChatHistoryUpdate([...updatedHistory, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="space-y-2">
            {/* Header with toggle */}
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {title}
                </label>
                <button
                    onClick={onToggle}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 rounded transition-colors"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp size={14} />
                            <span>Hide Chat</span>
                        </>
                    ) : (
                        <>
                            <ChevronDown size={14} />
                            <span>Chat</span>
                        </>
                    )}
                </button>
            </div>

            {/* Expanded chat view */}
            {isExpanded && (
                <div className="border border-neutral-700 rounded-lg bg-neutral-900 overflow-hidden">
                    {/* Chat history */}
                    <div className="max-h-64 overflow-y-auto p-3 space-y-2 bg-neutral-950">
                        {chatHistory.length === 0 ? (
                            <p className="text-xs text-neutral-500 text-center py-4">
                                No chat history. Start a conversation to refine this content.
                            </p>
                        ) : (
                            chatHistory.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] px-3 py-2 rounded-lg text-xs ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-neutral-800 text-neutral-200'
                                            }`}
                                    >
                                        <div className="font-medium mb-1">
                                            {msg.role === 'user' ? 'You' : 'AI'}
                                        </div>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="p-2 bg-neutral-900 border-t border-neutral-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={userMessage}
                                onChange={(e) => setUserMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={placeholder}
                                disabled={isProcessing}
                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-blue-500 disabled:opacity-50"
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!userMessage.trim() || isProcessing}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

            {/* Collapsed view - show current value */}
            {!isExpanded && (
                <div className="border border-neutral-700 rounded bg-neutral-900 p-3">
                    {renderValue ? renderValue(currentValue) : (
                        <div className="text-sm text-neutral-300 whitespace-pre-wrap">
                            {currentValue || <span className="text-neutral-500">No content yet</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CollapsibleChat;
