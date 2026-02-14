import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { fetchRelatorios } from '../lib/api';
import { Calendar, Download, TrendingUp, Users, Filter } from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    BarChart, Bar
} from 'recharts';

export default function Reports() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7days');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const result = await fetchRelatorios();
            setData(result);
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data) return;

        // Create CSV content
        const csvContent = "data:text/csv;charset=utf-8," 
            + "Data,Atendimentos,Vendas\n"
            + data.evolucao.map(e => `${e.data},${e.atendimentos},${e.vendas}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_vendas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };



    if (loading) {
        return (
            <Sidebar>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
            </Sidebar>
        );
    }

    return (
        <Sidebar>
            <div className="space-y-6 pb-6">
                {/* Header & Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">Relatórios Gerenciais</h1>
                        <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400">Análise detalhada de performance e resultados</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative">
                            <select 
                                className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-10 pr-8 py-2 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                            >
                                <option value="7days">Últimos 7 dias</option>
                                <option value="30days">Últimos 30 dias</option>
                                <option value="month">Este Mês</option>
                            </select>
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
                        </div>

                        <button 
                            onClick={handleExport}
                            className="flex justify-center items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <Download size={18} />
                            <span>Exportar CSV</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    {/* Evolução de Atendimentos & Vendas */}
                    <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="text-red-600" size={20} />
                                Evolução de Atendimentos vs Vendas
                            </h2>
                        </div>
                        <div className="h-64 md:h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.evolucao}>
                                    <defs>
                                        <linearGradient id="colorAtendimentos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                                    <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e4e4e7' }}
                                        itemStyle={{ color: '#18181b' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="atendimentos" name="Atendimentos" stroke="#ef4444" fillOpacity={1} fill="url(#colorAtendimentos)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="vendas" name="Vendas" stroke="#22c55e" fillOpacity={1} fill="url(#colorVendas)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Distribuição por Canal */}
                    <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                            <Users className="text-red-600" size={20} />
                            Origem dos Clientes
                        </h2>
                        <div className="h-64 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.canais}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data?.canais.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Funil de Conversão */}
                    <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                            <Filter className="text-red-600" size={20} />
                            Funil de Conversão
                        </h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.funil} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="etapa" type="category" width={100} tick={{fill: '#71717a', fontSize: 11}} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="valor" name="Quantidade" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </Sidebar>
    );
}
