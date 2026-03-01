import { useState, useRef, useEffect } from 'react';
import { chatWithGroq } from '@/app/actions/chat';

export interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot' | 'system';
    timestamp: string;
    isStreaming?: boolean;
    chartData?: any;
}

import { useAuth } from '@/context/AuthContext';

export function useQuantumChat(mode: 'industry' | 'market' | 'article' | 'embed' | 'assistant', contextConfig?: any) {
    const { isAuthenticated, user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
    const [stepOutputs, setStepOutputs] = useState<{ code?: string; sim?: string; analysis?: string }>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    // Auto-scroll logic
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (shouldAutoScroll) {
            scrollToBottom();
        }
    }, [messages, isTyping, shouldAutoScroll]);

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
        setShouldAutoScroll(isAtBottom);
    };

    const sendMessage = async (text?: string, customConfig?: any) => {
        setShouldAutoScroll(true);
        const messageToSend = text || inputValue;
        if (!messageToSend.trim()) return;

        const userMsg: Message = {
            id: Date.now(),
            text: messageToSend,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        try {
            const fullConfig = {
                ...contextConfig,
                ...customConfig,
                mode,
                isAuthenticated,
                userEmail: user?.email
            };

            // Call API
            console.log(`[useQuantumChat] Sending message to Groq (mode: ${mode}):`, userMsg.text);
            const response = await chatWithGroq(userMsg.text, 'chat', 'en', fullConfig);

            // Dispatch token usage event to sidebar indicator
            if (response.tokensUsed !== undefined) {
                window.dispatchEvent(new CustomEvent('qg:token-update', { detail: { delta: response.tokensUsed } }));
            }

            // Extract step output markers (code, sim output)
            let cleanText = response.text;
            const stepCodeMatch = cleanText.match(/\[STEP_CODE\]([\s\S]*?)\[\/STEP_CODE\]/);
            const stepSimMatch = cleanText.match(/\[STEP_SIM\]([\s\S]*?)\[\/STEP_SIM\]/);
            if (stepCodeMatch || stepSimMatch) {
                setStepOutputs({
                    code: stepCodeMatch?.[1]?.trim(),
                    sim: stepSimMatch?.[1]?.trim(),
                    analysis: undefined // will be filled later from cleanText
                });
                cleanText = cleanText
                    .replace(/\[STEP_CODE\][\s\S]*?\[\/STEP_CODE\]/, '')
                    .replace(/\[STEP_SIM\][\s\S]*?\[\/STEP_SIM\]/, '')
                    .trim();
            }

            // Handle Chart Data
            let chartData = null;
            const chartMatch = cleanText.match(/\[CHART_DATA\]([\s\S]*?)\[\/CHART_DATA\]/);
            if (chartMatch) {
                try {
                    chartData = JSON.parse(chartMatch[1]);
                    cleanText = cleanText.replace(/\[CHART_DATA\][\s\S]*?\[\/CHART_DATA\]/, '').trim();
                } catch (e) {
                    console.error("Failed to parse chart data");
                }
            }

            // Store final analysis text in stepOutputs
            setStepOutputs(prev => ({ ...prev, analysis: cleanText }));

            // Simulate Streaming
            const botMsgId = Date.now() + 1;
            setStreamingMessageId(botMsgId);

            setMessages(prev => [...prev, {
                id: botMsgId,
                text: "",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isStreaming: true,
                chartData
            }]);

            let currentText = "";
            const words = cleanText.split(" ");

            for (let i = 0; i < words.length; i++) {
                currentText += words[i] + " ";
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId ? { ...msg, text: currentText } : msg
                ));
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
            ));
            setStreamingMessageId(null);

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Error: Neural link unstable. Please retry transmission.",
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const addBotMessage = (text: string, chartData?: any) => {
        const botMsgId = Date.now() + 1;
        setMessages(prev => [...prev, {
            id: botMsgId,
            text,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            chartData,
        }]);
    };

    return {
        messages,
        inputValue,
        setInputValue,
        isTyping,
        sendMessage,
        addBotMessage,
        messagesEndRef,
        scrollContainerRef,
        handleScroll,
        setShouldAutoScroll,
        stepOutputs
    };
}
