const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// Listar todos os usuários
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, nome, email, role, criado_em, status FROM tb_usuarios ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor');
    }
});

// Criar novo usuário
router.post('/', async (req, res) => {
    const { nome, email, senha, role, status } = req.body;

    // Validação básica
    if (!nome || !email || !senha || !role) {
        return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
    }

    try {
        // Verificar se usuário já existe
        const userExist = await db.query('SELECT * FROM tb_usuarios WHERE email = $1', [email]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'Usuário já cadastrado com este email.' });
        }

        // Criptografar senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Inserir no banco
        // Nota: Assumo que a tabela tb_usuarios tenha a coluna 'status'. Se não tiver, precisaremos criar.
        // Vou verificar o schema primeiro ou adicionar a coluna se falhar, mas o user pediu "status" no frontend.
        // O schema original não tinha status, então vou adicionar essa coluna no banco também.
        
        const newUser = await db.query(
            'INSERT INTO tb_usuarios (nome, email, senha_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, role, status',
            [nome, email, senhaHash, role, status || 'Ativo']
        );

        res.json(newUser.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro ao criar usuário');
    }
});

// Atualizar usuário
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, role, status, senha } = req.body;

    try {
        let query = 'UPDATE tb_usuarios SET nome = $1, email = $2, role = $3, status = $4';
        let values = [nome, email, role, status];
        let paramCount = 5;

        // Se a senha foi fornecida, atualiza o hash
        if (senha && senha.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const senhaHash = await bcrypt.hash(senha, salt);
            query += `, senha_hash = $${paramCount}`;
            values.push(senhaHash);
            paramCount++;
        }

        query += ` WHERE id = $${paramCount} RETURNING id, nome, email, role, status`; // Corrected index for ID
        values.push(id);

        const updatedUser = await db.query(query, values);

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.json(updatedUser.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro ao atualizar usuário');
    }
});

// Deletar usuário
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM tb_usuarios WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.json({ message: 'Usuário removido com sucesso' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro ao remover usuário');
    }
});

module.exports = router;
