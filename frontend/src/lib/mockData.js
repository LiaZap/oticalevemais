// Initial Data
const INITIAL_DATA = {
  // Structure matching exactly what Dashboard.jsx expects from /api/dashboard/kpis
  volume: [
    { hora_do_dia: '08:00', total_atendimentos: 12 },
    { hora_do_dia: '09:00', total_atendimentos: 19 },
    { hora_do_dia: '10:00', total_atendimentos: 25 },
    { hora_do_dia: '11:00', total_atendimentos: 32 },
    { hora_do_dia: '12:00', total_atendimentos: 18 },
    { hora_do_dia: '13:00', total_atendimentos: 22 },
    { hora_do_dia: '14:00', total_atendimentos: 28 },
    { hora_do_dia: '15:00', total_atendimentos: 35 },
    { hora_do_dia: '16:00', total_atendimentos: 29 },
    { hora_do_dia: '17:00', total_atendimentos: 15 },
    { hora_do_dia: '18:00', total_atendimentos: 10 },
  ],
  conversao: {
    taxa_conversao_geral_percentual: 42.8
  },
  followup: {
    taxa_conversao_followup_percentual: 68.5
  },
  intencao: [
    { motivo: "Agendamento", quantidade: 85 },
    { motivo: "Orçamento", quantidade: 42 },
    { motivo: "Dúvidas", quantidade: 27 },
    { motivo: "Reclamação", quantidade: 5 },
    { motivo: "Outros", quantidade: 12 }
  ],
  atendimentos: [
    { 
        id: 1, 
        cliente: "João da Silva", 
        telefone: "11999887766", 
        data_inicio: "2024-02-12T10:00:00", 
        status: "Pendente", 
        canal: "WhatsApp", 
        tipo: "Orçamento",
        email: "joao.silva@email.com",
        anotacoes: "Cliente interessado em armação de metal. Prefere contato à tarde.",
        timeline: [
            { data: "2024-02-12T10:00:00", tipo: "criação", descricao: "Atendimento iniciado via WhatsApp" },
            { data: "2024-02-12T10:05:00", tipo: "nota", descricao: "Solicitou catálogo de Ray-Ban" }
        ]
    },
    { 
        id: 2, 
        cliente: "Maria Oliveira", 
        telefone: "11988776655", 
        data_inicio: "2024-02-12T11:30:00", 
        status: "Agendado", 
        canal: "Instagram", 
        tipo: "Exame de Vista",
        email: "maria.oli@email.com",
        anotacoes: "",
        timeline: [
            { data: "2024-02-12T11:30:00", tipo: "criação", descricao: "Contato inicial via Instagram" },
            { data: "2024-02-12T14:00:00", tipo: "status", descricao: "Status alterado para Agendado" }
        ]
    },
    { 
        id: 3, 
        cliente: "Carlos Souza", 
        telefone: "11977665544", 
        data_inicio: "2024-02-11T14:00:00", 
        status: "Finalizado", 
        canal: "Presencial", 
        tipo: "Compra",
        email: "carlos.souza@email.com",
        anotacoes: "Comprou lente multifocal Varilux.",
        timeline: [
            { data: "2024-02-11T14:00:00", tipo: "criação", descricao: "Cliente veio à loja" },
            { data: "2024-02-11T15:30:00", tipo: "status", descricao: "Venda finalizada" }
        ]
    },
    { 
        id: 4, 
        cliente: "Ana Costa", 
        telefone: "11966554433", 
        data_inicio: "2024-02-11T16:45:00", 
        status: "Cancelado", 
        canal: "WhatsApp", 
        tipo: "Dúvida",
        email: "ana.costa@email.com",
        anotacoes: "Achou o preço alto.",
        timeline: [
            { data: "2024-02-11T16:45:00", tipo: "criação", descricao: "Dúvida sobre garantia" },
            { data: "2024-02-12T09:00:00", tipo: "status", descricao: "Cancelado pelo cliente" }
        ]
    },
    { 
        id: 5, 
        cliente: "Pedro Santos", 
        telefone: "11955443322", 
        data_inicio: "2024-02-10T09:15:00", 
        status: "Pendente", 
        canal: "Telefone", 
        tipo: "Retorno",
        email: "pedro.s@email.com",
        anotacoes: "",
        timeline: [
            { data: "2024-02-10T09:15:00", tipo: "criação", descricao: "Ligou para agendar retorno" }
        ]
    },
  ],
  relatorios: {
    evolucao: [
      { data: '01/02', atendimentos: 12, vendas: 4 },
      { data: '02/02', atendimentos: 15, vendas: 6 },
      { data: '03/02', atendimentos: 10, vendas: 3 },
      { data: '04/02', atendimentos: 18, vendas: 8 },
      { data: '05/02', atendimentos: 20, vendas: 10 },
      { data: '06/02', atendimentos: 14, vendas: 5 },
      { data: '07/02', atendimentos: 22, vendas: 12 },
    ],
    canais: [
      { name: 'WhatsApp', value: 45, color: '#25D366' },
      { name: 'Instagram', value: 30, color: '#E1306C' },
      { name: 'Presencial', value: 15, color: '#9c0102' }, // Red branding
      { name: 'Telefone', value: 10, color: '#64748b' },
    ],
    funil: [
      { etapa: 'Atendimentos', valor: 120 },
      { etapa: 'Orçamentos', valor: 80 },
      { etapa: 'Vendas', valor: 45 },
    ]
  },
  equipe: [
    { id: 1, nome: "Paulo Admin", email: "paulo@otica.com", cargo: "Administrador", status: "Ativo", role: "admin" },
    { id: 2, nome: "Ana Silva", email: "ana@otica.com", cargo: "Gerente", status: "Ativo", role: "manager" },
    { id: 3, nome: "Carlos Vendedor", email: "carlos@otica.com", cargo: "Vendedor", status: "Ativo", role: "sales" },
    { id: 4, nome: "Beatriz Vendedora", email: "beatriz@otica.com", cargo: "Vendedor", status: "Inativo", role: "sales" },
  ]
};

// State Container
let currentData = { ...INITIAL_DATA };

// Helper to Reset Data (optional)
export const resetMockData = () => {
    currentData = { ...INITIAL_DATA };
};

// CRUD Helpers
export const addMockAtendimento = (atendimento) => {
    const newId = currentData.atendimentos.length > 0 ? Math.max(...currentData.atendimentos.map(a => a.id)) + 1 : 1;
    const newItem = { ...atendimento, id: newId };
    currentData.atendimentos = [newItem, ...currentData.atendimentos];

    // Simula atualização de KPIs em tempo real
    // Ex: Incrementa o volume da hora atual
    const currentHour = new Date().getHours();
    const hourString = `${currentHour.toString().padStart(2, '0')}:00`;
    const volumeIndex = currentData.volume.findIndex(v => v.hora_do_dia === hourString);
    
    if (volumeIndex >= 0) {
        currentData.volume[volumeIndex].total_atendimentos += 1;
    }

    return newItem;
};

export const updateMockAtendimentoStatus = (id, newStatus) => {
    currentData.atendimentos = currentData.atendimentos.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
    );
};


export const mockLogin = async (credentials) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        token: "mock-jwt-token-12345",
        user: { id: 1, name: "Admin Mock", email: credentials.email }
      });
    }, 500);
  });
};

export const mockFetchKPIs = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(currentData); // Returns the mutable currentData
    }, 300);
  });
};

export const mockFetchAtendimentos = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(currentData.atendimentos);
    }, 300);
  });
};

export const mockFetchRelatorios = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(currentData.relatorios);
    }, 300);
  });
};

export const mockFetchTeam = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(currentData.equipe);
    }, 300);
  });
};
