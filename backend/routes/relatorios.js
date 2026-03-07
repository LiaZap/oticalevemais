const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
    try {
        const { periodo } = req.query; // '7days', '30days', 'month'

        let dateFilter;
        switch (periodo) {
            case '30days':
                dateFilter = "CURRENT_DATE - INTERVAL '30 days'";
                break;
            case 'month':
                dateFilter = "DATE_TRUNC('month', CURRENT_DATE)";
                break;
            default: // 7days
                dateFilter = "CURRENT_DATE - INTERVAL '7 days'";
        }

        // Evolucao de Atendimentos vs Vendas (por dia)
        const evolucaoQuery = `
            SELECT
                TO_CHAR(data_inicio, 'DD/MM') AS data,
                COUNT(*) AS atendimentos,
                COUNT(*) FILTER (WHERE status = 'Finalizado' AND seguiu_fluxo_agendamento = TRUE) AS vendas
            FROM tb_atendimentos
            WHERE data_inicio >= ${dateFilter}
            GROUP BY TO_CHAR(data_inicio, 'DD/MM'), DATE(data_inicio)
            ORDER BY DATE(data_inicio) ASC
        `;

        // Origem dos Clientes (canal)
        const canaisQuery = `
            SELECT
                COALESCE(canal, 'WhatsApp') AS name,
                COUNT(*) AS value
            FROM tb_atendimentos
            WHERE data_inicio >= ${dateFilter}
            GROUP BY 1
            ORDER BY 2 DESC
        `;

        // Vendas por Tipo de Lente
        const vendasTipoQuery = `
            SELECT
                COALESCE(classificacao_lente, 'Nao Classificado') AS tipo,
                COUNT(*) AS quantidade
            FROM tb_atendimentos
            WHERE data_inicio >= ${dateFilter}
              AND status = 'Finalizado'
            GROUP BY 1
            ORDER BY 2 DESC
        `;

        // Funil de Conversao
        const funilQuery = `
            SELECT
                'Atendimentos' AS etapa, COUNT(*) AS valor
            FROM tb_atendimentos WHERE data_inicio >= ${dateFilter}
            UNION ALL
            SELECT
                'Orcamentos' AS etapa, COUNT(*) AS valor
            FROM tb_atendimentos WHERE data_inicio >= ${dateFilter} AND intencao_detectada ILIKE '%or_amento%'
            UNION ALL
            SELECT
                'Agendados' AS etapa, COUNT(*) AS valor
            FROM tb_atendimentos WHERE data_inicio >= ${dateFilter} AND seguiu_fluxo_agendamento = TRUE
            UNION ALL
            SELECT
                'Vendas' AS etapa, COUNT(*) AS valor
            FROM tb_atendimentos WHERE data_inicio >= ${dateFilter} AND status = 'Finalizado'
        `;

        const [evolucao, canais, vendasTipo, funil] = await Promise.all([
            db.query(evolucaoQuery),
            db.query(canaisQuery),
            db.query(vendasTipoQuery),
            db.query(funilQuery)
        ]);

        // Add colors to canais
        const canalColors = {
            'WhatsApp': '#25D366',
            'Instagram': '#E1306C',
            'Presencial': '#9c0102',
            'Telefone': '#64748b',
            'Site': '#3b82f6'
        };

        const canaisData = canais.rows.map(c => ({
            ...c,
            value: parseInt(c.value),
            color: canalColors[c.name] || '#6b7280'
        }));

        res.json({
            evolucao: evolucao.rows.map(r => ({
                ...r,
                atendimentos: parseInt(r.atendimentos),
                vendas: parseInt(r.vendas)
            })),
            canais: canaisData,
            vendas_por_tipo: vendasTipo.rows.map(r => ({
                ...r,
                quantidade: parseInt(r.quantidade)
            })),
            funil: funil.rows.map(r => ({
                ...r,
                valor: parseInt(r.valor)
            }))
        });

    } catch (err) {
        console.error('Relatorios error:', err.message);
        res.status(500).json({ error: 'Erro ao buscar relatorios' });
    }
});

module.exports = router;
