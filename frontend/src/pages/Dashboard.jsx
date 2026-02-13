import React, { useEffect, useState } from 'react';
import { fetchDashboardKPIs } from '../lib/api';
import { KPICard } from '../components/KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, MessageCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Simulate a slight delay to show off the skeleton loading
                await new Promise(resolve => setTimeout(resolve, 1000));
                const kpis = await fetchDashboardKPIs();
                setData(kpis);
            } catch (error) {
                console.error("Erro ao buscar dados", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    // Helper to identify data safety
    const volumeTotal = data ? data.volume.reduce((acc, curr) => acc + parseInt(curr.total_atendimentos), 0) : 0;
    const conversionRate = data?.conversao?.taxa_conversao_geral_percentual || 0;
    const followupRate = data?.followup?.taxa_conversao_followup_percentual || 0;
    const retentionCount = data?.retencao?.length || 0;

    return (
        <Sidebar>
            <div className="space-y-6 pb-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">Dashboard Gerencial</h1>
                        <p className="text-sm md:text-base text-zinc-500">Acompanhamento em tempo real da Ótica Leve +</p>
                    </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <KPICard 
                        title="Volume (30d)" 
                        value={volumeTotal} 
                        icon={Users}
                        description="Total de atendimentos iniciados"
                        loading={loading}
                        trend="up"
                        trendValue="+12%"
                    />
                    <KPICard 
                        title="Conversão Real" 
                        value={`${conversionRate}%`} 
                        icon={CheckCircle}
                        description="Atendimentos que viraram agendamento"
                        loading={loading}
                        trend="up"
                        trendValue="+5%"
                        variant="success"
                    />
                    <KPICard 
                        title="Recuperação Follow-up" 
                        value={`${followupRate}%`} 
                        icon={MessageCircle}
                        description="Respostas após mensagem automática"
                        loading={loading}
                        trend="neutral"
                        trendValue="0%"
                        variant="warning"
                    />
                    <KPICard 
                        title="Oportunidades Perdidas" 
                        value={retentionCount} 
                        icon={AlertTriangle}
                        description="Clientes recentes que não agendaram"
                        loading={loading}
                        variant="danger"
                        trend="down"
                        trendValue="+2"
                        onClick={() => console.log('Navigate to prevention list')}
                        className="cursor-pointer"
                    />
                </div>

                {/* Charts Row */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="h-80 bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse">
                             <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-4"></div>
                             <div className="h-64 bg-zinc-100 dark:bg-zinc-800/50 rounded"></div>
                        </div>
                        <div className="h-80 bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 animate-pulse">
                             <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded mb-4"></div>
                             <div className="bg-zinc-100 dark:bg-zinc-800/50 rounded-full w-64 h-64 mx-auto"></div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        {/* Volume por Hora */}
                        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">Demanda por Horário</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.volume || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
                                        <XAxis dataKey="hora_do_dia" tick={{fontSize: 12}} />
                                        <YAxis tick={{fontSize: 12}} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                        />
                                        <Bar dataKey="total_atendimentos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Intenções */}
                        <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">Classificação de Assuntos</h3>
                            <div className="h-64 flex justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.intencao || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="quantidade"
                                            nameKey="motivo"
                                        >
                                            {data?.intencao?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {data?.intencao?.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                        <span className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400">{entry.motivo} ({entry.quantidade})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Retention Table */}
                {loading ? (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-pulse">
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="h-6 w-64 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                        </div>
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Lista de Retenção (Últimos 7 dias)</h3>
                            <p className="text-sm text-zinc-500">Contatos que interagiram mas não agendaram. Ligar para recuperar.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3">Cliente</th>
                                        <th className="px-4 md:px-6 py-3">Telefone</th>
                                        <th className="px-4 md:px-6 py-3">Data Contato</th>
                                        <th className="px-4 md:px-6 py-3">Intenção</th>
                                        <th className="px-4 md:px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.retencao?.map((item) => (
                                        <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                            <td className="px-4 md:px-6 py-4 font-medium text-zinc-900 dark:text-white">
                                                {item.nome}
                                            </td>
                                            <td className="px-4 md:px-6 py-4 font-mono text-zinc-600 dark:text-zinc-400">{item.telefone}</td>
                                            <td className="px-4 md:px-6 py-4 text-zinc-600 dark:text-zinc-400">{item.data_contato}</td>
                                            <td className="px-4 md:px-6 py-4">
                                                <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                    {item.intencao_detectada || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 md:px-6 py-4">
                                                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium">
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Sidebar>
    );
}
