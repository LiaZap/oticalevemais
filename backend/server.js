const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS para permitir requisições do frontend
// Em produção no Easypanel, o frontend pode estar em outro domínio
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', 
    credentials: true
}));

app.use(express.json());

// Rotas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settings');

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', require('./routes/users'));

app.get('/api/test-cron', async (req, res) => {
    try {
        const followupJob = require('./cron/followupJob');
        await followupJob.runFollowUpCheck();
        res.json({ message: 'Cron job executado manualmente com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    
    // Iniciar Cron Jobs
    const followupJob = require('./cron/followupJob');
    followupJob.start();
});
