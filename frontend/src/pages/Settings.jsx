import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { User, Bell, Monitor, Moon, Sun, Shield, Save, Camera, PlayCircle, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { createAtendimento, fetchSettings, saveSettings } from '../lib/api';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('profile');
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' || 
               (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

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

    const [n8nConfig, setN8nConfig] = useState({
        NEW_ATENDIMENTO: '',
        STATUS_UPDATE: ''
    });

    const [automationConfig, setAutomationConfig] = useState({
        FOLLOWUP_MSG: ''
    });

    useEffect(() => {
        fetchSettings().then(setAutomationConfig);
    }, []);

    useEffect(() => {
        const savedN8n = localStorage.getItem('n8n_config');
        if (savedN8n) {
            setN8nConfig(JSON.parse(savedN8n));
        }
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        if (activeTab === 'integrations') {
            localStorage.setItem('n8n_config', JSON.stringify(n8nConfig));
        }
        if (activeTab === 'automation') {
            saveSettings('FOLLOWUP_MSG', automationConfig.FOLLOWUP_MSG);
        }
        toast.success('Configurações salvas com sucesso!');
    };

    const toggleTheme = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
    };

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
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'profile' 
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' 
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <User size={18} />
                            Meu Perfil
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'notifications' 
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' 
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <Bell size={18} />
                            Notificações
                        </button>
                        <button
                            onClick={() => setActiveTab('integrations')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'integrations' 
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' 
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                            Integrações (n8n)
                        </button>
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'system' 
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' 
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <Monitor size={18} />
                            Sistema
                        </button>

                        <button
                            onClick={() => setActiveTab('automation')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                                activeTab === 'automation' 
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400' 
                                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            <Bot size={18} />
                            Automação
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
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
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Telefone</label>
                                            <input type="tel" defaultValue="(11) 99999-8888" className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cargo</label>
                                            <input type="text" defaultValue="Administrador" disabled className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 cursor-not-allowed" />
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

                        {activeTab === 'integrations' && (
                            <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Webhooks (n8n)</h2>
                                    <p className="text-sm text-zinc-500 mb-6">Configure as URLs para onde os eventos do sistema serão enviados.</p>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Novo Atendimento</label>
                                            <input 
                                                type="url" 
                                                placeholder="https://seu-n8n.com/webhook/..." 
                                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                value={n8nConfig.NEW_ATENDIMENTO}
                                                onChange={(e) => setN8nConfig({...n8nConfig, NEW_ATENDIMENTO: e.target.value})}
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">Disparado quando um novo atendimento é cadastrado.</p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Atualização de Status</label>
                                            <input 
                                                type="url" 
                                                placeholder="https://seu-n8n.com/webhook/..." 
                                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                                value={n8nConfig.STATUS_UPDATE}
                                                onChange={(e) => setN8nConfig({...n8nConfig, STATUS_UPDATE: e.target.value})}
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">Disparado quando o status de um atendimento muda (ex: Pendente &rarr; Agendado).</p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                        <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">Teste de Integração</h3>
                                        <button 
                                            type="button"
                                            onClick={async () => {
                                                const fakeLead = {
                                                    cliente: 'Lead Simulado ' + Math.floor(Math.random() * 1000),
                                                    telefone: '(11) 99999-' + Math.floor(Math.random() * 9000 + 1000),
                                                    canal: 'Site',
                                                    tipo: 'Dúvida',
                                                    data_inicio: new Date().toISOString(),
                                                    status: 'Pendente'
                                                };
                                                await createAtendimento(fakeLead);
                                                toast.info(`🔔 Novo Lead Recebido: ${fakeLead.cliente}`, {
                                                    description: 'Simulação de recebimento via Webhook do n8n',
                                                    duration: 5000,
                                                });
                                            }}
                                            className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                                        >
                                            <PlayCircle size={16} />
                                            Simular Recebimento de Lead (Webhook de Entrada)
                                        </button>
                                        <p className="text-xs text-zinc-500 mt-2">Clique para simular um lead chegando do n8n (ele aparecerá na tela de Atendimentos automaticamente).</p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button type="submit" className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm">
                                        <Save size={18} />
                                        Salvar Integrações
                                    </button>
                                </div>
                            </form>
                        )}


                        {activeTab === 'notifications' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Preferências de Notificação</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                        <div>
                                            <h3 className="font-medium text-zinc-900 dark:text-white">Notificações por Email</h3>
                                            <p className="text-sm text-zinc-500">Receba atualizações importantes via email.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={notifications.email} onChange={() => setNotifications({...notifications, email: !notifications.email})} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                        <div>
                                            <h3 className="font-medium text-zinc-900 dark:text-white">Push Notifications</h3>
                                            <p className="text-sm text-zinc-500">Alertas no navegador sobre novos atendimentos.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={notifications.push} onChange={() => setNotifications({...notifications, push: !notifications.push})} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                        <div>
                                            <h3 className="font-medium text-zinc-900 dark:text-white">Marketing e Novidades</h3>
                                            <p className="text-sm text-zinc-500">Novas funcionalidades e dicas de uso.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={notifications.marketing} onChange={() => setNotifications({...notifications, marketing: !notifications.marketing})} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-red-600"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Sistema</h2>
                                
                                <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                    <h3 className="font-medium text-zinc-900 dark:text-white mb-4">Aparência</h3>
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => setDarkMode(false)}
                                            className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                                                !darkMode 
                                                    ? 'border-red-600 bg-red-50 dark:bg-red-900/10' 
                                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                                            }`}
                                        >
                                            <Sun size={24} className={!darkMode ? 'text-red-600' : 'text-zinc-500'} />
                                            <span className={`font-medium ${!darkMode ? 'text-red-700' : 'text-zinc-600'}`}>Modo Claro</span>
                                        </button>
                                        <button 
                                            onClick={() => setDarkMode(true)}
                                            className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                                                darkMode 
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
                                    <p className="text-sm text-zinc-500">v1.2.0 (Build 3042)</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'automation' && (
                            <form onSubmit={handleSave} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Automação de Follow-up</h2>
                                    <p className="text-sm text-zinc-500 mb-6">Configure as mensagens automáticas enviadas pelo sistema.</p>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Mensagem de Recuperação (24h)</label>
                                        <textarea 
                                            rows={4}
                                            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                            value={automationConfig.FOLLOWUP_MSG}
                                            onChange={(e) => setAutomationConfig({...automationConfig, FOLLOWUP_MSG: e.target.value})}
                                            placeholder="Digite a mensagem..."
                                        />
                                        <p className="text-xs text-zinc-500 mt-1">Use <strong>{'{cliente}'}</strong> para inserir o nome do cliente automaticamente.</p>
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
                    </div>
                </div>
            </div>
        </Sidebar>
    );
}
