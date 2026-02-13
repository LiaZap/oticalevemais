import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { fetchTeam } from '../lib/api';
import { Plus, Search, Filter, MoreVertical, Shield, User, Mail, Calendar } from 'lucide-react';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { fetchTeam, createUser, updateUser, deleteUser } from '../lib/api';
import { Plus, Search, Filter, MoreVertical, Shield, User, Mail, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function Team() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    
    // Form State
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        cargo: 'Vendedor',
        status: 'Ativo',
        senha: ''
    });

    useEffect(() => {
        loadTeam();
    }, []);

    const loadTeam = async () => {
        try {
            setLoading(true);
            const data = await fetchTeam();
            // Map backend roles to frontend display
            const mappedData = data.map(user => ({
                ...user,
                cargo: mapRoleToLabel(user.role)
            }));
            setMembers(mappedData);
        } catch (error) {
            console.error('Erro ao carregar equipe:', error);
            toast.error('Erro ao carregar equipe.');
        } finally {
            setLoading(false);
        }
    };

    const mapRoleToLabel = (role) => {
        const map = {
            'admin': 'Administrador',
            'gestor': 'Gerente',
            'vendedor': 'Vendedor'
        };
        return map[role] || role;
    };

    const mapLabelToRole = (label) => {
        const map = {
            'Administrador': 'admin',
            'Gerente': 'gestor',
            'Vendedor': 'vendedor'
        };
        return map[label] || 'vendedor';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEdit = (member) => {
        setIsEditing(true);
        setSelectedMember(member);
        setFormData({
            nome: member.nome,
            email: member.email,
            cargo: member.cargo,
            status: member.status || 'Ativo',
            senha: '' // Password is empty on edit (optional to change)
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
        
        try {
            await deleteUser(id);
            toast.success('Usuário removido com sucesso!');
            loadTeam();
        } catch (error) {
            console.error('Erro ao remover usuário:', error);
            toast.error('Erro ao remover usuário.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Prepare payload
        const payload = {
            nome: formData.nome,
            email: formData.email,
            role: mapLabelToRole(formData.cargo),
            status: formData.status,
            senha: formData.senha
        };

        try {
            if (isEditing) {
                if (!payload.senha) delete payload.senha; // Don't send empty password on update
                await updateUser(selectedMember.id, payload);
                toast.success('Usuário atualizado com sucesso!');
            } else {
                if (!payload.senha) {
                    toast.error('A senha é obrigatória para novos usuários.');
                    return;
                }
                await createUser(payload);
                toast.success('Usuário criado com sucesso!');
            }
            
            setShowModal(false);
            resetForm();
            loadTeam();

        } catch (error) {
            console.error('Erro ao salvar usuário:', error);
            toast.error(error.response?.data?.message || 'Erro ao salvar usuário.');
        }
    };

    const resetForm = () => {
        setFormData({ nome: '', email: '', cargo: 'Vendedor', status: 'Ativo', senha: '' });
        setIsEditing(false);
        setSelectedMember(null);
    };

    const filteredMembers = members.filter(member => 
        member.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Sidebar>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gestão de Equipe</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">Gerencie o acesso e funções dos colaboradores</p>
                    </div>
                    <button 
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        <span>Adicionar Membro</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou email..." 
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Membro</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cargo</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-zinc-500">Carregando...</td>
                                    </tr>
                                ) : filteredMembers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-zinc-500">Nenhum membro encontrado.</td>
                                    </tr>
                                ) : (
                                    filteredMembers.map((member) => (
                                        <tr key={member.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold">
                                                        {member.nome.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-zinc-900 dark:text-white">{member.nome}</p>
                                                        <p className="text-xs text-zinc-500">{member.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Shield size={14} className="text-zinc-400" />
                                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{member.cargo}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    member.status === 'Ativo' 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                                        : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
                                                }`}>
                                                    {member.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEdit(member)}
                                                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-blue-500"
                                                        title="Editar"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(member.id)}
                                                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-500"
                                                        title="Remover"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal Novo/Editar Membro */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                {isEditing ? 'Editar Membro' : 'Adicionar Membro'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                                <span className="sr-only">Fechar</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Corporativo</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                    placeholder="Ex: joao@otica.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cargo</label>
                                    <select
                                        name="cargo"
                                        value={formData.cargo}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                    >
                                        <option value="Vendedor">Vendedor</option>
                                        <option value="Gerente">Gerente</option>
                                        <option value="Administrador">Administrador</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                    >
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    {isEditing ? 'Nova Senha (opcional)' : 'Senha'}
                                </label>
                                <input
                                    type="password"
                                    name="senha"
                                    value={formData.senha}
                                    onChange={handleInputChange}
                                    placeholder={isEditing ? "Deixe em branco para manter" : "Senha de acesso"}
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 bg-transparent text-zinc-900 dark:text-white"
                                />
                                {isEditing && (
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Preencha apenas se quiser alterar a senha do usuário.
                                    </p>
                                )}
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
                                    {isEditing ? 'Atualizar' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Sidebar>
    );
}
