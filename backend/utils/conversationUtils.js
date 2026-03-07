// Shared utility: Detect conversation closers
// Used by whatsappService.js and followupJob.js

function isConversationCloser(text) {
    if (!text) return false;
    const normalized = text.toLowerCase().trim().replace(/[!?.…,]+$/, '').trim();

    // Só considera como closer se for uma mensagem CURTA
    // Mensagens longas como "ok vou pensar sobre o orçamento dos óculos" NÃO são closers
    if (normalized.length > 50) return false;

    const closers = [
        'ok', 'okay', 'ta', 'tá', 'tá bom', 'ta bom', 'tudo bem', 'blz', 'beleza',
        'obrigado', 'obrigada', 'obg', 'brigado', 'brigada', 'valeu', 'vlw',
        'agradeço', 'agradeco', 'muito obrigado', 'muito obrigada',
        'ok obrigado', 'ok obrigada', 'tá obrigado', 'tá obrigada',
        'entendi', 'entendido', 'perfeito', 'certo', 'certinho',
        'vou pensar', 'vou ver', 'depois eu vejo', 'depois vejo',
        'não precisa', 'nao precisa', 'não quero', 'nao quero',
        'por enquanto é isso', 'por enquanto e isso', 'era isso', 'era só isso',
        'até mais', 'ate mais', 'tchau', 'flw', 'falou', 'abraço', 'abraco',
        'bom dia', 'boa tarde', 'boa noite'
    ];

    if (closers.includes(normalized)) return true;

    // Mensagens curtas que COMEÇAM com um closer
    if (normalized.length < 30) {
        for (const c of closers) {
            if (normalized.startsWith(c + ' ') || normalized.startsWith(c + ',')) return true;
        }
    }

    return false;
}

module.exports = { isConversationCloser };
