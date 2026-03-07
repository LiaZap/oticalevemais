import React, { useEffect, useState, useRef, useCallback } from 'react';
import { socketService } from '../services/socket';
import { Search, Send, MoreVertical, Paperclip, Phone, Smile, CheckCheck, Check, Settings, Bot, UserCheck, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

// Notification sound (short beep using Web Audio API)
const playNotificationSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { /* ignore audio errors */ }
};

const WhatsApp = () => {
    const [status, setStatus] = useState('disconnected');
    const [chats, setChats] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatInfo, setChatInfo] = useState(null);
    const [sending, setSending] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const activeChatRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Keep ref in sync with state for use inside socket callback
    useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

    useEffect(() => {
        checkStatus();
        socketService.connect();

        const handleMessage = (msg) => {
            const current = activeChatRef.current;
            if (current && (msg.chatId === current.id || msg.chatId === current)) {
                setMessages(prev => {
                    const isDuplicate = prev.some(m =>
                        m.content === msg.content &&
                        m.sender_id === (msg.sender === 'me' ? 'me' : msg.chatId) &&
                        Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 3000
                    );
                    if (isDuplicate) return prev;
                    return [...prev, msg];
                });
                scrollToBottom();
                markAsRead(current.id);
            }
            if (msg.sender !== 'me' && soundEnabled) {
                playNotificationSound();
            }
            loadChats();
        };

        const handleHandoff = (data) => {
            const current = activeChatRef.current;
            if (current && data.chatId === current.id) {
                setChatInfo(prev => prev ? { ...prev, chat: { ...prev.chat, atendimento_mode: 'human' } } : prev);
                toast.info('A IA transferiu este atendimento para um humano.');
            }
        };

        socketService.on('wa.message', handleMessage);
        socketService.on('wa.handoff', handleHandoff);

        return () => {
            socketService.off('wa.message', handleMessage);
            socketService.off('wa.handoff', handleHandoff);
        };
    }, [soundEnabled]);

    const checkStatus = async () => {
        try {
            const res = await api.get('/whatsapp/status');
            setStatus(res.data.status);
            if (res.data.status === 'connected') {
                loadChats();
            }
        } catch (err) {
            console.error("Erro ao verificar status:", err);
            setStatus('disconnected');
        }
    };

    const loadChats = async () => {
        try {
            const res = await api.get('/whatsapp/chats');
            setChats(res.data);
        } catch (err) {
            console.error("Erro ao carregar chats:", err);
        }
    };

    const loadMessages = async (chatId) => {
        try {
            const res = await api.get(`/whatsapp/messages/${chatId}`);
            setMessages(res.data);
            scrollToBottom();
        } catch (err) {
            console.error("Erro ao carregar mensagens:", err);
        }
    };

    const loadChatInfo = async (chatId) => {
        try {
            const res = await api.get(`/whatsapp/chats/${chatId}/info`);
            setChatInfo(res.data);
        } catch (err) {
            console.error("Erro ao carregar info do chat:", err);
        }
    };

    const markAsRead = useCallback(async (chatId) => {
        try {
            await api.put(`/whatsapp/chats/${chatId}/read`);
            setChats(prev => prev.map(c => c.id === chatId ? { ...c, unread_count: 0 } : c));
        } catch (err) { /* silent */ }
    }, []);

    const handleChatClick = (chat) => {
        setActiveChat(chat);
        loadMessages(chat.id);
        loadChatInfo(chat.id);
        markAsRead(chat.id);
        setTimeout(() => inputRef.current?.focus(), 200);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat || sending) return;

        const messageText = newMessage.trim();
        setSending(true);
        setNewMessage('');

        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            sender_id: 'me',
            sender: 'me',
            content: messageText,
            timestamp: new Date().toISOString(),
            _optimistic: true
        };
        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom();

        try {
            await api.post('/whatsapp/send', {
                chatId: activeChat.id,
                content: messageText
            });
            if (chatInfo?.chat?.atendimento_mode !== 'human') {
                handleModeChange('human');
            }
        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
            toast.error('Erro ao enviar mensagem');
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            setNewMessage(messageText);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const handleModeChange = async (mode) => {
        if (!activeChat) return;
        try {
            await api.put(`/whatsapp/chats/${activeChat.id}/mode`, { mode });
            setChatInfo(prev => prev ? { ...prev, chat: { ...prev.chat, atendimento_mode: mode } } : prev);
            const labels = { human: 'Humano', ai: 'IA', auto: 'Automatico' };
            toast.success(`Modo alterado para: ${labels[mode]}`);
        } catch (err) {
            console.error("Erro ao mudar modo:", err);
            toast.error('Erro ao mudar modo');
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const filteredChats = chats.filter(chat =>
        chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.id.includes(searchQuery)
    );

    const getModeInfo = () => {
        const mode = chatInfo?.chat?.atendimento_mode || 'auto';
        switch (mode) {
            case 'human': return { label: 'Humano', color: 'bg-blue-500', textColor: 'text-blue-600' };
            case 'ai': return { label: 'IA', color: 'bg-purple-500', textColor: 'text-purple-600' };
            default: return { label: 'Auto', color: 'bg-green-500', textColor: 'text-green-600' };
        }
    };

    if (status !== 'connected') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-zinc-50 p-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-lg w-full text-center border border-zinc-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                        <Settings className="text-[#9c0102] w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4 text-[#9c0102]">Configuracao Necessaria</h2>
                    <p className="text-zinc-500 mb-6">
                        O sistema nao detectou a configuracao da API Uazapi.
                    </p>
                    <div className="bg-zinc-100 p-4 rounded-lg text-left w-full mb-6">
                        <p className="text-sm font-medium mb-2 text-zinc-700">Adicione ao seu arquivo .env:</p>
                        <code className="block text-xs font-mono text-zinc-500 bg-zinc-200 p-2 rounded">
                            UAZAPI_URL=https://api.uazapi.com/instance/sua-instancia<br/>
                            UAZAPI_TOKEN=seu-token-aqui
                        </code>
                    </div>
                    <button
                        onClick={checkStatus}
                        className="bg-[#9c0102] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#7a0102] transition-colors"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    const modeInfo = getModeInfo();

    return (
        <div className="flex h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            {/* Sidebar List */}
            <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-zinc-200 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
                        <span className="font-bold text-zinc-500">Me</span>
                    </div>
                    <div className="flex gap-4 text-zinc-500">
                        <MoreVertical size={20} />
                    </div>
                </div>

                {/* Search */}
                <div className="p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar conversa"
                            className="w-full pl-10 pr-4 py-2 bg-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#9c0102]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredChats.map(chat => (
                        <div
                            key={chat.id}
                            onClick={() => handleChatClick(chat)}
                            className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-zinc-50 transition-colors border-b border-zinc-100 ${activeChat?.id === chat.id ? 'bg-zinc-100' : ''}`}
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-zinc-200 flex-shrink-0 flex items-center justify-center text-zinc-500 font-bold overflow-hidden">
                                    {chat.photo_url ? <img src={chat.photo_url} alt="" className="w-full h-full object-cover" /> : chat.name?.[0] || '#'}
                                </div>
                                {chat.atendimento_mode && chat.atendimento_mode !== 'auto' && (
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${chat.atendimento_mode === 'human' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-medium text-zinc-900 truncate">{chat.name || chat.id.split('@')[0]}</h3>
                                    <span className="text-xs text-zinc-400">
                                        {chat.last_message_timestamp ? new Date(chat.last_message_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-zinc-500 truncate">{chat.last_message_content}</p>
                                    {chat.unread_count > 0 && (
                                        <span className="bg-[#9c0102] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                            {chat.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Window */}
            {activeChat ? (
                <div className="flex-1 flex flex-col h-full bg-[#f0f2f5]">
                    {/* Header */}
                    <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-3">
                            <button className="md:hidden" onClick={() => { setActiveChat(null); setChatInfo(null); }}>
                                <span className="text-2xl">&#8592;</span>
                            </button>
                            <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center overflow-hidden">
                                {activeChat.photo_url ? <img src={activeChat.photo_url} alt="" className="w-full h-full object-cover" /> : activeChat.name?.[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900">{activeChat.name || activeChat.id}</h3>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${modeInfo.textColor}`}>
                                        <span className={`w-2 h-2 rounded-full ${modeInfo.color}`} />
                                        {modeInfo.label}
                                    </span>
                                    {chatInfo?.atendimento && (
                                        <span className="text-xs text-zinc-400">
                                            | {chatInfo.atendimento.intencao_detectada || 'Sem intencao'}
                                            {chatInfo.atendimento.cliente && ` - ${chatInfo.atendimento.cliente}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {chatInfo?.chat?.atendimento_mode === 'human' ? (
                                <button
                                    onClick={() => handleModeChange('auto')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                                    title="Devolver para IA (modo automatico)"
                                >
                                    <RotateCcw size={14} />
                                    Devolver p/ IA
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleModeChange('human')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                    title="Assumir atendimento (desativar IA)"
                                >
                                    <UserCheck size={14} />
                                    Assumir
                                </button>
                            )}
                            <div className="flex gap-3 text-zinc-500 ml-2">
                                <Phone size={18} className="cursor-pointer hover:text-[#9c0102]" />
                                <Search size={18} className="cursor-pointer hover:text-[#9c0102]" />
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg, index) => {
                            const isMe = msg.sender_id === 'me' || msg.sender === 'me';
                            return (
                                <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] p-3 rounded-lg shadow-sm relative ${isMe ? 'bg-[#d9fdd3] text-zinc-900' : 'bg-white text-zinc-900'}`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <div className="flex justify-end items-center gap-1 mt-1">
                                            <span className="text-[10px] text-zinc-500">
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                            {isMe && (msg._optimistic
                                                ? <Check size={14} className="text-zinc-400" />
                                                : <CheckCheck size={14} className="text-blue-500" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-zinc-50 border-t border-zinc-200 flex items-center gap-2">
                        <div className="flex gap-2 text-zinc-500">
                            <Smile size={24} className="cursor-pointer hover:text-zinc-700" />
                            <Paperclip size={24} className="cursor-pointer hover:text-zinc-700" />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 p-3 rounded-lg bg-white border-none focus:ring-1 focus:ring-[#9c0102] placeholder-zinc-400 text-zinc-900"
                            placeholder="Digite uma mensagem"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={sending}
                            autoFocus
                        />
                        {newMessage.trim() ? (
                            <button type="submit" disabled={sending} className="p-3 bg-[#9c0102] text-white rounded-full hover:bg-[#7a0102] transition-colors disabled:opacity-50">
                                <Send size={20} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`p-3 transition-colors ${soundEnabled ? 'text-zinc-500 hover:text-zinc-700' : 'text-red-400 hover:text-red-500'}`}
                                title={soundEnabled ? 'Som ativado' : 'Som desativado'}
                            >
                                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                            </button>
                        )}
                    </form>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#f0f2f5] border-b-8 border-[#9c0102]">
                    <div className="text-center p-8">
                        <Bot size={64} className="mx-auto mb-4 text-zinc-300" />
                        <h1 className="text-3xl font-light text-zinc-600 mb-4">Otica Leve + WhatsApp</h1>
                        <p className="text-zinc-500 max-w-md">
                            Selecione uma conversa para visualizar. A Iris responde automaticamente fora do horario comercial.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsApp;
