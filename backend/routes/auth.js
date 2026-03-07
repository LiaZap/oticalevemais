const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Rota de Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM tb_usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const isMatch = await bcrypt.compare(password, user.senha_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor');
    }
});

// ============================================
// ROTA TEMPORÁRIA — Reset de Senha (REMOVER EM PRODUÇÃO)
// ============================================
router.post('/reset-password', async (req, res) => {
    try {
        const email = 'admin@oticalevemais.com.br';
        const newPassword = 'admin123';

        // Verifica se o usuário existe
        const check = await db.query('SELECT id, email, nome, senha_hash FROM tb_usuarios WHERE email = $1', [email]);

        if (check.rows.length === 0) {
            // Lista todos os usuários para debug
            const allUsers = await db.query('SELECT id, email, nome FROM tb_usuarios');
            return res.json({
                error: 'Usuário não encontrado',
                email_buscado: email,
                usuarios_existentes: allUsers.rows
            });
        }

        const user = check.rows[0];
        const oldHash = user.senha_hash;

        // Gera novo hash
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        // Atualiza no banco
        await db.query('UPDATE tb_usuarios SET senha_hash = $1 WHERE email = $2', [newHash, email]);

        // Testa se o novo hash funciona
        const testMatch = await bcrypt.compare(newPassword, newHash);

        res.json({
            success: true,
            message: 'Senha resetada com sucesso',
            user_id: user.id,
            email: user.email,
            nome: user.nome,
            old_hash_preview: oldHash ? oldHash.substring(0, 20) + '...' : 'NULL/EMPTY',
            new_hash_preview: newHash.substring(0, 20) + '...',
            test_password_match: testMatch
        });
    } catch (err) {
        console.error('Reset error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ROTA DEBUG — Ver estado do usuário (REMOVER EM PRODUÇÃO)
router.get('/debug-users', async (req, res) => {
    try {
        const result = await db.query('SELECT id, email, nome, role, senha_hash IS NOT NULL as has_hash, LENGTH(senha_hash) as hash_length FROM tb_usuarios');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
