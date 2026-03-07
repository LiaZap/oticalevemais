const cron = require('node-cron');
const db = require('../db');
const OpenAI = require('openai');

// Run every 5 minutes
const SCHEDULE = '*/5 * * * *';

// Follow-up tier configuration (in minutes)
const TIERS = [
    { tier: 1, delayMinutes: 30, fallbackMsg: 'Oi 😊 estou por aqui acompanhando seu atendimento e posso te ajudar. Me chama quando puder pra gente continuar, tá?' },
    { tier: 2, delayMinutes: 120, fallbackMsg: 'Olá!! Seu atendimento segue aberto por aqui 😊 posso continuar te ajudando e esclarecer tudo que precisar?' },
    { tier: 3, delayMinutes: 1440, fallbackMsg: 'Como não tivemos retorno, vou encerrar este atendimento por enquanto. Mas se você ainda quiser aproveitar nossas condições exclusivas, chama aqui que já te atendo!' }
];

let whatsappService = null;

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
            `${m.sender_id === 'me' ? 'Íris' : 'Cliente'}: ${m.content}`
        ).join('\n');

        const tierContext = {
            1: 'O cliente parou de responder há 30 minutos. Mande uma mensagem GENTIL e curta (2-3 linhas) retomando o assunto que estavam conversando. Mostre que você lembra do contexto.',
            2: 'O cliente não responde há 2 horas. Mande uma mensagem AMIGÁVEL (2-3 linhas) perguntando se ainda pode ajudar, mencionando brevemente o que discutiram.',
            3: 'O cliente não responde há 24 horas. Mande uma mensagem de ENCERRAMENTO (2-3 linhas), gentil, dizendo que vai encerrar mas que ele pode voltar quando quiser.'
        };

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            messages: [
                {
                    role: 'system',
                    content: `Você é a Íris, assistente da Ótica Leve Mais (Dourados-MS).
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

    // Lazy load whatsappService to avoid circular dependency
    if (!whatsappService) {
        whatsappService = require('../services/whatsappService');
    }

    try {
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
            // Find the next tier to send
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
                if (tierConfig.tier <= currentTier) continue; // Already sent this tier
                if (minutesSinceLastMsg < tierConfig.delayMinutes) break; // Not time yet

                // Generate contextual follow-up message
                let message = await generateContextualFollowup(atendimento.chat_id, tierConfig.tier);
                if (!message) {
                    message = tierConfig.fallbackMsg;
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
