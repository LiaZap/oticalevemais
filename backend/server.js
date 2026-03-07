const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Configuração do CORS para permitir requisições do frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', 
    credentials: true
}));

app.use(express.json());

// Servir uploads como arquivos estáticos (para Uazapi baixar as mídias)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});

// Services
const whatsappService = require('./services/whatsappService');

// Initialize WhatsApp Service (Uazapi)
whatsappService.initialize(io);

// Rotas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');
const whatsappRoutes = require('./routes/whatsapp');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', require('./routes/users'));
app.use('/api/atendimentos', require('./routes/atendimentos'));
app.use('/api/relatorios', require('./routes/relatorios'));
app.use('/api/whatsapp', whatsappRoutes);

app.get('/api/test-cron', async (req, res) => {
    try {
        const followupJob = require('./cron/followupJob');
        await followupJob.runFollowUpCheck();
        res.json({ message: 'Cron job executado manualmente com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    
    // Iniciar Cron Jobs
    const followupJob = require('./cron/followupJob');
    followupJob.start();
});
