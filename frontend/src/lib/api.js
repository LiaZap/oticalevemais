import axios from 'axios';

// Read API URL: runtime config (docker) > build-time env > fallback
const RUNTIME_URL = typeof window !== 'undefined' && window.__RUNTIME_CONFIG__?.VITE_API_URL;
const BASE = RUNTIME_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
const api = axios.create({
    baseURL: BASE.endsWith('/api') ? BASE : `${BASE}/api`,
});

// Interceptor para adicionar o token JWT em todas as requisicoes
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const loginUser = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const fetchDashboardKPIs = async () => {
    try {
        const response = await api.get('/dashboard/kpis');
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar KPIs:", error);
        return {
            volume: [],
            intencao: [],
            followup: { taxa_conversao_followup_percentual: 0, enviados: 0, respondidos: 0 },
            conversao: { taxa_conversao_geral_percentual: 0, total: 0, agendados: 0 },
            retencao: [],
            vendas_por_tipo: []
        };
    }
};

export const fetchAtendimentos = async () => {
    const response = await api.get('/atendimentos');
    return response.data;
};

export const createAtendimento = async (atendimento) => {
    const response = await api.post('/atendimentos', atendimento);
    return response.data;
};

export const updateAtendimentoStatus = async (id, status) => {
    const response = await api.put(`/atendimentos/${id}`, { status });
    return response.data;
};

export const fetchRelatorios = async (periodo = '7days') => {
    try {
        const response = await api.get(`/relatorios?periodo=${periodo}`);
        return response.data;
    } catch (error) {
        console.error("Erro ao buscar relatorios:", error);
        return {
            evolucao: [],
            canais: [],
            vendas_por_tipo: [],
            funil: []
        };
    }
};

// Settings API
export const fetchSettings = async () => {
    try {
        const response = await api.get('/settings');
        return response.data;
    } catch (error) {
        console.warn("Erro ao buscar settings");
        return { FOLLOWUP_MSG: '' };
    }
};

export const saveSettings = async (key, value) => {
    const response = await api.post('/settings', { key, value });
    return response.data;
};

export const fetchTeam = async () => {
    const response = await api.get('/users');
    return response.data;
};

export const createUser = async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
};

export const updateUser = async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

export const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

export default api;
