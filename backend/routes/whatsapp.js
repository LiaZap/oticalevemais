const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const whatsappService = require('../services/whatsappService');
const auth = require('../middleware/auth');

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
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|mp4|avi|mov|mkv|ogg|opus|mp3|wav|m4a|pdf|doc|docx/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') || allowed.test(file.mimetype.split('/')[1]);
        if (ext || mime) return cb(null, true);
        cb(new Error('Tipo de arquivo não permitido'));
    }
});

// Get status — PROTEGIDO
router.get('/status', auth, async (req, res) => {
    try { res.json(await whatsappService.getStatus()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all chats — PROTEGIDO
router.get('/chats', auth, async (req, res) => {
    try { res.json(await whatsappService.getContacts()); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Get messages — PROTEGIDO
router.get('/messages/:chatId', auth, async (req, res) => {
    try { res.json(await whatsappService.getMessages(req.params.chatId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Send message — PROTEGIDO + Validação
router.post('/send', auth, async (req, res) => {
    const { chatId, content } = req.body;
    if (!chatId || typeof chatId !== 'string') return res.status(400).json({ error: 'chatId é obrigatório' });
    if (!content || typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'content é obrigatório' });
    try {
        await whatsappService.sendMessage(chatId, content.trim());
        res.json({ success: true });
    } catch (err) {
        console.error('[WhatsApp] Send error:', err.message);
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
});

// Webhook — SEM auth (Uazapi precisa acessar)
router.post('/webhook', async (req, res) => {
    try { await whatsappService.processWebhook(req.body); res.sendStatus(200); }
    catch (err) { console.error("[WhatsApp] Webhook error:", err.message); res.sendStatus(500); }
});

// Mark as read — PROTEGIDO
router.put('/chats/:chatId/read', auth, async (req, res) => {
    try {
        const db = require('../db');
        await db.query('UPDATE tb_whatsapp_chats SET unread_count = 0 WHERE id = $1', [req.params.chatId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Set chat mode — PROTEGIDO
router.put('/chats/:chatId/mode', auth, async (req, res) => {
    try { res.json(await whatsappService.setChatMode(req.params.chatId, req.body.mode)); }
    catch (err) { res.status(400).json({ error: err.message }); }
});

// Get chat info — PROTEGIDO
router.get('/chats/:chatId/info', auth, async (req, res) => {
    try { res.json(await whatsappService.getChatInfo(req.params.chatId)); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

// Upload — PROTEGIDO
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
        let type = 'document';
        if (req.file.mimetype.startsWith('image/')) type = 'image';
        else if (req.file.mimetype.startsWith('video/')) type = 'video';
        else if (req.file.mimetype.startsWith('audio/')) type = 'ptt';
        res.json({ success: true, url: fileUrl, filename: req.file.filename, originalName: req.file.originalname, type, size: req.file.size });
    } catch (err) { console.error('[WhatsApp] Upload error:', err.message); res.status(500).json({ error: 'Erro no upload' }); }
});

// Send media — PROTEGIDO
router.post('/send-media', auth, async (req, res) => {
    const { chatId, type, fileUrl, caption } = req.body;
    if (!chatId || !type || !fileUrl) return res.status(400).json({ error: 'chatId, type e fileUrl são obrigatórios' });
    try {
        await whatsappService.sendMedia(chatId, type, fileUrl, caption);
        const db = require('../db');
        const contentText = caption
            ? `[${type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : 'Áudio'}] ${caption}`
            : `[${type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : type === 'ptt' ? 'Áudio' : 'Arquivo'}]`;
        await db.query(`INSERT INTO tb_whatsapp_messages (whatsapp_id, chat_id, sender_id, content, timestamp) VALUES ($1, $2, 'me', $3, NOW()) ON CONFLICT (whatsapp_id) DO NOTHING`, [`media_${Date.now()}`, chatId, contentText]);
        await db.query(`UPDATE tb_whatsapp_chats SET last_message_content = $1, last_message_timestamp = NOW() WHERE id = $2`, [contentText, chatId]);
        res.json({ success: true });
    } catch (err) { console.error('[WhatsApp] Send media error:', err.message); res.status(500).json({ error: 'Erro ao enviar mídia' }); }
});

// Limpar uploads antigos — PROTEGIDO + Async
router.delete('/cleanup-uploads', auth, async (req, res) => {
    try {
        const now = Date.now();
        const files = await fsPromises.readdir(uploadsDir);
        let deleted = 0;
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stat = await fsPromises.stat(filePath);
            if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
                await fsPromises.unlink(filePath);
                deleted++;
            }
        }
        res.json({ success: true, deleted });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
