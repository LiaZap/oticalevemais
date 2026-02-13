import axios from 'axios';
import { 
    mockLogin, 
    mockFetchKPIs, 
    mockFetchAtendimentos, 
    mockFetchRelatorios, 
    mockFetchTeam,
    addMockAtendimento,
    updateMockAtendimentoStatus 
} from './mockData';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', 
});

// Flag to force mock mode if backend is down
const USE_MOCK = true;

// Interceptor para adicionar o token JWT em todas as requisições
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['x-auth-token'] = token;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Mock wrapper
export const loginUser = async (credentials) => {
    if (USE_MOCK) return mockLogin(credentials);
    try {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    } catch (error) {
        console.warn("Backend failed, falling back to mock");
        return mockLogin(credentials);
    }
};
  
export const fetchDashboardKPIs = async () => {
    if (USE_MOCK) return mockFetchKPIs();
    try {
        const response = await api.get('/dashboard/kpis');
        return response.data;
    } catch (error) {
        console.warn("Backend failed, falling back to mock");
        return mockFetchKPIs();
    }
};

export const fetchAtendimentos = async () => {
    if (USE_MOCK) return mockFetchAtendimentos();
    try {
        const response = await api.get('/atendimentos');
        return response.data;
    } catch (error) {
        console.warn("Backend failed, falling back to mock");
        return mockFetchAtendimentos();
    }
};

export const createAtendimento = async (atendimento) => {
    if (USE_MOCK) return addMockAtendimento(atendimento);
    try {
        const response = await api.post('/atendimentos', atendimento);
        return response.data;
    } catch (error) {
         console.warn("Backend failed, falling back to mock");
         return addMockAtendimento(atendimento);
    }
}

export const updateAtendimentoStatus = async (id, status) => {
    if (USE_MOCK) return updateMockAtendimentoStatus(id, status);
    try {
        const response = await api.patch(`/atendimentos/${id}/status`, { status });
        return response.data;
    } catch (error) {
        console.warn("Backend failed, falling back to mock");
        return updateMockAtendimentoStatus(id, status);
    }
}

export const fetchRelatorios = async () => {
    if (USE_MOCK) return mockFetchRelatorios();
    try {
        const response = await api.get('/relatorios');
        return response.data;
    } catch (error) {
        console.warn("Backend failed, falling back to mock");
        return mockFetchRelatorios();
    }
};

// Settings API
export const fetchSettings = async () => {
    // Note: Config API doesn't use mock data to ensure persistence
    try {
        const response = await api.get('/settings');
        return response.data;
    } catch (error) {
        console.warn("Backend failed to fetch settings");
        return { FOLLOWUP_MSG: '' };
    }
};

export const saveSettings = async (key, value) => {
    try {
        const response = await api.post('/settings', { key, value });
        return response.data;
    } catch (error) {
        console.error("Backend failed to save settings");
        throw error;
    }
};

export const fetchTeam = async () => {
    if (USE_MOCK) return mockFetchTeam();
    try {
        const response = await api.get('/team');
        return response.data;
    } catch (error) {
        console.warn("Backend failed, falling back to mock");
        return mockFetchTeam();
    }
};

export default api;
