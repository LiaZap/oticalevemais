const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Fallback if DATABASE_URL is not provided (local dev or legacy config)
    ...(process.env.DATABASE_URL ? {} : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    }),
    // Pool configuration
    max: 20, // máximo de conexões simultâneas
    idleTimeoutMillis: 30000, // fecha conexões ociosas após 30s
    connectionTimeoutMillis: 5000, // timeout para obter conexão: 5s
    // SSL para produção
    ...(process.env.DATABASE_URL && process.env.NODE_ENV === 'production' ? {
        ssl: { rejectUnauthorized: false }
    } : {})
});

// Error handler — evita crash em erros inesperados do pool
pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    end: () => pool.end(),
};
