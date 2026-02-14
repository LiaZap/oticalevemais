import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { fetchAtendimentos, createAtendimento } from '../lib/api';
import { Search, Filter, Plus, Phone, Calendar, User, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { sendToN8N } from '../lib/n8n';
import { KanbanBoard } from '../components/KanbanBoard';
import { LayoutGrid, List } from 'lucide-react';
import CustomerDetailsDrawer from '../components/CustomerDetailsDrawer';

export default function Atendimentos() {
    const [atendimentos, setAtendimentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    useEffect(() => {
        loadAtendimentos();
    }, []);

    const loadAtendimentos = async () => {
        try {
            const data = await fetchAtendimentos();
            setAtendimentos(data);
        } catch (error) {
            console.error('Erro ao carregar atendimentos:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pendente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'Em Andamento': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'Agendado': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'Finalizado': return 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-400';
            case 'Cancelado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-zinc-100 text-zinc-800';
        }
    };

    // Função para atualizar status e disparar webhook
    const handleStatusChange = async (id, newStatus) => {
        const atendimento = atendimentos.find(a => a.id === id);
        if (!atendimento || atendimento.status === newStatus) return;

        // Atualiza UI otimista
        const updatedAtendimentos = atendimentos.map(item => 
            item.id === id ? { ...item, status: newStatus } : item
        );
        setAtendimentos(updatedAtendimentos);

        // Dispara Webhook
        await sendToN8N('STATUS_UPDATE', { 
            id, 
            cliente: atendimento.cliente,
            old_status: atendimento.status, 
            new_status: newStatus 
        });
    };

    const [lensFilter, setLensFilter] = useState('Todos');

    const filteredAtendimentos = atendimentos.filter(atendimento => {
        const matchesSearch = 
            atendimento.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            atendimento.telefone.includes(searchTerm);
        const matchesStatus = statusFilter === 'Todos' || atendimento.status === statusFilter;
        const matchesLens = lensFilter === 'Todos' || atendimento.classificacao_lente === lensFilter;
        return matchesSearch && matchesStatus && matchesLens;
    });

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        cliente: '',
        telefone: '',
        canal: 'WhatsApp',
        tipo: 'Orçamento',
        data_nascimento: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Using the real API via createAtendimento imported from ../lib/api helpers (which we need to import or ensure logic matches)
            // Wait, we need to import createAtendimento. 
            // Checking imports... createAtendimento is not imported in original file.
            // But let's assume we will fix imports. 
            // For now, let's just make sure we send the data.
            
            // Actually, looking at original file, it was manually constructing the object and setting state.
            // We need to change this to call the API.
            
            const newAtendimento = {
                ...formData,
                status: 'Pendente'
            };
            
            // Call API
            const savedAtendimento = await createAtendimento(newAtendimento);
            
            setAtendimentos([savedAtendimento, ...atendimentos]);
            setShowModal(false);
            setFormData({ cliente: '', telefone: '', canal: 'WhatsApp', tipo: 'Orçamento', data_nascimento: '' });

            toast.success('Atendimento criado com sucesso!');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao criar atendimento.');
        }
    };

    return (
        <Sidebar>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gestão de Atendimentos</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">Acompanhe e gerencie os atendimentos da ótica</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                                title="Visualização em Lista"
                            >
                                <List size={20} />
                            </button>
                            <button 
                                onClick={() => setViewMode('kanban')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
                                title="Visualização em Quadro (Kanban)"
                            >
                                <LayoutGrid size={20} />
                            </button>
                        </div>

                        <button 
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={20} />
                            <span>Novo Atendimento</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente ou telefone..." 
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {viewMode === 'list' && (
                        <div className="flex items-center gap-2">
                            <Filter className="text-zinc-400" size={18} />
                            <select 
                                className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="Todos">Todos os Status</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Agendado">Agendado</option>
                                <option value="Finalizado">Finalizado</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                            
                            <select 
                                className="border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                value={lensFilter}
                                onChange={(e) => setLensFilter(e.target.value)}
                            >
                                <option value="Todos">Todas as Lentes</option>
                                <option value="Simples">Simples</option>
                                <option value="Multifocal">Multifocal</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Content: List or Kanban */}
                {viewMode === 'kanban' ? (
                    <KanbanBoard 
                        atendimentos={filteredAtendimentos} 
                        onStatusChange={handleStatusChange}
                        onCardClick={(item) => setSelectedCustomer(item)}
                    />
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contato</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Canal</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Lente</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-zinc-500">Carregando...</td>
                                        </tr>
                                    ) : filteredAtendimentos.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-zinc-500">Nenhum atendimento encontrado.</td>
                                        </tr>
                                    ) : (
                                        filteredAtendimentos.map((atendimento) => (
                                            <tr 
                                                key={atendimento.id} 
                                                onClick={() => setSelectedCustomer(atendimento)}
                                                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs">
                                                            {atendimento.cliente.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-zinc-900 dark:text-white">{atendimento.cliente}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
                                                    {atendimento.telefone}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                                        {atendimento.canal === 'WhatsApp' && <MessageCircle size={16} className="text-green-500" />}
                                                        {atendimento.canal === 'Instagram' && <div className="w-4 h-4 rounded bg-gradient-to-tr from-yellow-400 to-purple-600" />}
                                                        {atendimento.canal === 'Telefone' && <Phone size={16} />}
                                                        {atendimento.canal}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <select 
                                                        value={atendimento.status}
                                                        onClick={(e) => e.stopPropagation()} // Prevent row click when changing status
                                                        onChange={(e) => handleStatusChange(atendimento.id, e.target.value)}
                                                        className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 outline-none cursor-pointer ${getStatusColor(atendimento.status)}`}
                                                    >
                                                        <option value="Pendente" className="bg-white text-zinc-900">Pendente</option>
                                                        <option value="Em Andamento" className="bg-white text-zinc-900">Em Andamento</option>
                                                        <option value="Agendado" className="bg-white text-zinc-900">Agendado</option>
                                                        <option value="Finalizado" className="bg-white text-zinc-900">Finalizado</option>
                                                        <option value="Cancelado" className="bg-white text-zinc-900">Cancelado</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {atendimento.classificacao_lente && (
                                                        <span className={`text-xs font-medium px-2 py-1 rounded-md border ${
                                                            atendimento.classificacao_lente === 'Multifocal' 
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' 
                                                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                                        }`}>
                                                            {atendimento.classificacao_lente}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-zinc-400 hover:text-red-600 transition-colors">
                                                        Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <CustomerDetailsDrawer 
                atendimento={selectedCustomer} 
                onClose={() => setSelectedCustomer(null)} 
            />

            {/* Modal Novo Atendimento */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Novo Atendimento</h2>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                <span className="sr-only">Fechar</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome do Cliente</label>
                                <input
                                    type="text"
                                    name="cliente"
                                    value={formData.cliente}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                    placeholder="Ex: Maria Silva"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Telefone</label>
                                <input
                                    type="tel"
                                    name="telefone"
                                    value={formData.telefone}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                    placeholder="Ex: 11999887766"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Data de Nascimento</label>
                                <input
                                    type="date"
                                    name="data_nascimento"
                                    value={formData.data_nascimento}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                />
                                <p className="text-xs text-zinc-500 mt-1">Necessário para classificação automática (Simples/Multifocal)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Canal</label>
                                    <select
                                        name="canal"
                                        value={formData.canal}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                    >
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="Telefone">Telefone</option>
                                        <option value="Presencial">Presencial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tipo</label>
                                    <select
                                        name="tipo"
                                        value={formData.tipo}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                    >
                                        <option value="Orçamento">Orçamento</option>
                                        <option value="Agendamento">Agendamento</option>
                                        <option value="Dúvidas">Dúvidas</option>
                                        <option value="Reclamação">Reclamação</option>
                                        <option value="Retorno">Retorno</option>
                                        <option value="Compra">Compra</option>
                                        <option value="Exame de Vista">Exame de Vista</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Sidebar>
    );
}
