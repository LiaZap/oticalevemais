const express = require('express');
const router = express.Router();
const configStore = require('../configStore');
const auth = require('../middleware/auth');

// Whitelist de chaves permitidas
const ALLOWED_KEYS = [
    'AI_ENABLED', 'OPENAI_API_KEY', 'OPENAI_MODEL',
    'FOLLOWUP_ENABLED', 'FOLLOWUP_MSG',
    'FOLLOWUP_TIER1_MINUTES', 'FOLLOWUP_TIER2_MINUTES', 'FOLLOWUP_TIER3_MINUTES',
    'CAMPANHA_SAUDE_VISUAL_ATIVA', 'CAMPANHA_SAUDE_VISUAL_INICIO',
    'CAMPANHA_SAUDE_VISUAL_FIM', 'CAMPANHA_SAUDE_VISUAL_DESCRICAO'
];

// GET all settings — PROTEGIDO
router.get('/', auth, async (req, res) => {
    try {
        const config = await configStore.getAll();
        // Mascarar API key na resposta
        if (config.OPENAI_API_KEY) {
            const key = config.OPENAI_API_KEY;
            config.OPENAI_API_KEY = key.length > 8
                ? key.substring(0, 4) + '****' + key.substring(key.length - 4)
                : '****';
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

// UPDATE a setting — PROTEGIDO + Whitelist
router.post('/', auth, async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: 'Key is required' });

        if (!ALLOWED_KEYS.includes(key)) {
            return res.status(400).json({ error: `Chave '${key}' não é permitida` });
        }

        const updatedConfig = await configStore.set(key, value);

        if (updatedConfig.OPENAI_API_KEY) {
            const k = updatedConfig.OPENAI_API_KEY;
            updatedConfig.OPENAI_API_KEY = k.length > 8
                ? k.substring(0, 4) + '****' + k.substring(k.length - 4)
                : '****';
        }

        res.json(updatedConfig);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save setting' });
    }
});

module.exports = router;
