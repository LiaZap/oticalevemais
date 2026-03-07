const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');

// Default configuration
const DEFAULTS = {
    FOLLOWUP_MSG: "Olá {cliente}, tudo bem? Vi que você entrou em contato conosco recentemente. Ficou alguma dúvida ou gostaria de agendar um horário?",
    AI_ENABLED: "true",
    FOLLOWUP_ENABLED: "true",
    FOLLOWUP_TIER1_MINUTES: "30",
    FOLLOWUP_TIER2_MINUTES: "120",
    FOLLOWUP_TIER3_MINUTES: "1440",
    CAMPANHA_SAUDE_VISUAL_ATIVA: "false",
    CAMPANHA_SAUDE_VISUAL_INICIO: "",
    CAMPANHA_SAUDE_VISUAL_FIM: "",
    CAMPANHA_SAUDE_VISUAL_DESCRICAO: "Consulta na ótica com condições especiais para quem vai fazer os óculos na loja."
};

// Helper to ensure file exists
const ensureFile = async () => {
    try {
        await fs.access(CONFIG_FILE);
    } catch {
        await fs.writeFile(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2));
    }
};

const getAll = async () => {
    await ensureFile();
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
};

const get = async (key) => {
    const config = await getAll();
    return config[key] || DEFAULTS[key];
};

const set = async (key, value) => {
    const config = await getAll();
    config[key] = value;
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    return config;
};

module.exports = {
    getAll,
    get,
    set
};
