const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// =============================================
// SEGURANÇA — Headers HTTP
// =============================================
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// =============================================
// CORS — Restrito ao frontend
// =============================================
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        callback(new Error('Bloqueado pelo CORS'));
    },
    credentials: true
}));

// =============================================
// BODY PARSER — Limite de 1MB
// =============================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// =============================================
// RATE LIMITING — Proteção contra abuso
// =============================================
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);

// Servir uploads como arquivos estáticos
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// Services
const whatsappService = require('./services/whatsappService');
whatsappService.initialize(io);

// Rotas
const auth = require('./middleware/auth');
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

// Test cron — PROTEGIDO
app.get('/api/test-cron', auth, async (req, res) => {
    try {
        const followupJob = require('./cron/followupJob');
        await followupJob.runFollowUpCheck();
        res.json({ message: 'Cron job executado manualmente com sucesso.' });
    } catch (error) {
        console.error('[Test-Cron] Error:', error.message);
        res.status(500).json({ error: 'Erro ao executar cron job' });
    }
});

// =============================================
// ERROR HANDLER GLOBAL
// =============================================
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err.message);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Erro interno do servidor'
            : err.message
    });
});

// =============================================
// GRACEFUL SHUTDOWN
// =============================================
const db = require('./db');

function gracefulShutdown(signal) {
    console.log(`[Server] ${signal} received. Shutting down...`);
    server.close(() => {
        console.log('[Server] HTTP server closed');
        db.end().then(() => {
            console.log('[Server] Database pool closed');
            process.exit(0);
        }).catch(() => process.exit(1));
    });
    setTimeout(() => {
        console.error('[Server] Forced shutdown');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    const followupJob = require('./cron/followupJob');
    followupJob.start();
});
