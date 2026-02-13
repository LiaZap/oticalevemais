const express = require('express');
const router = express.Router();
const configStore = require('../configStore');

// GET all settings
router.get('/', async (req, res) => {
    try {
        const config = await configStore.getAll();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

// UPDATE a setting
router.post('/', async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: 'Key is required' });
        
        const updatedConfig = await configStore.set(key, value);
        res.json(updatedConfig);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save setting' });
    }
});

module.exports = router;
