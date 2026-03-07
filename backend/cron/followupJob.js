const cron = require('node-cron');
const db = require('../db');
const OpenAI = require('openai');
const configStore = require('../configStore');
const { isConversationCloser } = require('../utils/conversationUtils');

// Run every 5 minutes
const SCHEDULE = '*/5 * * * *';

// Fallback messages for each tier (tom de atendente local de Dourados)
const FALLBACK_MESSAGES = {
    1: 'Oi, estou por aqui acompanhando seu atendimento e posso te ajudar. Me chama quando puder pra gente continuar, tá? 😊',
    2: 'Olá! Seu atendimento segue aberto aqui comigo, posso continuar te ajudando e esclarecer tudo que precisar! 😊',
    3: 'Como não tivemos retorno, vou encerrar este atendimento por enquanto. Mas se você ainda quiser aproveitar nossas condições exclusivas, chama aqui que já te atendo! 😉'
};

let whatsappService = null;
let openaiClient = null; // Reutilizar instância

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

// Analyze conversation context and decide if follow-up should be sent
// Returns: { shouldSend: boolean, message: string|null, reason: string }
async function analyzeAndGenerateFollowup(chatId, tier) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) return { shouldSend: true, message: null, reason: 'no API key' };

        // Reutilizar instância do OpenAI client
        if (!openaiClient) openaiClient = new OpenAI({ apiKey });
        const openai = openaiClient;

        // Get recent conversation history
        const historyRes = await db.query(
            `SELECT sender_id, content, timestamp FROM tb_whatsapp_messages
             WHERE chat_id = $1 ORDER BY timestamp DESC LIMIT 15`,
            [chatId]
        );
        const history = historyRes.rows.reverse();

        if (history.length === 0) return { shouldSend: false, message: null, reason: 'no history' };

        const convoText = history.map(m =>
            `${m.sender_id === 'me' ? 'Iris' : 'Cliente'}: ${m.content}`
        ).join('\n');

        const tierContext = {
            1: 'O cliente parou de responder ha 30 minutos.',
            2: 'O cliente nao responde ha 2 horas.',
            3: 'O cliente nao responde ha 24 horas.'
        };

        // Step 1: Ask AI to ANALYZE if follow-up is appropriate
        const analysisCompletion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            messages: [
                {
                    role: 'system',
                    content: `Voce e um analista de atendimento da Otica Leve Mais. Analise a conversa e decida se faz sentido enviar um follow-up.

${tierContext[tier]}

Responda APENAS com JSON:
{"enviar": true/false, "motivo": "explicacao curta"}

NAO enviar follow-up se:
- Cliente ja disse "ok", "obrigado", "tchau", "valeu" ou qualquer encerramento
- Cliente ja recebeu todas as informacoes que pediu
- A conversa ja foi concluida naturalmente
- O cliente ja confirmou agendamento ou compra
- A Iris (atendente) ja respondeu e a conversa parece encerrada
- O cliente esta apenas aguardando algo (oculos ficar pronto, etc)
- A ultima mensagem da Iris ja foi uma despedida
- O cliente reagiu com emoji (👍, ❤️, etc)

ENVIAR follow-up se:
- O cliente fez uma pergunta que nao foi respondida
- O cliente estava no meio de um orcamento/agendamento e sumiu
- O cliente mostrou interesse mas nao finalizou
- A conversa foi interrompida sem conclusao`
                },
                {
                    role: 'user',
                    content: `Conversa:\n${convoText}`
                }
            ],
            temperature: 0.3,
            max_tokens: 100,
            response_format: { type: 'json_object' }
        });

        const analysisText = analysisCompletion.choices[0]?.message?.content?.trim();
        let analysis;
        try {
            analysis = JSON.parse(analysisText);
        } catch {
            analysis = { enviar: true, motivo: 'parse error' };
        }

        console.log(`[Followup] AI analysis for ${chatId}: enviar=${analysis.enviar}, motivo="${analysis.motivo}"`);

        if (!analysis.enviar) {
            return { shouldSend: false, message: null, reason: analysis.motivo };
        }

        // Step 2: Generate contextual follow-up message
        const tierInstruction = {
            1: 'Mande UMA mensagem GENTIL e curta (1-2 linhas) retomando o assunto. Mostre que lembra do contexto.',
            2: 'Mande UMA mensagem AMIGAVEL (1-2 linhas) perguntando se ainda pode ajudar, mencionando o que discutiram.',
            3: 'Mande UMA mensagem de ENCERRAMENTO (1-2 linhas), gentil, dizendo que vai encerrar mas pode voltar.'
        };

        const msgCompletion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            messages: [
                {
                    role: 'system',
                    content: `Voce e a Iris, atendente da Otica Leve Mais em Dourados-MS.
Voce TRABALHA e MORA em Dourados. Fale como atendente LOCAL — use "aqui na loja", NUNCA "ai em Dourados".
Tom: acolhedor, leve, profissional. Use 0-2 emojis. Responda APENAS o texto da mensagem.

${tierInstruction[tier]}

REGRAS IMPORTANTES:
- NAO repita informacoes que ja foram dadas na conversa
- NAO pergunte coisas que o cliente ja respondeu
- Seja BREVE (maximo 2 linhas)
- Fale sobre o CONTEXTO REAL da conversa, nao coisas genericas

Conversa anterior:
${convoText}`
                }
            ],
            temperature: 0.7,
            max_tokens: 120
        });

        const message = msgCompletion.choices[0]?.message?.content?.trim() || null;
        return { shouldSend: true, message, reason: analysis.motivo };

    } catch (err) {
        console.error('[Followup] Error analyzing/generating followup:', err.message);
        return { shouldSend: true, message: null, reason: 'error' };
    }
}

// isConversationCloser importado de ../utils/conversationUtils

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

        // FIX: Otimizar N+1 — buscar última mensagem do cliente e última mensagem geral
        // com subqueries LATERAL para evitar múltiplas queries por atendimento
        const query = `
            SELECT a.id, a.telefone_cliente, a.chat_id, a.followup_tier, a.ultima_interacao,
                   a.cliente, c.atendimento_mode,
                   last_customer.content AS last_customer_content,
                   last_customer.timestamp AS last_customer_timestamp,
                   last_any.sender_id AS last_any_sender,
                   last_any.timestamp AS last_any_timestamp
            FROM tb_atendimentos a
            LEFT JOIN tb_whatsapp_chats c ON a.chat_id = c.id
            LEFT JOIN LATERAL (
                SELECT content, timestamp FROM tb_whatsapp_messages
                WHERE chat_id = a.chat_id AND sender_id != 'me'
                ORDER BY timestamp DESC LIMIT 1
            ) last_customer ON true
            LEFT JOIN LATERAL (
                SELECT sender_id, timestamp FROM tb_whatsapp_messages
                WHERE chat_id = a.chat_id
                ORDER BY timestamp DESC LIMIT 1
            ) last_any ON true
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

            // Dados já vieram do JOIN — sem queries adicionais
            if (!atendimento.last_customer_timestamp) continue;

            const lastCustomerMsg = new Date(atendimento.last_customer_timestamp);
            const lastCustomerText = atendimento.last_customer_content || '';
            const minutesSinceLastMsg = (Date.now() - lastCustomerMsg.getTime()) / (1000 * 60);

            // PROTECTION: Don't send follow-up if client already closed the conversation
            if (isConversationCloser(lastCustomerText)) {
                if (currentTier < 3) {
                    console.log(`[Followup] Skipping ${atendimento.chat_id}: client closed with "${lastCustomerText.substring(0, 30)}"`);
                    await db.query(
                        `UPDATE tb_atendimentos SET followup_tier = 3, status = 'Finalizado' WHERE id = $1`,
                        [atendimento.id]
                    );
                }
                continue;
            }

            // Se IA/loja foi o último a responder, usar o timestamp da mensagem da IA para timing
            if (atendimento.last_any_sender === 'me' && atendimento.last_any_timestamp) {
                const lastAiMsg = new Date(atendimento.last_any_timestamp);
                const minutesSinceAiMsg = (Date.now() - lastAiMsg.getTime()) / (1000 * 60);
                if (minutesSinceAiMsg < (TIERS[0]?.delayMinutes || 30)) {
                    continue;
                }
            }

            // Check each tier
            for (const tierConfig of TIERS) {
                if (tierConfig.tier <= currentTier) continue;
                if (minutesSinceLastMsg < tierConfig.delayMinutes) break;

                // AI analyzes conversation context to decide if follow-up is appropriate
                const followupResult = await analyzeAndGenerateFollowup(atendimento.chat_id, tierConfig.tier);

                if (!followupResult.shouldSend) {
                    console.log(`[Followup] AI decided NOT to send tier ${tierConfig.tier} to ${atendimento.chat_id}: ${followupResult.reason}`);
                    // If AI says don't send, mark tier as done to avoid rechecking
                    await db.query(
                        `UPDATE tb_atendimentos SET followup_tier = $1,
                         status = CASE WHEN $1 = 3 THEN 'Finalizado' ELSE status END
                         WHERE id = $2`,
                        [tierConfig.tier, atendimento.id]
                    );
                    break;
                }

                let message = followupResult.message;
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
