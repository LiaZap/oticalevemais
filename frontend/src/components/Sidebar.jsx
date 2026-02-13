import React, { useState, useEffect } from 'react';
import { Home, BarChart2, Users, Settings, LogOut, Menu, X, HelpCircle, Activity, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Logo';

export function Sidebar({ children }) {
    // Initialize open state based on screen width
    const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    
    const navigate = useNavigate();
    const location = useLocation();

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile && !isOpen) {
                setIsOpen(true);
            }
            if (mobile && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // PWA Install Prompt
    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const menuItems = [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Activity, label: 'Atendimentos', path: '/atendimentos' },
        { icon: BarChart2, label: 'Relatórios', path: '/reports' },
        { icon: Users, label: 'Equipe', path: '/team' },
        { icon: Settings, label: 'Configurações', path: '/settings' },
        { icon: HelpCircle, label: 'Ajuda', path: '/help' },
    ];

    const handleNavigation = (path) => {
        navigate(path);
        if (isMobile) setIsOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative">
            
            {/* Mobile Overlay - Now covers everything properly */}
            {isMobile && isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside 
                className={`
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${isOpen ? 'w-64' : 'w-0 md:w-20'} 
                    bg-[#9c0102] dark:bg-zinc-900 border-r border-[#9c0102]/20 dark:border-zinc-800
                    transition-all duration-300 ease-in-out flex flex-col fixed md:relative z-50 h-full shadow-xl
                `}
            >
                {/* Logo Area */}
                <div className="h-48 flex items-center justify-center px-4 border-b border-[#ffffff]/10 dark:border-zinc-800 relative">
                     {/* Close button for mobile */}
                     {isMobile && (
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-white/70 hover:text-white p-1"
                        >
                            <X size={20} />
                        </button>
                    )}

                    <div className={`flex items-center justify-center w-full transition-all duration-300`}>
                        <Logo 
                            className={`${isOpen ? 'h-32' : 'h-10'} w-auto transition-all duration-300 drop-shadow-md text-white`} 
                        />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavigation(item.path)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                                    ${isActive 
                                        ? 'bg-white text-[#9c0102] font-bold shadow-md' 
                                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }
                                    ${!isOpen && 'justify-center'}
                                    overflow-hidden whitespace-nowrap
                                `}
                                title={!isOpen ? item.label : ''}
                            >
                                <item.icon size={22} className={`shrink-0 ${isActive ? 'text-[#9c0102]' : 'text-current'}`} />
                                <span className={`text-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100 hidden md:block'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-[#ffffff]/10 dark:border-zinc-800 space-y-2">
                    {deferredPrompt && (
                        <button
                            onClick={handleInstallClick}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                                bg-white/10 text-white hover:bg-white/20 transition-colors
                                ${!isOpen && 'justify-center'}
                                overflow-hidden whitespace-nowrap
                            `}
                            title="Instalar App"
                        >
                            <Download size={20} className="shrink-0" />
                            <span className={`font-medium text-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100 hidden md:block'}`}>
                                Instalar App
                            </span>
                        </button>
                    )}

                    <button
                        onClick={handleLogout}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                            text-white/70 hover:bg-white/10 hover:text-white transition-colors
                            ${!isOpen && 'justify-center'}
                            overflow-hidden whitespace-nowrap
                        `}
                        title="Sair"
                    >
                        <LogOut size={20} className="shrink-0" />
                        <span className={`font-medium text-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100 hidden md:block'}`}>
                            Sair
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
                
                {/* Mobile Header */}
                <div className="md:hidden h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between shrink-0 z-10 sticky top-0">
                    <Logo className="h-8 w-auto text-[#9c0102] dark:text-white" />
                    <button onClick={() => setIsOpen(true)} className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                        <Menu size={24} />
                    </button>
                </div>

                {/* Content Scrollable Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
                    <div className="container mx-auto max-w-7xl animate-fade-in">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
