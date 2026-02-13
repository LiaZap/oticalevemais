const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Rota protegida para obter KPIs
router.get('/kpis', auth, async (req, res) => {
    try {
        // KPI 1: Volume de Demanda (Últimos 30 dias)
        const volumeQuery = `
            SELECT 
                TO_CHAR(data_inicio, 'DD/MM/YYYY') AS data,
                EXTRACT(HOUR FROM data_inicio) AS hora_do_dia,
                COUNT(*) AS total_atendimentos
            FROM tb_atendimentos
            WHERE data_inicio >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY 1, 2
            ORDER BY 1 DESC, 2 ASC;
        `;

        // KPI 2: Classificação de Assuntos
        const intentQuery = `
            SELECT 
                COALESCE(intencao_detectada, 'Não Identificado') AS motivo,
                COUNT(*) AS quantidade
            FROM tb_atendimentos
            WHERE data_inicio >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY 1
            ORDER BY 2 DESC;
        `;

        // KPI 3: Eficiência Follow-up
        const followupQuery = `
            SELECT 
                COUNT(*) FILTER (WHERE followup_enviado = TRUE) AS enviados,
                COUNT(*) FILTER (WHERE followup_enviado = TRUE AND respondeu_followup = TRUE) AS respondidos
            FROM tb_atendimentos
            WHERE data_inicio >= CURRENT_DATE - INTERVAL '30 days';
        `;

        // KPI 4: Conversão Real
        const conversionQuery = `
            SELECT 
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE seguiu_fluxo_agendamento = TRUE) AS agendados
            FROM tb_atendimentos
            WHERE data_inicio >= CURRENT_DATE - INTERVAL '30 days';
        `;

        // KPI 5: Retenção (Lista Recente)
        const retentionQuery = `
            SELECT 
                id, telefone_cliente, TO_CHAR(data_inicio, 'DD/MM/YYYY HH24:MI') as data_contato,
                intencao_detectada, status
            FROM tb_atendimentos
            WHERE data_inicio >= CURRENT_DATE - INTERVAL '7 days'
            AND seguiu_fluxo_agendamento = FALSE
            AND status NOT IN ('finalizado')
            ORDER BY data_inicio DESC
            LIMIT 50;
        `;

        const [volume, intent, followup, conversion, retention] = await Promise.all([
            db.query(volumeQuery),
            db.query(intentQuery),
            db.query(followupQuery),
            db.query(conversionQuery),
            db.query(retentionQuery)
        ]);

        res.json({
            volume: volume.rows,
            intencao: intent.rows,
            followup: followup.rows[0],
            conversao: conversion.rows[0],
            retencao: retention.rows
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor ao buscar KPIs');
    }
});

module.exports = router;
