const axios = require('axios');
const db = require('../db');
const aiService = require('./aiService');
const { isBusinessHours } = require('./businessHours');

let io;

// =============================================
// MESSAGE BUFFER — Acumula mensagens antes de responder
// Espera até 15 segundos para juntar mensagens consecutivas
// =============================================
const messageBuffer = new Map(); // chatId → { messages: [], timer: null }
const BUFFER_WAIT_MS = 15000; // 15 segundos de espera

// =============================================
// MESSAGE SPLITTER — Divide resposta da IA em múltiplas mensagens
// Simula comportamento humano de enviar mensagens curtas
// =============================================
function splitMessageForHumanLike(text) {
    // Se é curta (até 120 chars), envia como uma só
    if (text.length <= 120) return [text];

    const parts = [];

    // 1. Primeiro tenta dividir por quebras de linha dupla (parágrafos)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length > 1) {
        for (const p of paragraphs) {
            // Se o parágrafo é muito grande, divide por frases
            if (p.length > 200) {
                parts.push(...splitBySentences(p));
            } else {
                parts.push(p.trim());
            }
        }
        return parts.filter(p => p.length > 0);
    }

    // 2. Se não tem parágrafos, divide por frases
    return splitBySentences(text);
}

function splitBySentences(text) {
    const parts = [];
    // Divide por pontos finais, interrogações ou exclamações seguidas de espaço
    // Preserva o delimitador na parte anterior
    const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];

    let current = '';
    for (const sentence of sentences) {
        // Se adicionar essa frase ultrapassa ~150 chars, fecha o bloco atual
        if (current.length + sentence.length > 150 && current.length > 0) {
            parts.push(current.trim());
            current = sentence;
        } else {
            current += sentence;
        }
    }
    if (current.trim()) {
        parts.push(current.trim());
    }

    // Se ficou tudo em uma parte só, retorna como está
    return parts.length > 0 ? parts : [text];
}

// Helper: aguarda um tempo (ms)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function bufferMessage(chatId, message, contactName) {
    if (!messageBuffer.has(chatId)) {
        messageBuffer.set(chatId, { messages: [], timer: null });
    }

    const buffer = messageBuffer.get(chatId);

    // Limpa timer anterior (reseta contagem a cada mensagem nova)
    if (buffer.timer) {
        clearTimeout(buffer.timer);
    }

    // Adiciona mensagem ao buffer
    buffer.messages.push(message);
    console.log(`[Buffer] ${chatId}: ${buffer.messages.length} msg(s) buffered, waiting ${BUFFER_WAIT_MS / 1000}s...`);

    // Inicia novo timer
    buffer.timer = setTimeout(async () => {
        const buffered = buffer.messages.slice();
        messageBuffer.delete(chatId);

        // Junta todas as mensagens em uma só
        const combinedMessage = buffered.join('\n');
        console.log(`[Buffer] ${chatId}: Processing ${buffered.length} message(s): "${combinedMessage.substring(0, 100)}..."`);

        await handleIncomingMessage(chatId, combinedMessage, contactName);
    }, BUFFER_WAIT_MS);
}

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
    // Mínimo 3s, máximo 12s — ~40ms por caractere (humanizado)
    const dynamicDelay = Math.min(Math.max(text.length * 40, 3000), 12000);

    try {
        await axios.post(`${config.url}/send/text`, {
            number: number,
            text: text,
            delay: dynamicDelay,
            readchat: true,
            readmessages: true
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

// Mark messages as read via Uazapi (usando send/text com readchat + readmessages)
// Nota: readchat/readmessages já são enviados junto com cada sendMessage
// Esta função é usada para marcar como lido SEM enviar mensagem (quando IA não vai responder)
const markAsRead = async (jid) => {
    // O read é feito automaticamente no sendMessage via readchat: true
    // Quando a IA não responde (modo human ou horário comercial),
    // não marcamos como lido pois o vendedor verá como não lido
    console.log(`[WhatsApp] Read will be marked on next sendMessage to ${jid}`);
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

    // Detect message types
    const isTextMessage = messageType === 'text' || messageType === 'Conversation' || messageType === 'extendedText';
    const isImageMessage = messageType === 'image' || messageType === 'ImageMessage';
    const isAudioMessage = messageType === 'audio' || messageType === 'ptt' || messageType === 'AudioMessage' || messageType === 'PttMessage';

    // Get media URL (Uazapi sends file URL or base64)
    const mediaUrl = msg.file || msg.fileUrl || msg.media || msg.base64 || null;
    const imageCaption = msg.caption || msg.text || '';

    console.log(`[Webhook] ${isFromMe ? 'SENT' : 'RECEIVED'} from ${sender}: type=${messageType}, "${content.substring(0, 50)}"${isImageMessage ? ` [IMG: ${mediaUrl ? 'has URL' : 'no URL'}]` : ''}${isAudioMessage ? ` [AUDIO: ${mediaUrl ? 'has URL' : 'no URL'}]` : ''}`);

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

        // 4. AI Handling — incoming customer messages
        if (!isFromMe) {
            if (isTextMessage && content !== '[Midia]') {
                // Texto: usa buffer para acumular mensagens antes de responder (15s)
                markAsRead(sender);
                bufferMessage(sender, content, contactName);
            } else if (isImageMessage && mediaUrl) {
                // Imagem: analisa com Vision API (pode ser receita)
                markAsRead(sender);
                console.log(`[Webhook] Image received from ${sender}, analyzing...`);
                handleIncomingImage(sender, mediaUrl, imageCaption, contactName);
            } else if (isAudioMessage && mediaUrl) {
                // Áudio: transcreve com Whisper e processa como texto
                markAsRead(sender);
                console.log(`[Webhook] Audio received from ${sender}, transcribing...`);
                handleIncomingAudio(sender, mediaUrl, contactName);
            }
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
            const inHours = isBusinessHours();
            if (inHours) {
                // Dentro do horário: transfere para humano (tem gente na loja)
                await db.query(
                    "UPDATE tb_whatsapp_chats SET atendimento_mode = 'human' WHERE id = $1",
                    [chatId]
                );
                if (io) {
                    io.emit('wa.handoff', { chatId, reason: 'AI detected handoff trigger' });
                }
                console.log(`[AI] Handoff triggered for ${chatId} (business hours)`);
            } else {
                // Fora do horário: NÃO transfere — não tem ninguém para atender
                // A IA continua atendendo, mas registra que precisa de humano
                console.log(`[AI] Handoff requested for ${chatId} but OUTSIDE business hours — AI continues`);
                if (io) {
                    io.emit('wa.handoff_pending', {
                        chatId,
                        reason: 'Handoff requested outside business hours — queued for next day'
                    });
                }
            }
        }

        // Split AI response into multiple human-like messages
        const messageParts = splitMessageForHumanLike(result.reply);
        console.log(`[AI] Splitting response into ${messageParts.length} part(s)`);

        for (let i = 0; i < messageParts.length; i++) {
            const part = messageParts[i];

            // Delay entre partes (simula digitação entre mensagens)
            if (i > 0) {
                const interDelay = Math.min(Math.max(part.length * 35, 2000), 6000);
                await sleep(interDelay);
            }

            // Send via WhatsApp
            await sendMessage(chatId, part);

            // Save each part as a message in DB
            await db.query(`
                INSERT INTO tb_whatsapp_messages (whatsapp_id, chat_id, sender_id, content, timestamp)
                VALUES ($1, $2, 'me', $3, NOW())
                ON CONFLICT (whatsapp_id) DO NOTHING
            `, [`ai_${Date.now()}_${i}`, chatId, part]);

            // Emit each part to frontend via Socket.IO
            if (io) {
                io.emit('wa.message', {
                    chatId,
                    content: part,
                    sender: 'me',
                    timestamp: new Date()
                });
            }
        }

        // Update chat last message with the final part
        const lastPart = messageParts[messageParts.length - 1];
        await db.query(`
            UPDATE tb_whatsapp_chats SET
                last_message_content = $1,
                last_message_timestamp = NOW()
            WHERE id = $2
        `, [lastPart, chatId]);

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

// Handle incoming IMAGE with Vision AI (receita, etc.)
async function handleIncomingImage(chatId, imageUrl, caption, contactName) {
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
            console.log(`[AI] Chat ${chatId} is in HUMAN mode, skipping image`);
            return;
        } else if (mode === 'ai') {
            shouldRespond = true;
        } else {
            const inHours = isBusinessHours();
            shouldRespond = !inHours;
        }

        if (!shouldRespond) return;

        console.log(`[AI] Analyzing image for ${chatId}...`);

        // Analyze image with Vision API
        const result = await aiService.analyzeImage(chatId, imageUrl, caption);
        if (!result || !result.reply) {
            console.log('[AI] No response from image analysis');
            return;
        }

        // Split and send response
        const messageParts = splitMessageForHumanLike(result.reply);
        console.log(`[AI] Image analysis response in ${messageParts.length} part(s)`);

        for (let i = 0; i < messageParts.length; i++) {
            const part = messageParts[i];

            if (i > 0) {
                const interDelay = Math.min(Math.max(part.length * 35, 2000), 6000);
                await sleep(interDelay);
            }

            await sendMessage(chatId, part);

            await db.query(`
                INSERT INTO tb_whatsapp_messages (whatsapp_id, chat_id, sender_id, content, timestamp)
                VALUES ($1, $2, 'me', $3, NOW())
                ON CONFLICT (whatsapp_id) DO NOTHING
            `, [`ai_img_${Date.now()}_${i}`, chatId, part]);

            if (io) {
                io.emit('wa.message', {
                    chatId,
                    content: part,
                    sender: 'me',
                    timestamp: new Date()
                });
            }
        }

        // Update chat
        const lastPart = messageParts[messageParts.length - 1];
        await db.query(`
            UPDATE tb_whatsapp_chats SET
                last_message_content = $1,
                last_message_timestamp = NOW()
            WHERE id = $2
        `, [lastPart, chatId]);

        // Save prescription data if extracted
        if (result.prescriptionData) {
            const telefone = chatId.replace('@s.whatsapp.net', '');
            await aiService.upsertAtendimento(chatId, telefone, {
                ...result.prescriptionData,
                tem_receita: true,
                nome: contactName
            });
            console.log(`[AI] Prescription data saved for ${chatId}`);
        }

        console.log(`[AI] Image analyzed for ${chatId}: "${result.reply.substring(0, 80)}..."`);

    } catch (err) {
        console.error('[AI] Error handling incoming image:', err);
    }
}

// Handle incoming AUDIO — transcribe with Whisper and process as text
async function handleIncomingAudio(chatId, audioUrl, contactName) {
    try {
        // Get chat mode
        const chatRes = await db.query(
            'SELECT atendimento_mode FROM tb_whatsapp_chats WHERE id = $1',
            [chatId]
        );
        const mode = chatRes.rows[0]?.atendimento_mode || 'auto';

        await aiService.resetFollowupOnResponse(chatId);

        let shouldRespond = false;
        if (mode === 'human') {
            console.log(`[AI] Chat ${chatId} is in HUMAN mode, skipping audio`);
            return;
        } else if (mode === 'ai') {
            shouldRespond = true;
        } else {
            const inHours = isBusinessHours();
            shouldRespond = !inHours;
        }

        if (!shouldRespond) return;

        // Transcribe audio
        console.log(`[AI] Transcribing audio for ${chatId}...`);
        const transcription = await aiService.transcribeAudio(audioUrl);

        if (!transcription) {
            console.log('[AI] Could not transcribe audio');
            // Send a friendly message asking to type instead
            const fallbackMsg = 'Oi! Recebi seu áudio mas não consegui entender bem. Pode me enviar por escrito? Assim consigo te ajudar melhor 😊';
            await sendMessage(chatId, fallbackMsg);

            await db.query(`
                INSERT INTO tb_whatsapp_messages (whatsapp_id, chat_id, sender_id, content, timestamp)
                VALUES ($1, $2, 'me', $3, NOW())
                ON CONFLICT (whatsapp_id) DO NOTHING
            `, [`ai_audio_fail_${Date.now()}`, chatId, fallbackMsg]);

            if (io) {
                io.emit('wa.message', { chatId, content: fallbackMsg, sender: 'me', timestamp: new Date() });
            }
            return;
        }

        console.log(`[AI] Audio transcribed: "${transcription.substring(0, 100)}..."`);

        // Save transcription as message (so it appears in history)
        await db.query(`
            INSERT INTO tb_whatsapp_messages (whatsapp_id, chat_id, sender_id, content, timestamp)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (whatsapp_id) DO NOTHING
        `, [`audio_transcript_${Date.now()}`, chatId, chatId, `🎤 ${transcription}`]);

        // Process transcribed text as a normal message
        await handleIncomingMessage(chatId, transcription, contactName);

    } catch (err) {
        console.error('[AI] Error handling incoming audio:', err);
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
    initialize, sendMessage, sendMedia, markAsRead, processWebhook, getContacts,
    getMessages, getStatus, setChatMode, getChatInfo
};
