const router = require('express').Router();
const whatsappService = require('../services/whatsappService');

// Get status
router.get('/status', async (req, res) => {
    try {
        const status = await whatsappService.getStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all chats
router.get('/chats', async (req, res) => {
    try {
        const chats = await whatsappService.getContacts();
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get messages for a specific chat
router.get('/messages/:chatId', async (req, res) => {
    try {
        const messages = await whatsappService.getMessages(req.params.chatId);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Send message
router.post('/send', async (req, res) => {
    const { chatId, content } = req.body;
    try {
        await whatsappService.sendMessage(chatId, content);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || "Erro ao envio" });
    }
});

// Webhook for incoming messages
router.post('/webhook', async (req, res) => {
    try {
        await whatsappService.processWebhook(req.body);
        res.sendStatus(200);
    } catch (err) {
        console.error("Webhook error:", err);
        res.sendStatus(500);
    }
});

// Mark chat as read (reset unread count)
router.put('/chats/:chatId/read', async (req, res) => {
    try {
        const db = require('../db');
        await db.query(
            'UPDATE tb_whatsapp_chats SET unread_count = 0 WHERE id = $1',
            [req.params.chatId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Set chat mode (auto/human/ai)
router.put('/chats/:chatId/mode', async (req, res) => {
    try {
        const { mode } = req.body;
        const result = await whatsappService.setChatMode(req.params.chatId, mode);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get chat info with mode + linked atendimento
router.get('/chats/:chatId/info', async (req, res) => {
    try {
        const info = await whatsappService.getChatInfo(req.params.chatId);
        res.json(info);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
