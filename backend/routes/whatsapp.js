const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const whatsappService = require('../services/whatsappService');

// Configurar multer para upload de mídia
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E6)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|mp4|avi|mov|mkv|ogg|opus|mp3|wav|m4a|pdf|doc|docx/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype.split('/')[1]) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/');
        if (ext || mime) return cb(null, true);
        cb(new Error('Tipo de arquivo não permitido'));
    }
});

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

// Upload file and get URL
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

        // Build public URL for the file
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        // Detect media type for Uazapi
        let type = 'document';
        if (req.file.mimetype.startsWith('image/')) type = 'image';
        else if (req.file.mimetype.startsWith('video/')) type = 'video';
        else if (req.file.mimetype.startsWith('audio/')) type = 'ptt';

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            type: type,
            size: req.file.size
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Send media message
router.post('/send-media', async (req, res) => {
    const { chatId, type, fileUrl, caption } = req.body;
    try {
        if (!chatId || !type || !fileUrl) {
            return res.status(400).json({ error: 'chatId, type e fileUrl são obrigatórios' });
        }
        await whatsappService.sendMedia(chatId, type, fileUrl, caption);

        // Save media message to DB
        const db = require('../db');
        const contentText = caption
            ? `[${type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : 'Áudio'}] ${caption}`
            : `[${type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : type === 'ptt' ? 'Áudio' : 'Arquivo'}]`;

        await db.query(`
            INSERT INTO tb_whatsapp_messages (whatsapp_id, chat_id, sender_id, content, timestamp)
            VALUES ($1, $2, 'me', $3, NOW())
            ON CONFLICT (whatsapp_id) DO NOTHING
        `, [`media_${Date.now()}`, chatId, contentText]);

        await db.query(`
            UPDATE tb_whatsapp_chats SET
                last_message_content = $1,
                last_message_timestamp = NOW()
            WHERE id = $2
        `, [contentText, chatId]);

        res.json({ success: true });
    } catch (err) {
        console.error('Send media error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Limpar uploads antigos (mais de 24h) - chamado periodicamente
router.delete('/cleanup-uploads', async (req, res) => {
    try {
        const now = Date.now();
        const files = fs.readdirSync(uploadsDir);
        let deleted = 0;
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stat = fs.statSync(filePath);
            if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
                fs.unlinkSync(filePath);
                deleted++;
            }
        }
        res.json({ success: true, deleted });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
