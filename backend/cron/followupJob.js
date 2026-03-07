const cron = require('node-cron');
const db = require('../db');
const OpenAI = require('openai');
const configStore = require('../configStore');

// Run every 5 minutes
const SCHEDULE = '*/5 * * * *';

// Fallback messages for each tier (tom de atendente local de Dourados)
const FALLBACK_MESSAGES = {
    1: 'Oi, estou por aqui acompanhando seu atendimento e posso te ajudar. Me chama quando puder pra gente continuar, tá? 😊',
    2: 'Olá! Seu atendimento segue aberto aqui comigo, posso continuar te ajudando e esclarecer tudo que precisar! 😊',
    3: 'Como não tivemos retorno, vou encerrar este atendimento por enquanto. Mas se você ainda quiser aproveitar nossas condições exclusivas, chama aqui que já te atendo! 😉'
};

let whatsappService = null;

// Get configurable tier delays from settings
async function getTierConfig() {
    try {
        const tier1 = await configStore.get('FOLLOWUP_TIER1_MINUTES');
        const tier2 = await configStore.get('FOLLOWUP_TIER2_MINUTES');
        const tier3 = await configStore.get('FOLLOWUP_TIER3_MINUTES');

        return [
            { tier: 1, delayMinutes: parseInt(tier1) || 30 },
            { tier: 2, delayMinutes: parseInt(tier2) || 120 },
            { tier: 3, delayMinutes: parseInt(tier3) || 1440 }
        ];
    } catch (err) {
        console.error('[Followup] Error reading config, using defaults:', err.message);
        return [
            { tier: 1, delayMinutes: 30 },
            { tier: 2, delayMinutes: 120 },
            { tier: 3, delayMinutes: 1440 }
        ];
    }
}

// Generate contextual follow-up using AI
async function generateContextualFollowup(chatId, tier) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return null;

        const openai = new OpenAI({ apiKey });

        // Get recent conversation history
        const historyRes = await db.query(
            `SELECT sender_id, content FROM tb_whatsapp_messages
             WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT 10`,
            [chatId]
        );
        const history = historyRes.rows.reverse();

        if (history.length === 0) return null;

        const convoText = history.map(m =>
            `${m.sender_id === 'me' ? 'Iris' : 'Cliente'}: ${m.content}`
        ).join('\n');

        const tierContext = {
            1: 'O cliente parou de responder ha 30 minutos. Mande uma mensagem GENTIL e curta (2-3 linhas) retomando o assunto que estavam conversando. Mostre que voce lembra do contexto. Voce e uma atendente que trabalha na loja em Dourados, fale como se estivesse AQUI na loja.',
            2: 'O cliente nao responde ha 2 horas. Mande uma mensagem AMIGAVEL (2-3 linhas) perguntando se ainda pode ajudar, mencionando brevemente o que discutiram. Voce e uma atendente LOCAL de Dourados.',
            3: 'O cliente nao responde ha 24 horas. Mande uma mensagem de ENCERRAMENTO (2-3 linhas), gentil, dizendo que vai encerrar mas que ele pode voltar quando quiser. Voce e uma atendente LOCAL de Dourados.'
        };

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            messages: [
                {
                    role: 'system',
                    content: `Voce e a Iris, atendente da Otica Leve Mais em Dourados-MS.
Voce TRABALHA e MORA em Dourados. Fale como atendente LOCAL — use "aqui na loja", "aqui em Dourados", NUNCA "ai em Dourados" ou "ai na cidade".
Tom: acolhedor, leve, profissional. Use 0-2 emojis. Responda APENAS o texto da mensagem, sem nada extra.

${tierContext[tier]}

Conversa anterior:
${convoText}`
                }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        return completion.choices[0]?.message?.content?.trim() || null;
    } catch (err) {
        console.error('[Followup] Error generating contextual message:', err.message);
        return null;
    }
}

const runFollowUpCheck = async () => {
    console.log(`[Followup] Check started: ${new Date().toISOString()}`);

    // Check if follow-up is enabled
    try {
        const enabled = await configStore.get('FOLLOWUP_ENABLED');
        if (enabled === 'false') {
            console.log('[Followup] Disabled via settings. Skipping.');
            return;
        }
    } catch (e) {
        // Continue if config read fails
    }

    // Lazy load whatsappService to avoid circular dependency
    if (!whatsappService) {
        whatsappService = require('../services/whatsappService');
    }

    try {
        // Get configurable tier delays
        const TIERS = await getTierConfig();

        // Find open atendimentos with chat_id that need follow-up
        // Only consider chats NOT in 'human' mode
        const query = `
            SELECT a.id, a.telefone_cliente, a.chat_id, a.followup_tier, a.ultima_interacao,
                   a.cliente, c.atendimento_mode
            FROM tb_atendimentos a
            LEFT JOIN tb_whatsapp_chats c ON a.chat_id = c.id
            WHERE a.status NOT IN ('Finalizado', 'Cancelado')
              AND a.chat_id IS NOT NULL
              AND a.followup_tier < 3
              AND (c.atendimento_mode IS NULL OR c.atendimento_mode != 'human')
            ORDER BY a.ultima_interacao ASC
            LIMIT 50
        `;

        const { rows } = await db.query(query);

        if (rows.length === 0) {
            console.log('[Followup] No atendimentos need follow-up.');
            return;
        }

        let sent = 0;
        for (const atendimento of rows) {
            const currentTier = atendimento.followup_tier || 0;

            // Get last customer message time for this chat
            const lastMsgRes = await db.query(
                `SELECT timestamp FROM tb_whatsapp_messages
                 WHERE chat_id = $1 AND sender_id != 'me'
                 ORDER BY timestamp DESC LIMIT 1`,
                [atendimento.chat_id]
            );

            if (lastMsgRes.rows.length === 0) continue;

            const lastCustomerMsg = new Date(lastMsgRes.rows[0].timestamp);
            const minutesSinceLastMsg = (Date.now() - lastCustomerMsg.getTime()) / (1000 * 60);

            // Check each tier
            for (const tierConfig of TIERS) {
                if (tierConfig.tier <= currentTier) continue;
                if (minutesSinceLastMsg < tierConfig.delayMinutes) break;

                // Generate contextual follow-up message
                let message = await generateContextualFollowup(atendimento.chat_id, tierConfig.tier);
                if (!message) {
                    message = FALLBACK_MESSAGES[tierConfig.tier];
                }

                try {
                    // Send the message via WhatsApp
                    await whatsappService.sendMessage(atendimento.chat_id, message);

                    // Update atendimento
                    const tierColumn = `followup_${tierConfig.tier}_at`;
                    await db.query(
                        `UPDATE tb_atendimentos SET
                            followup_tier = $1,
                            ${tierColumn} = NOW(),
                            followup_enviado = TRUE,
                            status = CASE WHEN $1 = 3 THEN 'Finalizado' ELSE 'Aguardando Retorno' END
                         WHERE id = $2`,
                        [tierConfig.tier, atendimento.id]
                    );

                    console.log(`[Followup] Tier ${tierConfig.tier} sent to ${atendimento.chat_id} (${atendimento.cliente || 'Unknown'})`);
                    sent++;
                } catch (sendErr) {
                    console.error(`[Followup] Failed to send tier ${tierConfig.tier} to ${atendimento.chat_id}:`, sendErr.message);
                }

                break; // Only advance one tier per run
            }
        }

        console.log(`[Followup] Done. ${sent} messages sent.`);

    } catch (error) {
        console.error('[Followup] Error:', error);
    }
};

const start = () => {
    console.log(`[Followup] Service scheduled: ${SCHEDULE} (every 5 min)`);
    cron.schedule(SCHEDULE, runFollowUpCheck);
};

module.exports = { start, runFollowUpCheck };
