import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { User, Bell, Monitor, Moon, Sun, Save, Camera, Bot, Eye, EyeOff, HeartPulse, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSettings, saveSettings } from '../lib/api';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('profile');
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' ||
            (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        marketing: false
    });

    const [config, setConfig] = useState({
        AI_ENABLED: 'true',
        OPENAI_API_KEY: '',
        OPENAI_MODEL: 'gpt-4.1-mini',
        FOLLOWUP_ENABLED: 'true',
        FOLLOWUP_TIER1_MINUTES: '30',
        FOLLOWUP_TIER2_MINUTES: '120',
        FOLLOWUP_TIER3_MINUTES: '1440',
        FOLLOWUP_MSG: '',
        CAMPANHA_SAUDE_VISUAL_ATIVA: 'false',
        CAMPANHA_SAUDE_VISUAL_INICIO: '',
        CAMPANHA_SAUDE_VISUAL_FIM: '',
        CAMPANHA_SAUDE_VISUAL_DESCRICAO: 'Consulta na ótica com condições especiais para quem vai fazer os óculos na loja.'
    });

    const [maskedApiKey, setMaskedApiKey] = useState('');

    useEffect(() => {
        fetchSettings().then(data => {
            // Guardar API key mascarada do servidor para comparação
            if (data.OPENAI_API_KEY) {
                setMaskedApiKey(data.OPENAI_API_KEY);
            }
            setConfig(prev => ({ ...prev, ...data }));
        });
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (activeTab === 'automation') {
                const keys = ['AI_ENABLED', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'FOLLOWUP_ENABLED',
                    'FOLLOWUP_TIER1_MINUTES', 'FOLLOWUP_TIER2_MINUTES', 'FOLLOWUP_TIER3_MINUTES', 'FOLLOWUP_MSG',
                    'CAMPANHA_SAUDE_VISUAL_ATIVA', 'CAMPANHA_SAUDE_VISUAL_INICIO', 'CAMPANHA_SAUDE_VISUAL_FIM', 'CAMPANHA_SAUDE_VISUAL_DESCRICAO'];
                for (const key of keys) {
                    if (config[key] !== undefined && config[key] !== '') {
                        // Não enviar API key mascarada de volta para o servidor
                        if (key === 'OPENAI_API_KEY' && config[key] === maskedApiKey) {
                            continue; // pula — não mudou
                        }
                        await saveSettings(key, config[key]);
                    }
                }
            }
            toast.success('Configurações salvas com sucesso!');
        } catch (err) {
            toast.error('Erro ao salvar configurações');
        }
    };

    const ToggleSwitch = ({ checked, onChange }) => (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-red-600"></div>
        </label>
    );

    return (
        <Sidebar>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Configurações</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Gerencie suas preferências e dados de conta</p>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Navigation Tabs */}
                    <div className="w-full md:w-64 flex flex-col gap-1">
                        {[
                            { id: 'profile', label: 'Meu Perfil', icon: <User size={18} /> },
                            { id: 'automation', label: 'IA & Automação', icon: <Bot size={18} /> },
                            { id: 'notifications', label: 'Notificações', icon: <Bell size={18} /> },
                            { id: 'system', label: 'Sistema', icon: <Monitor size={18} /> },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400'
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">

                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Informações Pessoais</h2>
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="relative group cursor-pointer">
                                            <div className="h-24 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-zinc-700 shadow-sm">
                                                <User size={40} className="text-zinc-400" />
                                            </div>
                                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-white" size={24} />
                                            </div>
                                        </div>
                                        <div>
                                            <button type="button" className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
                                                Alterar Foto
                                            </button>
                                            <p className="text-xs text-zinc-500 mt-2">JPG ou PNG. Max 1MB.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome Completo</label>
                                            <input type="text" defaultValue="Paulo Admin" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                                            <input type="email" defaultValue="admin@oticalevemais.com.br" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Segurança</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Senha Atual</label>
                                            <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nova Senha</label>
                                            <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button type="submit" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm">
                                        <Save size={18} />
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* IA & Automation Tab */}
                        {activeTab === 'automation' && (
                            <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* AI Section */}
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Inteligência Artificial (Íris)</h2>
                                    <p className="text-sm text-zinc-500 mb-6">Configure a IA que responde automaticamente fora do horário comercial.</p>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                            <div>
                                                <h3 className="font-medium text-zinc-900 dark:text-white">IA Habilitada</h3>
                                                <p className="text-sm text-zinc-500">Quando ativada, a Íris responde clientes fora do horário comercial.</p>
                                            </div>
                                            <ToggleSwitch
                                                checked={config.AI_ENABLED === 'true'}
                                                onChange={() => setConfig({ ...config, AI_ENABLED: config.AI_ENABLED === 'true' ? 'false' : 'true' })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">API Key (OpenAI)</label>
                                            <div className="relative">
                                                <input
                                                    type={showApiKey ? 'text' : 'password'}
                                                    className="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white font-mono text-sm"
                                                    value={config.OPENAI_API_KEY || ''}
                                                    onChange={(e) => setConfig({ ...config, OPENAI_API_KEY: e.target.value })}
                                                    placeholder="sk-..."
                                                />
                                                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-1">Chave da API OpenAI. Configurada via .env ou aqui.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Modelo</label>
                                            <select
                                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                value={config.OPENAI_MODEL || 'gpt-4.1-mini'}
                                                onChange={(e) => setConfig({ ...config, OPENAI_MODEL: e.target.value })}
                                            >
                                                <option value="gpt-4.1-mini">GPT-4.1 Mini (Recomendado)</option>
                                                <option value="gpt-4.1-nano">GPT-4.1 Nano (Mais barato)</option>
                                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Follow-up Section */}
                                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Follow-up Automático</h2>
                                    <p className="text-sm text-zinc-500 mb-6">Mensagens de recuperação enviadas quando o cliente para de responder. A IA gera mensagens contextuais baseadas na conversa.</p>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                            <div>
                                                <h3 className="font-medium text-zinc-900 dark:text-white">Follow-up Habilitado</h3>
                                                <p className="text-sm text-zinc-500">Envia lembretes automáticos para clientes inativos.</p>
                                            </div>
                                            <ToggleSwitch
                                                checked={config.FOLLOWUP_ENABLED === 'true'}
                                                onChange={() => setConfig({ ...config, FOLLOWUP_ENABLED: config.FOLLOWUP_ENABLED === 'true' ? 'false' : 'true' })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Tier 1 - Gentil</h4>
                                                <label className="block text-xs text-zinc-500 mb-1">Tempo (minutos)</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                    value={config.FOLLOWUP_TIER1_MINUTES}
                                                    onChange={(e) => setConfig({ ...config, FOLLOWUP_TIER1_MINUTES: e.target.value })}
                                                />
                                                <p className="text-xs text-zinc-400 mt-1">Padrão: 30 min</p>
                                            </div>
                                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Tier 2 - Amigável</h4>
                                                <label className="block text-xs text-zinc-500 mb-1">Tempo (minutos)</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                    value={config.FOLLOWUP_TIER2_MINUTES}
                                                    onChange={(e) => setConfig({ ...config, FOLLOWUP_TIER2_MINUTES: e.target.value })}
                                                />
                                                <p className="text-xs text-zinc-400 mt-1">Padrão: 2 horas</p>
                                            </div>
                                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Tier 3 - Encerramento</h4>
                                                <label className="block text-xs text-zinc-500 mb-1">Tempo (minutos)</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                    value={config.FOLLOWUP_TIER3_MINUTES}
                                                    onChange={(e) => setConfig({ ...config, FOLLOWUP_TIER3_MINUTES: e.target.value })}
                                                />
                                                <p className="text-xs text-zinc-400 mt-1">Padrão: 24 horas</p>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
                                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                                <strong>Como funciona:</strong> A IA gera mensagens contextuais baseadas na conversa que o cliente teve. Se a IA não estiver disponível, usa mensagens padrão de fallback.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Campanha Saúde Visual */}
                                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1 flex items-center gap-2">
                                        <HeartPulse size={20} className="text-green-600" />
                                        Campanha Saúde Visual
                                    </h2>
                                    <p className="text-sm text-zinc-500 mb-6">Quando ativa, a Íris oferece a consulta na ótica como terceira opção de consulta para os clientes.</p>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                            <div>
                                                <h3 className="font-medium text-zinc-900 dark:text-white">Campanha Ativa</h3>
                                                <p className="text-sm text-zinc-500">Quando ativada, a Íris menciona a campanha Saúde Visual nas conversas.</p>
                                            </div>
                                            <ToggleSwitch
                                                checked={config.CAMPANHA_SAUDE_VISUAL_ATIVA === 'true'}
                                                onChange={() => setConfig({ ...config, CAMPANHA_SAUDE_VISUAL_ATIVA: config.CAMPANHA_SAUDE_VISUAL_ATIVA === 'true' ? 'false' : 'true' })}
                                            />
                                        </div>

                                        {config.CAMPANHA_SAUDE_VISUAL_ATIVA === 'true' && (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            Data Início
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                            value={config.CAMPANHA_SAUDE_VISUAL_INICIO || ''}
                                                            onChange={(e) => setConfig({ ...config, CAMPANHA_SAUDE_VISUAL_INICIO: e.target.value })}
                                                        />
                                                        <p className="text-xs text-zinc-400 mt-1">Deixe vazio para ativar sem data limite</p>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                                                            <Calendar size={14} />
                                                            Data Fim
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                            value={config.CAMPANHA_SAUDE_VISUAL_FIM || ''}
                                                            onChange={(e) => setConfig({ ...config, CAMPANHA_SAUDE_VISUAL_FIM: e.target.value })}
                                                        />
                                                        <p className="text-xs text-zinc-400 mt-1">Deixe vazio para ativar sem data limite</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Descrição da Campanha (para a IA)</label>
                                                    <textarea
                                                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                        rows={3}
                                                        value={config.CAMPANHA_SAUDE_VISUAL_DESCRICAO || ''}
                                                        onChange={(e) => setConfig({ ...config, CAMPANHA_SAUDE_VISUAL_DESCRICAO: e.target.value })}
                                                        placeholder="Ex: Consulta na ótica com condições especiais..."
                                                    />
                                                    <p className="text-xs text-zinc-400 mt-1">Essa descrição é enviada para a IA. Descreva o que a campanha oferece.</p>
                                                </div>

                                                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                                                    <p className="text-sm text-green-700 dark:text-green-400">
                                                        <strong>🟢 Campanha ativa!</strong> A Íris vai oferecer a Campanha Saúde Visual como opção quando clientes perguntarem sobre consulta ou exame de vista.
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button type="submit" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm">
                                        <Save size={18} />
                                        Salvar Configuração
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Notifications Tab */}
                        {activeTab === 'notifications' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Preferências de Notificação</h2>
                                <div className="space-y-4">
                                    {[
                                        { key: 'email', title: 'Notificações por Email', desc: 'Receba atualizações importantes via email.' },
                                        { key: 'push', title: 'Push Notifications', desc: 'Alertas no navegador sobre novos atendimentos.' },
                                        { key: 'marketing', title: 'Marketing e Novidades', desc: 'Novas funcionalidades e dicas de uso.' },
                                    ].map(n => (
                                        <div key={n.key} className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                            <div>
                                                <h3 className="font-medium text-zinc-900 dark:text-white">{n.title}</h3>
                                                <p className="text-sm text-zinc-500">{n.desc}</p>
                                            </div>
                                            <ToggleSwitch
                                                checked={notifications[n.key]}
                                                onChange={() => setNotifications({ ...notifications, [n.key]: !notifications[n.key] })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* System Tab */}
                        {activeTab === 'system' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Sistema</h2>

                                <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                    <h3 className="font-medium text-zinc-900 dark:text-white mb-4">Aparência</h3>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setDarkMode(false)}
                                            className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${!darkMode
                                                ? 'border-red-600 bg-red-50 dark:bg-red-900/10'
                                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                }`}
                                        >
                                            <Sun size={24} className={!darkMode ? 'text-red-600' : 'text-zinc-500'} />
                                            <span className={`font-medium ${!darkMode ? 'text-red-700' : 'text-zinc-600'}`}>Modo Claro</span>
                                        </button>
                                        <button
                                            onClick={() => setDarkMode(true)}
                                            className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${darkMode
                                                ? 'border-red-600 bg-red-50 dark:bg-red-900/10'
                                                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                                }`}
                                        >
                                            <Moon size={24} className={darkMode ? 'text-red-600' : 'text-zinc-500'} />
                                            <span className={`font-medium ${darkMode ? 'text-red-700' : 'text-zinc-600'}`}>Modo Escuro</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg opacity-60">
                                    <h3 className="font-medium text-zinc-900 dark:text-white mb-2">Versão do Sistema</h3>
                                    <p className="text-sm text-zinc-500">v2.0.0 — IA Íris + Automação WhatsApp</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Sidebar>
    );
}
