import React, { useState, useEffect } from 'react';
import { X, Phone, MessageCircle, Mail, Calendar, Edit, MoveRight, StickyNote, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerDetailsDrawer({ atendimento, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('timeline'); // 'details', 'timeline', 'notes'
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
      if (atendimento) {
          setNoteText(atendimento.anotacoes || '');
      }
  }, [atendimento]);

  if (!atendimento) return null;

  const handleSaveNote = () => {
    // In a real app, this would update the backend
    toast.success('Anotação salva com sucesso!');
    // Simulate updating the parent state/mock data
    if (onUpdate) {
        onUpdate({ ...atendimento, anotacoes: noteText });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out border-l border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-start justify-between mb-4">
             <div className="flex gap-3 sm:gap-4 items-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-xl sm:text-2xl font-bold">
                    {atendimento.cliente.charAt(0)}
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white line-clamp-2">{atendimento.cliente}</h2> {/* Allow 2 lines */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                        ${atendimento.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${atendimento.status === 'Agendado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${atendimento.status === 'Finalizado' ? 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-400' : ''}
                        ${atendimento.status === 'Cancelado' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                    `}>
                        {atendimento.status}
                    </span>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors">
                <X size={20} />
             </button>
          </div>

          <div className="flex gap-2">
            <a 
                href={`https://wa.me/${atendimento.telefone ? atendimento.telefone.replace(/\D/g, '') : ''}`}
                target="_blank" 
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-green-500/20"
            >
                <MessageCircle size={18} /> WhatsApp
            </a>
            <a 
                href={`https://instagram.com/`}
                target="_blank" 
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity shadow-sm"
            >
                <MessageCircle size={18} /> Instagram
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button 
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
                Detalhes
            </button>
            <button 
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
                Timeline
            </button>
            <button 
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
                Anotações
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            
            {activeTab === 'details' && (
                <div className="space-y-6">
                    <div className="grid gap-4">
                        <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                            <Mail className="text-zinc-400 shrink-0" size={18} />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-zinc-500">E-mail</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white break-words">{atendimento.email || 'Não informado'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                            <Phone className="text-zinc-400 shrink-0" size={18} />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-zinc-500">Telefone</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white break-words">{atendimento.telefone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                            <Calendar className="text-zinc-400 shrink-0" size={18} />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-zinc-500">Data de Início</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                    {new Date(atendimento.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                         <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                            <User className="text-zinc-400 shrink-0" size={18} />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-zinc-500">Canal de Origem</p>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{atendimento.canal}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'timeline' && (
                <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-2 sm:ml-3 space-y-8">
                    {atendimento.timeline && atendimento.timeline.map((event, index) => (
                        <div key={index} className="relative pl-4 sm:pl-6">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border-2 border-red-500"></div>
                            <div className="flex flex-col">
                                <span className="text-xs text-zinc-500 mb-1">
                                    {new Date(event.data).toLocaleString('pt-BR')}
                                </span>
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">{event.descricao}</p>
                                <span className="text-xs text-zinc-500 uppercase tracking-wider mt-1 font-bold">{event.tipo}</span>
                            </div>
                        </div>
                    ))}
                    {!atendimento.timeline && (
                         <p className="text-sm text-zinc-500 italic pl-6">Nenhum histórico registrado.</p>
                    )}
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="h-full flex flex-col">
                    <textarea 
                        className="flex-1 w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                        placeholder="Escreva uma anotação sobre este cliente..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                    ></textarea>
                    <button 
                        onClick={handleSaveNote}
                        className="mt-4 w-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 text-white dark:text-zinc-900 py-2 rounded-lg font-medium transition-colors"
                    >
                        Salvar Anotação
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}
