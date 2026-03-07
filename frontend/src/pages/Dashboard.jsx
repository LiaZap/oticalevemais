import React, { useEffect, useState } from 'react';
import { fetchDashboardKPIs } from '../lib/api';
import { KPICard } from '../components/KPICard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, MessageCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const kpis = await fetchDashboardKPIs();
                setData(kpis);
            } catch (error) {
                console.error("Erro ao buscar dados", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Compute values from real data
    const volumeTotal = data ? data.volume.reduce((acc, curr) => acc + parseInt(curr.total_atendimentos || 0), 0) : 0;

    const convTotal = data?.conversao?.total ? parseInt(data.conversao.total) : 0;
    const convAgendados = data?.conversao?.agendados ? parseInt(data.conversao.agendados) : 0;
    const conversionRate = convTotal > 0 ? ((convAgendados / convTotal) * 100).toFixed(1) : 0;

    const fupEnviados = data?.followup?.enviados ? parseInt(data.followup.enviados) : 0;
    const fupRespondidos = data?.followup?.respondidos ? parseInt(data.followup.respondidos) : 0;
    const followupRate = fupEnviados > 0 ? ((fupRespondidos / fupEnviados) * 100).toFixed(1) : 0;

    const retentionCount = data?.retencao?.length || 0;

    // Empty state message
    const isEmpty = !loading && volumeTotal === 0 && retentionCount === 0;

    return (
        <Sidebar>
            <div className="space-y-6 pb-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Dashboard Gerencial</h1>
                        <p className="text-sm md:text-base text-zinc-500">Acompanhamento em tempo real da Otica Leve +</p>
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
                    />
                    <KPICard
                        title="Conversao Real"
                        value={`${conversionRate}%`}
                        icon={CheckCircle}
                        description="Atendimentos que viraram agendamento"
                        loading={loading}
                        variant="success"
                    />
                    <KPICard
                        title="Recuperacao Follow-up"
                        value={`${followupRate}%`}
                        icon={MessageCircle}
                        description="Respostas apos mensagem automatica"
                        loading={loading}
                        variant="warning"
                    />
                    <KPICard
                        title="Oportunidades Perdidas"
                        value={retentionCount}
                        icon={AlertTriangle}
                        description="Clientes recentes que nao agendaram"
                        loading={loading}
                        variant="danger"
                    />
                </div>

                {/* Charts Row */}
                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        <div className="h-80 bg-white rounded-xl p-6 shadow-sm border border-zinc-200 animate-pulse">
                             <div className="h-6 w-48 bg-zinc-200 rounded mb-4"></div>
                             <div className="h-64 bg-zinc-100 rounded"></div>
                        </div>
                        <div className="h-80 bg-white rounded-xl p-6 shadow-sm border border-zinc-200 animate-pulse">
                             <div className="h-6 w-48 bg-zinc-200 rounded mb-4"></div>
                             <div className="bg-zinc-100 rounded-full w-64 h-64 mx-auto"></div>
                        </div>
                    </div>
                ) : isEmpty ? (
                    <div className="bg-white rounded-xl p-12 shadow-sm border border-zinc-200 text-center">
                        <Users className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-700 mb-2">Nenhum dado ainda</h3>
                        <p className="text-sm text-zinc-500">Os graficos aparecerao quando houver atendimentos registrados.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                        {/* Volume por Hora */}
                        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-zinc-200">
                            <h3 className="text-lg font-semibold mb-4 text-zinc-900">Demanda por Horario</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.volume || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                        <XAxis dataKey="hora_do_dia" tick={{fontSize: 12, fill: '#71717a'}} />
                                        <YAxis tick={{fontSize: 12, fill: '#71717a'}} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderColor: '#e4e4e7', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="total_atendimentos" name="Atendimentos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Intencoes */}
                        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-zinc-200">
                            <h3 className="text-lg font-semibold mb-4 text-zinc-900">Classificacao de Assuntos</h3>
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
                                        <span className="text-xs md:text-sm text-zinc-600">{entry.motivo} ({entry.quantidade})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Retention Table */}
                {loading ? (
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden animate-pulse">
                        <div className="p-6 border-b border-zinc-200">
                            <div className="h-6 w-64 bg-zinc-200 rounded"></div>
                        </div>
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 w-full bg-zinc-100 rounded"></div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-zinc-200">
                            <h3 className="text-lg font-semibold text-zinc-900">Lista de Retencao (Ultimos 7 dias)</h3>
                            <p className="text-sm text-zinc-500">Contatos que interagiram mas nao agendaram. Ligar para recuperar.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
                                    <tr>
                                        <th className="px-4 md:px-6 py-3">Cliente</th>
                                        <th className="px-4 md:px-6 py-3">Telefone</th>
                                        <th className="px-4 md:px-6 py-3">Data Contato</th>
                                        <th className="px-4 md:px-6 py-3">Intencao</th>
                                        <th className="px-4 md:px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.retencao?.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                                                Nenhuma oportunidade perdida nos ultimos 7 dias.
                                            </td>
                                        </tr>
                                    ) : (
                                        data?.retencao?.map((item) => (
                                            <tr key={item.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                                                <td className="px-4 md:px-6 py-4 font-medium text-zinc-900">
                                                    {item.cliente || item.nome || 'N/A'}
                                                </td>
                                                <td className="px-4 md:px-6 py-4 font-mono text-zinc-600">{item.telefone_cliente || item.telefone}</td>
                                                <td className="px-4 md:px-6 py-4 text-zinc-600">{item.data_contato}</td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <span className="px-2 py-1 bg-zinc-100 rounded-md text-xs font-medium text-zinc-700">
                                                        {item.intencao_detectada || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-6 py-4">
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                                        {item.status}
                                                    </span>
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
        </Sidebar>
    );
}
