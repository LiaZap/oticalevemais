const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

// Listar todos os usuários — PROTEGIDO
router.get('/', auth, async (req, res) => {
    try {
        const result = await db.query('SELECT id, nome, email, role, criado_em, status FROM tb_usuarios ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('[Users] List error:', err.message);
        res.status(500).json({ message: 'Erro ao listar usuários' });
    }
});

// Criar novo usuário — PROTEGIDO
router.post('/', auth, async (req, res) => {
    const { nome, email, senha, role, status } = req.body;
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanNome = nome ? nome.trim() : '';

    if (!cleanNome || !cleanEmail || !senha || !role) {
        return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ message: 'Formato de email inválido.' });
    }

    const validRoles = ['admin', 'gestor', 'vendedor'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Role inválido. Use: admin, gestor ou vendedor.' });
    }

    if (senha.length < 6) {
        return res.status(400).json({ message: 'Senha deve ter no mínimo 6 caracteres.' });
    }

    try {
        const userExist = await db.query('SELECT id FROM tb_usuarios WHERE email = $1', [cleanEmail]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'Usuário já cadastrado com este email.' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const newUser = await db.query(
            'INSERT INTO tb_usuarios (nome, email, senha_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, role, status',
            [cleanNome, cleanEmail, senhaHash, role, status || 'Ativo']
        );

        res.json(newUser.rows[0]);
    } catch (err) {
        console.error('[Users] Create error:', err.message);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Usuário já cadastrado com este email.' });
        }
        res.status(500).json({ message: 'Erro ao criar usuário' });
    }
});

// Atualizar usuário — PROTEGIDO + Validação dinâmica
router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    const { nome, email, role, status, senha } = req.body;

    if (!nome && !email && !role && !status && !senha) {
        return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
    }

    try {
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (nome !== undefined && nome !== null) {
            updates.push(`nome = $${paramCount}`); values.push(nome.trim()); paramCount++;
        }
        if (email !== undefined && email !== null) {
            updates.push(`email = $${paramCount}`); values.push(email.trim().toLowerCase()); paramCount++;
        }
        if (role !== undefined && role !== null) {
            const validRoles = ['admin', 'gestor', 'vendedor'];
            if (!validRoles.includes(role)) return res.status(400).json({ message: 'Role inválido.' });
            updates.push(`role = $${paramCount}`); values.push(role); paramCount++;
        }
        if (status !== undefined && status !== null) {
            updates.push(`status = $${paramCount}`); values.push(status); paramCount++;
        }
        if (senha && senha.trim() !== '') {
            if (senha.length < 6) return res.status(400).json({ message: 'Senha deve ter no mínimo 6 caracteres.' });
            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash(senha, salt);
            updates.push(`senha_hash = $${paramCount}`); values.push(senhaHash); paramCount++;
        }

        if (updates.length === 0) return res.status(400).json({ message: 'Nenhum campo válido.' });

        const query = `UPDATE tb_usuarios SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, nome, email, role, status`;
        values.push(id);

        const updatedUser = await db.query(query, values);
        if (updatedUser.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });

        res.json(updatedUser.rows[0]);
    } catch (err) {
        console.error('[Users] Update error:', err.message);
        res.status(500).json({ message: 'Erro ao atualizar usuário' });
    }
});

// Deletar usuário — PROTEGIDO
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM tb_usuarios WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });
        res.json({ message: 'Usuário removido com sucesso' });
    } catch (err) {
        console.error('[Users] Delete error:', err.message);
        res.status(500).json({ message: 'Erro ao remover usuário' });
    }
});

module.exports = router;
