import axios from 'axios';

// URLs Default (Fallback)
const DEFAULT_WEBHOOK_URLS = {
  NEW_ATENDIMENTO: 'https://n8n.example.com/webhook/novo-atendimento',
  STATUS_UPDATE: 'https://n8n.example.com/webhook/atualizacao-status'
};

const getWebhookUrl = (eventType) => {
  try {
    const savedConfig = localStorage.getItem('n8n_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      return config[eventType] || DEFAULT_WEBHOOK_URLS[eventType];
    }
  } catch (e) {
    console.error('Erro ao ler configuração do n8n:', e);
  }
  return DEFAULT_WEBHOOK_URLS[eventType];
};

/**
 * Envia dados para um webhook do n8n (Fire and Forget)
 * @param {string} eventType - Chave do evento (ex: 'NEW_ATENDIMENTO')
 * @param {object} payload - Dados a serem enviados
 */
export const sendToN8N = async (eventType, payload) => {
  const url = getWebhookUrl(eventType);

  if (!url || url.includes('example.com')) {
    console.log(`[n8n Mock] Webhook ${eventType} disparado com dados:`, payload);
    return; // Não envia se for URL de exemplo
  }

  try {
    // Envio assíncrono (não bloqueia a UI)
    await axios.post(url, {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload
    });
    console.log(`[n8n] Webhook ${eventType} enviado com sucesso!`);
  } catch (error) {
    console.error(`[n8n] Erro ao enviar webhook ${eventType}:`, error);
  }
};
