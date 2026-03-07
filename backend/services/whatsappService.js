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
    if (!config) throw new Error("WhatsApp nao configurado (UAZAPI)");

    const number = jid.replace('@s.whatsapp.net', '');

    // Calcula delay dinâmico baseado no tamanho da mensagem para simular digitação
    // Mínimo 2s, máximo 5s — ~30ms por caractere
    const dynamicDelay = Math.min(Math.max(text.length * 30, 2000), 5000);

    try {
        await axios.post(`${config.url}/send/text`, {
            number: number,
            text: text,
            delay: dynamicDelay
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'token': config.token
            }
        });
        return true;
    } catch (err) {
        console.error("Erro ao enviar mensagem Uazapi:", err.response?.data || err.message);
        throw new Error("Falha no envio Uazapi");
    }
};

// Send media (image, audio/ptt, video) via Uazapi
const sendMedia = async (jid, type, fileUrl, caption) => {
    const config = getApiConfig();
    if (!config) throw new Error("WhatsApp nao configurado (UAZAPI)");

    const number = jid.replace('@s.whatsapp.net', '');

    // Delay para simular digitação antes de enviar mídia
    const dynamicDelay = Math.min(Math.max(2000), 4000);

    const body = {
        number: number,
        type: type,       // "image", "ptt", "video", "audio", "document"
        file: fileUrl,
        delay: dynamicDelay
    };
    if (caption) body.text = caption;

    try {
        await axios.post(`${config.url}/send/media`, body, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'token': config.token
            }
        });
        return true;
    } catch (err) {
        console.error("Erro ao enviar media Uazapi:", err.response?.data || err.message);
        throw new Error("Falha no envio de media Uazapi");
    }
};

// =============================================
// WEBHOOK — Formato Uazapi
// =============================================
// Uazapi envia:
// {
//   "wa_name": "Nome do contato",
//   "message": {
//     "chatid": "5567999999999@s.whatsapp.net",
//     "content": "texto da mensagem",
//     "text": "texto da mensagem",
//     "fromMe": false,
//     "senderName": "Nome",
//     "messageid": "3EB0...",
//     "isGroup": false,
//     "messageType": "Conversation",
//     "type": "text"
//   }
// }
const processWebhook = async (data) => {
    console.log("[Webhook] Received:", JSON.stringify(data).substring(0, 500));

    const msg = data.message;
    if (!msg) {
        console.log("[Webhook] No message field, ignoring");
        return;
    }

    // Get sender JID from Uazapi format
    let sender = msg.chatid || msg.sender_pn || '';
    if (!sender) {
        console.log("[Webhook] No chatid/sender_pn, ignoring");
        return;
    }

    // Ensure it has @ format (Uazapi sometimes sends without @)
    if (sender.includes('s.whatsapp.net') && !sender.includes('@')) {
        sender = sender.replace('s.whatsapp.net', '@s.whatsapp.net');
    }
    if (!sender.includes('@')) {
        sender = sender + '@s.whatsapp.net';
    }

    // Ignore group messages
    if (msg.isGroup === true || sender.includes('@g.us')) {
        console.log("[Webhook] Group message, ignoring");
        return;
    }

    // Parse message fields from Uazapi format
    const isFromMe = msg.fromMe === true || msg.fromMe === 'true' || data.wasSentByApi === true;
    const contactName = msg.senderName || data.wa_name || sender.split('@')[0];
    const content = msg.content || msg.text || msg.caption || '[Midia]';
    const messageId = msg.messageid || msg.id || `uaz_${Date.now()}`;
    const messageType = msg.type || msg.messageType || 'text';

    // Skip non-text messages for AI processing (but still save them)
    const isTextMessage = messageType === 'text' || messageType === 'Conversation' || messageType === 'extendedText';

    console.log(`[Webhook] ${isFromMe ? 'SENT' : 'RECEIVED'} from ${sender}: "${content.substring(0, 50)}"`);

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
        `, [messageId, sender, isFromMe ? 'me' : sender, content]);

        // 3. Emit to Frontend via Socket.IO
        if (io) {
            io.emit('wa.message', {
                chatId: sender,
                content,
                sender: isFromMe ? 'me' : 'client',
                timestamp: new Date()
            });
        }

        // 4. AI Handling — only for incoming customer TEXT messages
        if (!isFromMe && isTextMessage && content !== '[Midia]') {
            await handleIncomingMessage(sender, content, contactName);
        }

    } catch (err) {
        console.error("[Webhook] Error processing:", err);
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
            console.log(`[AI] Chat ${chatId} is in HUMAN mode, skipping`);
            return;
        } else if (mode === 'ai') {
            shouldRespond = true;
        } else {
            // Auto mode: AI responds only outside business hours
            const inHours = isBusinessHours();
            shouldRespond = !inHours;
            console.log(`[AI] Auto mode - business hours: ${inHours}, should respond: ${shouldRespond}`);
        }

        if (!shouldRespond) return;

        // Generate AI response
        console.log(`[AI] Generating response for ${chatId}...`);
        const result = await aiService.generateResponse(chatId, message);
        if (!result || !result.reply) {
            console.log('[AI] No response generated');
            return;
        }

        // Check if AI detected handoff need
        if (result.data?.handoff === true) {
            await db.query(
                "UPDATE tb_whatsapp_chats SET atendimento_mode = 'human' WHERE id = $1",
                [chatId]
            );
            if (io) {
                io.emit('wa.handoff', { chatId, reason: 'AI detected handoff trigger' });
            }
            console.log(`[AI] Handoff triggered for ${chatId}`);
        }

        // Send the AI response via WhatsApp
        await sendMessage(chatId, result.reply);

        // Save the AI response as a message too
        await db.query(`
            INSERT INTO tb_whatsapp_messages (whatsapp_id, chat_id, sender_id, content, timestamp)
            VALUES ($1, $2, 'me', $3, NOW())
            ON CONFLICT (whatsapp_id) DO NOTHING
        `, [`ai_${Date.now()}`, chatId, result.reply]);

        // Update chat last message
        await db.query(`
            UPDATE tb_whatsapp_chats SET
                last_message_content = $1,
                last_message_timestamp = NOW()
            WHERE id = $2
        `, [result.reply, chatId]);

        // Emit AI response to frontend
        if (io) {
            io.emit('wa.message', {
                chatId,
                content: result.reply,
                sender: 'me',
                timestamp: new Date()
            });
        }

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

const getChatInfo = async (chatId) => {
    const chatRes = await db.query(
        'SELECT id, name, atendimento_mode, assigned_to FROM tb_whatsapp_chats WHERE id = $1',
        [chatId]
    );
    const chat = chatRes.rows[0] || null;

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
    initialize, sendMessage, sendMedia, processWebhook, getContacts,
    getMessages, getStatus, setChatMode, getChatInfo
};
