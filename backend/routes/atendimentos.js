const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to calculate age and lens classification
const calculateLensType = (dataNascimento) => {
    if (!dataNascimento) return null;
    
    const birthDate = new Date(dataNascimento);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age >= 40 ? 'Multifocal' : 'Simples';
};

// LISTAR todos os atendimentos
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tb_atendimentos ORDER BY data_inicio DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor');
    }
});

// CRIAR novo atendimento
router.post('/', async (req, res) => {
    const { cliente, telefone, canal, tipo, data_nascimento, status } = req.body;

    // Calcular classificação automática
    const classificacao_lente = calculateLensType(data_nascimento);

    try {
        const query = `
            INSERT INTO tb_atendimentos 
            (cliente, telefone_cliente, canal_entrada, tipo_servico, data_nascimento, classificacao_lente, status, data_inicio) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
            RETURNING *
        `;
        
        const values = [
            cliente, 
            telefone, 
            canal || 'WhatsApp', 
            tipo || 'Orçamento', 
            data_nascimento || null, 
            classificacao_lente, 
            status || 'Pendente'
        ];

        const newAtendimento = await db.query(query, values);
        res.json(newAtendimento.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Erro ao criar atendimento: ' + err.message });
    }
});

// ATUALIZAR status ou detalhes
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { status, classificacao_lente } = req.body;

    try {
        let query = 'UPDATE tb_atendimentos SET ';
        const values = [];
        let paramCount = 1;

        if (status) {
            query += `status = $${paramCount}, `;
            values.push(status);
            paramCount++;
        }

        if (classificacao_lente) {
            query += `classificacao_lente = $${paramCount}, `;
            values.push(classificacao_lente);
            paramCount++;
        }

        // Remove trailing comma and space
        query = query.slice(0, -2);
        
        query += ` WHERE id = $${paramCount} RETURNING *`;
        values.push(id);

        const update = await db.query(query, values);
        
        if (update.rows.length === 0) {
            return res.status(404).json({ message: 'Atendimento não encontrado' });
        }

        res.json(update.rows[0]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro ao atualizar atendimento');
    }
});

module.exports = router;
