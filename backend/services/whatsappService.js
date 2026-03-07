const axios = require('axios');
const db = require('../db');
const aiService = require('./aiService');
const { isBusinessHours } = require('./businessHours');

let io;

const initialize = (socketIoInstance) => {
    io = socketIoInstance;
    aiService.initialize();
    console.log("WhatsApp Service Initialized (Uazapi + AI)");
};

const getApiConfig = () => {
    const url = process.env.UAZAPI_URL;
    const token = process.env.UAZAPI_TOKEN;
    if (!url || !token) {
        console.error("UAZAPI_URL or UAZAPI_TOKEN not configured");
        return null;
    }
    return { url, token };
};

const getStatus = async () => {
    const config = getApiConfig();
    if (!config) return { status: 'disconnected', reason: 'Missing Configuration' };
    return { status: 'connected' };
};

const sendMessage = async (jid, text) => {
    const config = getApiConfig();
    if (!config) throw new Error("WhatsApp não configurado (UAZAPI)");

    const number = jid.replace('@s.whatsapp.net', '');

    try {
        await axios.post(`${config.url}/message/sendText`, {
            number: number,
            text: text,
            options: {
                delay: 1200,
                presence: "composing",
                linkPreview: false
            }
        }, {
            headers: { 'apikey': config.token }
        });
        return true;
    } catch (err) {
        console.error("Erro ao enviar mensagem Uazapi:", err.response?.data || err.message);
        throw new Error("Falha no envio Uazapi");
    }
};

const processWebhook = async (data) => {
    console.log("Received Webhook:", JSON.stringify(data, null, 2));

    const msg = data.message || data.data?.message;
    if (!msg) return;

    const sender = msg.key?.remoteJid;
    if (!sender) return;

    // Ignore group messages
    if (sender.includes('@g.us')) return;

    const isFromMe = msg.key?.fromMe;
    const contactName = msg.pushName || sender.split('@')[0];
    const content = msg.conversation || msg.extendedTextMessage?.text || "[Mídia]";

    try {
        // 1. Upsert Chat
        await db.query(`
            INSERT INTO tb_whatsapp_chats (id, name, last_message_content, last_message_timestamp)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = COALESCE(NULLIF(EXCLUDED.name, EXCLUDED.id), tb_whatsapp_chats.name),
                last_message_content = EXCLUDED.last_message_content,
                last_message_timestamp = EXCLUDED.last_message_timestamp,
                unread_count = CASE WHEN $4 THEN tb_whatsapp_chats.unread_count ELSE tb_whatsapp_chats.unread_count + 1 END
        `, [sender, contactName, content, isFromMe]);

        // 2. Insert Message
        await db.query(`
            INSERT INTO tb_whatsapp_messages (whatsapp_id, chat_id, sender_id, content, timestamp)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (whatsapp_id) DO NOTHING
        `, [msg.key.id, sender, isFromMe ? 'me' : sender, content]);

        // 3. Emit to Frontend
        if (io) {
            io.emit('wa.message', {
                chatId: sender,
                content,
                sender: isFromMe ? 'me' : 'client',
                timestamp: new Date()
            });
        }

        // 4. AI Handling — only for incoming customer messages (not fromMe, not media-only)
        if (!isFromMe && content !== '[Mídia]') {
            await handleIncomingMessage(sender, content, contactName);
        }

    } catch (err) {
        console.error("Erro ao processar webhook:", err);
    }
};

// Handle incoming message with AI logic
async function handleIncomingMessage(chatId, message, contactName) {
    try {
        // Get chat mode
        const chatRes = await db.query(
            'SELECT atendimento_mode FROM tb_whatsapp_chats WHERE id = $1',
            [chatId]
        );
        const mode = chatRes.rows[0]?.atendimento_mode || 'auto';

        // Reset follow-up tier on customer response
        await aiService.resetFollowupOnResponse(chatId);

        // Decide whether AI should respond
        let shouldRespond = false;
        if (mode === 'human') {
            // Vendedor is handling — AI stays quiet
            return;
        } else if (mode === 'ai') {
            // AI always responds
            shouldRespond = true;
        } else {
            // Auto mode: AI responds only outside business hours
            shouldRespond = !isBusinessHours();
        }

        if (!shouldRespond) return;

        // Generate AI response
        const result = await aiService.generateResponse(chatId, message);
        if (!result || !result.reply) return;

        // Check if AI detected handoff need
        if (result.data?.handoff === true) {
            // Switch to human mode
            await db.query(
                "UPDATE tb_whatsapp_chats SET atendimento_mode = 'human' WHERE id = $1",
                [chatId]
            );
            // Notify frontend
            if (io) {
                io.emit('wa.handoff', { chatId, reason: 'AI detected handoff trigger' });
            }
        }

        // Send the AI response via WhatsApp
        await sendMessage(chatId, result.reply);

        // Update/create atendimento with extracted data
        const telefone = chatId.replace('@s.whatsapp.net', '');
        await aiService.upsertAtendimento(chatId, telefone, {
            ...result.data,
            nome: result.data?.nome || contactName
        });

        console.log(`[AI] Responded to ${chatId}: "${result.reply.substring(0, 80)}..."`);

    } catch (err) {
        console.error('[AI] Error handling incoming message:', err);
    }
}

const getContacts = async () => {
    const res = await db.query(
        "SELECT * FROM tb_whatsapp_chats ORDER BY last_message_timestamp DESC"
    );
    return res.rows;
};

const getMessages = async (chatId) => {
    const res = await db.query(
        "SELECT * FROM tb_whatsapp_messages WHERE chat_id = $1 ORDER BY timestamp ASC",
        [chatId]
    );
    return res.rows;
};

// Update chat mode (auto/human/ai)
const setChatMode = async (chatId, mode) => {
    if (!['auto', 'human', 'ai'].includes(mode)) {
        throw new Error('Invalid mode. Must be: auto, human, ai');
    }
    await db.query(
        'UPDATE tb_whatsapp_chats SET atendimento_mode = $1 WHERE id = $2',
        [mode, chatId]
    );
    return { chatId, mode };
};

// Get chat info with mode and linked atendimento
const getChatInfo = async (chatId) => {
    const chatRes = await db.query(
        'SELECT id, name, atendimento_mode, assigned_to FROM tb_whatsapp_chats WHERE id = $1',
        [chatId]
    );
    const chat = chatRes.rows[0] || null;

    // Get linked atendimento
    const atendRes = await db.query(
        `SELECT id, cliente, intencao_detectada, status, classificacao_lente, tem_receita, cidade, followup_tier
         FROM tb_atendimentos WHERE chat_id = $1 AND status NOT IN ('Finalizado', 'Cancelado')
         ORDER BY data_inicio DESC LIMIT 1`,
        [chatId]
    );
    const atendimento = atendRes.rows[0] || null;

    return { chat, atendimento };
};

module.exports = {
    initialize, sendMessage, processWebhook, getContacts,
    getMessages, getStatus, setChatMode, getChatInfo
};
