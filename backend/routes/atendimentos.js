const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const calculateLensType = (dataNascimento) => {
    if (!dataNascimento) return null;
    const birthDate = new Date(dataNascimento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 40 ? 'Multifocal' : 'Simples';
};

// LISTAR atendimentos — PROTEGIDO + Paginação
router.get('/', auth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;

        const [dataResult, countResult] = await Promise.all([
            db.query('SELECT * FROM tb_atendimentos ORDER BY data_inicio DESC LIMIT $1 OFFSET $2', [limit, offset]),
            db.query('SELECT COUNT(*) FROM tb_atendimentos')
        ]);

        res.json({
            data: dataResult.rows,
            total: parseInt(countResult.rows[0].count),
            page, limit,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        });
    } catch (err) {
        console.error('[Atendimentos] List error:', err.message);
        res.status(500).json({ message: 'Erro ao listar atendimentos' });
    }
});

// CRIAR — PROTEGIDO
router.post('/', auth, async (req, res) => {
    const { cliente, telefone, canal, tipo, data_nascimento, status } = req.body;
    const classificacao_lente = calculateLensType(data_nascimento);

    try {
        const newAtendimento = await db.query(`
            INSERT INTO tb_atendimentos
            (cliente, telefone_cliente, canal_entrada, tipo_servico, data_nascimento, classificacao_lente, status, data_inicio)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *
        `, [cliente, telefone, canal || 'WhatsApp', tipo || 'Orçamento', data_nascimento || null, classificacao_lente, status || 'Pendente']);
        res.json(newAtendimento.rows[0]);
    } catch (err) {
        console.error('[Atendimentos] Create error:', err.message);
        res.status(500).json({ message: 'Erro ao criar atendimento' });
    }
});

// ATUALIZAR — PROTEGIDO + Validação dinâmica
router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    const { status, classificacao_lente, cliente, telefone_cliente, intencao_detectada, cidade } = req.body;

    try {
        const updates = [];
        const values = [];
        let p = 1;

        if (status !== undefined) { updates.push(`status = $${p}`); values.push(status); p++; }
        if (classificacao_lente !== undefined) { updates.push(`classificacao_lente = $${p}`); values.push(classificacao_lente); p++; }
        if (cliente !== undefined) { updates.push(`cliente = $${p}`); values.push(cliente); p++; }
        if (telefone_cliente !== undefined) { updates.push(`telefone_cliente = $${p}`); values.push(telefone_cliente); p++; }
        if (intencao_detectada !== undefined) { updates.push(`intencao_detectada = $${p}`); values.push(intencao_detectada); p++; }
        if (cidade !== undefined) { updates.push(`cidade = $${p}`); values.push(cidade); p++; }

        if (updates.length === 0) return res.status(400).json({ message: 'Nenhum campo para atualizar' });

        const query = `UPDATE tb_atendimentos SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`;
        values.push(id);

        const update = await db.query(query, values);
        if (update.rows.length === 0) return res.status(404).json({ message: 'Atendimento não encontrado' });
        res.json(update.rows[0]);
    } catch (err) {
        console.error('[Atendimentos] Update error:', err.message);
        res.status(500).json({ message: 'Erro ao atualizar atendimento' });
    }
});

// EXCLUIR — PROTEGIDO
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM tb_atendimentos WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Atendimento não encontrado' });
        res.json({ message: 'Atendimento excluído com sucesso', atendimento: result.rows[0] });
    } catch (err) {
        console.error('[Atendimentos] Delete error:', err.message);
        res.status(500).json({ message: 'Erro ao excluir atendimento' });
    }
});

module.exports = router;
