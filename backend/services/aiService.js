const OpenAI = require('openai');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const configStore = require('../configStore');

let openai = null;
let knowledgeBase = '';

// Initialize OpenAI client and load knowledge base
function initialize() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn('[AI] OPENAI_API_KEY not configured — AI responses disabled');
        return;
    }
    openai = new OpenAI({ apiKey });
    console.log('[AI] OpenAI client initialized');

    // Load knowledge base
    try {
        const kbPath = path.join(__dirname, '..', 'data', 'knowledge-base.json');
        const data = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
        // Build compact text for system prompt
        const categories = {};
        for (const item of data) {
            if (!categories[item.category]) categories[item.category] = [];
            categories[item.category].push(`P: ${item.q}\nR: ${item.a}`);
        }
        const parts = [];
        for (const [cat, items] of Object.entries(categories)) {
            parts.push(`=== ${cat} ===\n${items.join('\n\n')}`);
        }
        knowledgeBase = parts.join('\n\n');
        console.log(`[AI] Knowledge base loaded: ${data.length} Q&A pairs`);
    } catch (err) {
        console.error('[AI] Failed to load knowledge base:', err.message);
    }
}

// System prompt for Íris
const SYSTEM_PROMPT = `Você é a Íris, assistente virtual da Ótica Leve Mais, localizada em Dourados-MS.
Você é uma atendente exclusiva dessa ótica. Não represente nenhuma outra empresa.

IDENTIDADE:
- Você é a Íris, atendente virtual da Ótica Leve Mais
- A loja fica em Dourados-MS e atende clientes de Dourados e região
- Você MORA e TRABALHA em Dourados — fale como uma atendente LOCAL da cidade
- NUNCA diga "aí em Dourados", "aí na região", "aí na cidade" — você ESTÁ em Dourados, use "aqui em Dourados", "aqui na loja", "aqui na Ótica Leve Mais"
- NÃO pergunte "de qual cidade você é?" — assuma que o cliente é de Dourados ou região
- Se o cliente mencionar que é de outra cidade distante, informe que a loja é aqui em Dourados-MS e ofereça atendimento via WhatsApp

REGRAS DE COMPORTAMENTO:
- Tom: acolhedor, consultivo, leve e profissional
- Responda em 2 a 5 linhas, máximo
- Faça apenas 1 pergunta por mensagem
- Use 0 a 2 emojis por mensagem
- Não use tabelas, listas longas ou blocos grandes de texto
- Responda APENAS em texto puro (sem JSON, sem markdown, sem tags)
- SEMPRE termine com 1 pergunta curta para avançar o atendimento
- Avance apenas 1 passo por mensagem no fluxo

ESCOPO PERMITIDO (você SÓ atende sobre esses assuntos):
- Óculos de grau, armações, óculos de sol
- Lentes oftálmicas (simples/multifocal e tratamentos: antirreflexo, luz azul, fotossensível)
- Lentes de contato
- Consertos, ajustes, limpeza, manutenção, garantia de óculos
- Prazos e formas de pagamento da ótica
- Agendamento de consulta (oftalmologista, optometrista ou consulta na ótica)
- Dúvidas gerais de saúde visual (sem diagnóstico)

FORA DO ESCOPO — responda:
"Oi! Sou a Íris, da Ótica Leve Mais em Dourados 😊 Consigo te ajudar com óculos, lentes, consertos e cuidados com a visão. Me conta: você precisa de óculos de grau, solar ou conserto?"

SEGURANÇA MÉDICA:
Se o cliente mencionar dor forte, perda súbita de visão, trauma no olho, flashes/luzes repentinas, muitas moscas volantes de repente ou secreção intensa:
"Entendi. Como isso pode precisar de avaliação urgente, o ideal é procurar um oftalmologista o quanto antes. Se quiser, posso te ajudar a agendar uma consulta aqui na ótica. Qual dia e turno você prefere?"

INFORMAÇÕES DA LOJA:
- Nome: Ótica Leve Mais
- Endereço: Rua dos Missionários, 910 — em frente à porta principal do Hospital Cassems — Dourados-MS
- Horário: Seg–Sex 08h–18h (sem fechar no almoço) | Sáb 08h–12h | Dom e feriados: fechado
- Atendimento: presencial na loja e via WhatsApp

TIPOS DE CONSULTA (3 opções disponíveis):
1. Consulta com Oftalmologista: a partir de R$ 150 — médico especialista, exame completo
2. Consulta com Optometrista: R$ 80 — profissional habilitado, exame de refração para grau
3. Campanha Saúde Visual: consulta na ótica com condições especiais — NÃO é permanente, acontece de tempos em tempos. Só mencione se a campanha estiver ativa (você será informado quando estiver).

IMPORTANTE: NÃO ofereça a Campanha Saúde Visual como opção padrão. Ofereça apenas as consultas com Oftalmologista e Optometrista como opções regulares. A Campanha Saúde Visual só deve ser mencionada quando estiver em período ativo.

Quando o cliente pedir consulta, pergunte qual tipo ele prefere (oftalmologista ou optometrista) e explique a diferença de forma simples.

REGRA DE OURO: Entender a necessidade do cliente ANTES de falar valores.

PREÇOS (fale "a partir de" e só após entender a necessidade):
- Lentes visão simples: a partir de R$ 290
- Lentes multifocais: a partir de R$ 490
- Lentes simples com antirreflexo: a partir de R$ 390
- Lentes multifocais com antirreflexo: a partir de R$ 590
- Lentes simples com filtro de luz azul: a partir de R$ 490
- Lentes multifocais com filtro de luz azul: a partir de R$ 690
- Consulta oftalmologista: a partir de R$ 150
- Consulta optometrista: R$ 80
- Campanha Saúde Visual: consulta na ótica (apenas quando a campanha estiver ativa)
- Óculos de sol: a partir de R$ 190

FORMAS DE PAGAMENTO:
- Cartão de crédito: até 10x sem juros
- PIX ou dinheiro: condição à vista com desconto
- Link de pagamento online
- Entrada no PIX + restante no cartão
- Dividir em dois cartões

PRAZOS DE ENTREGA:
- Lentes simples: mesmo dia até 2 dias úteis (depende do grau)
- Multifocal simples: mesmo dia até 2 dias úteis
- Multifocal especial: 7 a 10 dias úteis
- Grau alto: prazo sob consulta

FLUXO DE ATENDIMENTO (avance 1 passo por vez):
1. Acolher e perguntar o nome do cliente
2. Descobrir a necessidade (sem falar valores): tem receita? é primeiro óculos? quer trocar lentes, armação ou ambos? usa muito tela/celular?
3. Educar com 1 dica curta se fizer sentido no contexto
4. Recomendar 1 caminho (orçamento, consulta, visita à loja ou conserto)
5. Só então mencionar valores "a partir de" + forma de pagamento
6. Fechar com 1 pergunta de próximo passo (agendar, ir à loja, enviar receita)

ATALHO CONSERTO:
"Entendi! É conserto de qual parte: haste, plaqueta, parafuso, lente riscada ou óculos torto? Se puder, me manda uma foto que eu já te digo o caminho mais rápido 😊"

FOTOS E RECEITAS:
- Quando o cliente mandar foto da receita, você vai receber os dados analisados automaticamente
- Confirme os dados da receita de forma resumida e amigável
- Identifique se é lente simples (sem adição) ou multifocal (com adição/ADD)
- Ofereça orçamento baseado nos dados
- Se a foto estiver ruim, peça para enviar novamente com melhor iluminação
- Incentive o cliente a enviar a receita: "Se tiver sua receita aí, pode me mandar uma foto que já faço o orçamento! 📋"

TRANSFERIR PARA HUMANO quando detectar:
- Reclamação ou insatisfação do cliente
- Pedido explícito de atendente humano
- Negociação especial (desconto grande, troca, devolução)
- 3 tentativas sem conseguir avançar no atendimento
- Dúvida sobre garantia ou política fora do padrão

DENTRO DO HORÁRIO COMERCIAL (Seg-Sex 08h-18h, Sáb 08h-12h):
Responda: "Perfeito — pra te atender da melhor forma, vou chamar um dos nossos atendentes aqui 😊 Só me confirma seu nome e o que você precisa, por favor?"

FORA DO HORÁRIO COMERCIAL (noite, domingos e feriados):
NÃO transfira para humano — não tem ninguém na loja agora!
Responda: "Entendo! No momento nossa equipe já encerrou o expediente, mas eu vou deixar tudo registrado aqui. Assim que abrirmos, um dos nossos atendentes vai te dar retorno, tá? Enquanto isso, posso te ajudar com mais alguma informação! 😊"
Continue atendendo normalmente após essa mensagem.

MENSAGEM FORA DE HORÁRIO (quando aplicável):
"No momento nossa equipe de vendas não está disponível, mas eu já vou adiantar algumas informações e iniciar seu atendimento! Me conta, como posso te ajudar?"

REGRA ABSOLUTA DE LOCALIDADE:
Você é de Dourados. Você está em Dourados. Você trabalha aqui.
NUNCA use: "aí em Dourados", "aí na região", "aí na cidade", "aí na loja"
SEMPRE use: "aqui em Dourados", "aqui na loja", "aqui na Ótica Leve Mais", "aqui na região"
Isso é OBRIGATÓRIO em TODA mensagem.`;


// Build dynamic system prompt with campaign info
async function buildSystemPrompt() {
    let prompt = SYSTEM_PROMPT;

    try {
        const campanhaAtiva = await configStore.get('CAMPANHA_SAUDE_VISUAL_ATIVA');
        console.log(`[AI] Campaign config: ATIVA=${campanhaAtiva}`);

        if (campanhaAtiva === 'true') {
            const inicio = await configStore.get('CAMPANHA_SAUDE_VISUAL_INICIO');
            const fim = await configStore.get('CAMPANHA_SAUDE_VISUAL_FIM');
            const descricao = await configStore.get('CAMPANHA_SAUDE_VISUAL_DESCRICAO');

            console.log(`[AI] Campaign dates: ${inicio} to ${fim}`);

            // Verifica se está dentro do período (se datas foram definidas)
            let dentroDoPeríodo = true;
            if (inicio && fim) {
                // Usa timezone de Dourados para comparação
                const agoraStr = new Date().toLocaleString('en-US', { timeZone: 'America/Campo_Grande' });
                const agora = new Date(agoraStr);
                const dataInicio = new Date(inicio + 'T00:00:00-04:00'); // UTC-4 Campo Grande
                const dataFim = new Date(fim + 'T23:59:59-04:00');
                dentroDoPeríodo = agora >= dataInicio && agora <= dataFim;
                console.log(`[AI] Campaign period check: now=${agora.toISOString()}, start=${dataInicio.toISOString()}, end=${dataFim.toISOString()}, inPeriod=${dentroDoPeríodo}`);
            }

            if (dentroDoPeríodo) {
                let periodoTexto = '';
                if (inicio && fim) {
                    periodoTexto = ` (válida de ${inicio.split('-').reverse().join('/')} até ${fim.split('-').reverse().join('/')})`;
                }

                prompt += `\n\n🟢 CAMPANHA SAÚDE VISUAL ATIVA${periodoTexto}:
A Campanha Saúde Visual está acontecendo agora! ${descricao || 'Consulta na ótica com condições especiais para quem vai fazer os óculos na loja.'}
Você PODE e DEVE mencionar essa campanha como uma TERCEIRA opção quando o cliente perguntar sobre consulta, exame de vista ou consulta gratuita.
Responda: "Sim! Estamos com a Campanha Saúde Visual ativa, que oferece consulta na ótica com condições especiais! Além dessa, temos consulta com oftalmologista (a partir de R$150) e com optometrista (R$80). Qual te interessa mais?"`;
            } else {
                // Campanha configurada mas fora do período
                prompt += `\n\n⚪ CAMPANHA SAÚDE VISUAL: Fora do período ativo. NÃO mencione a campanha proativamente.
Se o cliente perguntar sobre consulta gratuita ou Saúde Visual, responda: "A Campanha Saúde Visual acontece em alguns períodos especiais aqui na Ótica Leve Mais! No momento não estamos com ela ativa, mas fazemos de tempos em tempos. Enquanto isso, temos consulta com oftalmologista (a partir de R$150) e com optometrista (R$80). Quer que eu te ajude a agendar?"`;
            }
        } else {
            // Campanha desativada — orientar IA sobre consulta gratuita
            prompt += `\n\n⚪ CAMPANHA SAÚDE VISUAL: Não está ativa no momento.
Se o cliente perguntar sobre consulta gratuita, saúde visual, ou exame gratuito, responda: "A Ótica Leve Mais realiza a Campanha Saúde Visual em alguns períodos especiais, com condições diferenciadas! No momento não estamos com ela ativa, mas acontece de tempos em tempos. Posso te ajudar a agendar uma consulta com oftalmologista (a partir de R$150) ou optometrista (R$80)?"
NÃO diga que "não temos" ou "não oferecemos" consulta gratuita. Diga que "acontece em períodos especiais" e "no momento não está ativa".`;
        }
    } catch (err) {
        console.error('[AI] Error reading campaign config:', err.message);
    }

    return prompt;
}

// Get chat history for context
async function getChatHistory(chatId, limit = 20) {
    const res = await db.query(
        `SELECT sender_id, content, timestamp
         FROM tb_whatsapp_messages
         WHERE chat_id = $1
         ORDER BY timestamp DESC
         LIMIT $2`,
        [chatId, limit]
    );
    // Reverse so oldest first
    return res.rows.reverse();
}

// Generate AI response for a chat message
async function generateResponse(chatId, incomingMessage) {
    if (!openai) {
        console.warn('[AI] OpenAI not initialized, skipping response');
        return null;
    }

    try {
        // Get conversation history for context
        const history = await getChatHistory(chatId);

        // Build dynamic system prompt (includes campaign info if active)
        const dynamicPrompt = await buildSystemPrompt();

        // Build messages array for OpenAI
        const messages = [
            {
                role: 'system',
                content: dynamicPrompt + '\n\n--- BASE DE CONHECIMENTO ---\n' + knowledgeBase
            }
        ];

        // Add conversation history (skip the very last one since that's the incoming message)
        for (const msg of history) {
            if (msg.content === incomingMessage && msg === history[history.length - 1]) continue;
            messages.push({
                role: msg.sender_id === 'me' ? 'assistant' : 'user',
                content: msg.content
            });
        }

        // Add the current incoming message
        messages.push({ role: 'user', content: incomingMessage });

        // Call OpenAI
        const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
        const completion = await openai.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 500
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (!reply) return null;

        // Now extract structured data in a separate call (cheaper, focused)
        const extractedData = await extractData(chatId, history, incomingMessage);

        return { reply, data: extractedData };
    } catch (err) {
        console.error('[AI] Error generating response:', err.message);
        return null;
    }
}

// Extract structured data from conversation
async function extractData(chatId, history, latestMessage) {
    if (!openai) return {};

    try {
        // Build conversation text for extraction
        const convoText = history.map(m =>
            `${m.sender_id === 'me' ? 'Íris' : 'Cliente'}: ${m.content}`
        ).join('\n') + `\nCliente: ${latestMessage}`;

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            messages: [
                {
                    role: 'system',
                    content: `Analise a conversa abaixo e extraia dados do CLIENTE em JSON.
Retorne APENAS o JSON, sem texto extra. Campos:
- "nome": nome do cliente (string ou null)
- "cidade": cidade do cliente (string ou null)
- "intencao": intenção principal: "Orçamento", "Agendamento", "Consulta", "Conserto", "Dúvida", "Compra", "Exame de Vista" ou null
- "tem_receita": se o cliente mencionou ter receita (true/false/null)
- "tipo_lente": "Simples", "Multifocal" ou null (baseado no contexto)
- "handoff": true se o cliente pediu atendente humano, fez reclamação ou a conversa está travada; false caso contrário
- "agendou": true se o cliente confirmou agendamento; false caso contrário

Conversa:
${convoText}`
                }
            ],
            temperature: 0,
            max_tokens: 200,
            response_format: { type: 'json_object' }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return {};
        return JSON.parse(content);
    } catch (err) {
        console.error('[AI] Error extracting data:', err.message);
        return {};
    }
}

// Create or update atendimento from extracted data
async function upsertAtendimento(chatId, telefone, extractedData) {
    if (!extractedData || Object.keys(extractedData).length === 0) return;

    try {
        // Check if there's an open atendimento for this chat
        const existing = await db.query(
            `SELECT id, cliente, cidade, intencao_detectada, tem_receita, classificacao_lente, seguiu_fluxo_agendamento
             FROM tb_atendimentos
             WHERE chat_id = $1 AND status NOT IN ('Finalizado', 'Cancelado')
             ORDER BY data_inicio DESC LIMIT 1`,
            [chatId]
        );

        const nome = extractedData.nome || null;
        const cidade = extractedData.cidade || null;
        const intencao = extractedData.intencao || null;
        const temReceita = extractedData.tem_receita ?? null;
        const tipoLente = extractedData.tipo_lente || null;
        const agendou = extractedData.agendou || false;
        const receitaDados = extractedData.receita_dados || null;

        if (existing.rows.length > 0) {
            // Update existing — never overwrite non-null with null
            const row = existing.rows[0];
            await db.query(
                `UPDATE tb_atendimentos SET
                    cliente = COALESCE($1, cliente),
                    cidade = COALESCE($2, cidade),
                    intencao_detectada = COALESCE($3, intencao_detectada),
                    tem_receita = COALESCE($4, tem_receita),
                    classificacao_lente = COALESCE($5, classificacao_lente),
                    seguiu_fluxo_agendamento = CASE WHEN $6 = true THEN true ELSE seguiu_fluxo_agendamento END,
                    ultima_interacao = NOW(),
                    followup_tier = 0,
                    receita_dados = COALESCE($8, receita_dados)
                 WHERE id = $7`,
                [nome, cidade, intencao, temReceita, tipoLente, agendou, row.id, receitaDados]
            );
        } else {
            // Create new atendimento
            await db.query(
                `INSERT INTO tb_atendimentos
                    (telefone_cliente, cliente, cidade, intencao_detectada, tem_receita,
                     classificacao_lente, chat_id, canal_entrada, status, ultima_interacao, receita_dados)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'WhatsApp', 'Pendente', NOW(), $8)`,
                [telefone, nome, cidade, intencao, temReceita, tipoLente, chatId, receitaDados]
            );
        }
    } catch (err) {
        console.error('[AI] Error upserting atendimento:', err.message);
    }
}

// Reset follow-up tier when customer responds (called from webhook)
async function resetFollowupOnResponse(chatId) {
    try {
        await db.query(
            `UPDATE tb_atendimentos
             SET followup_tier = 0, ultima_interacao = NOW(), respondeu_followup = TRUE
             WHERE chat_id = $1 AND status NOT IN ('Finalizado', 'Cancelado')`,
            [chatId]
        );
    } catch (err) {
        console.error('[AI] Error resetting followup tier:', err.message);
    }
}

// =============================================
// ANALYZE IMAGE — Receita / Fotos do cliente
// Usa OpenAI Vision para interpretar imagens
// =============================================
async function analyzeImage(chatId, imageUrl, caption) {
    if (!openai) {
        console.warn('[AI] OpenAI not initialized, skipping image analysis');
        return null;
    }

    try {
        // Get conversation history for context
        const history = await getChatHistory(chatId, 10);

        // Build conversation context
        const convoContext = history.map(m =>
            `${m.sender_id === 'me' ? 'Íris' : 'Cliente'}: ${m.content}`
        ).join('\n');

        // Determine if image is base64 or URL
        let imageContent;
        if (imageUrl.startsWith('data:') || imageUrl.startsWith('/9j/') || imageUrl.length > 500) {
            // Base64
            const base64Data = imageUrl.startsWith('data:') ? imageUrl : `data:image/jpeg;base64,${imageUrl}`;
            imageContent = { type: 'image_url', image_url: { url: base64Data } };
        } else {
            // URL
            imageContent = { type: 'image_url', image_url: { url: imageUrl } };
        }

        const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
        console.log(`[AI] Analyzing image with ${model} for ${chatId}`);

        const completion = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: `Você é a Íris, atendente da Ótica Leve Mais em Dourados-MS.
O cliente acabou de enviar uma IMAGEM. Analise a imagem e responda de forma natural.

SE FOR UMA RECEITA OFTALMOLÓGICA:
- Leia os dados: OD (olho direito), OE (olho esquerdo), Esférico, Cilíndrico, Eixo, Adição/ADD, DNP/DP
- Confirme os dados com o cliente de forma amigável
- Identifique se é lente simples (sem ADD) ou multifocal (com ADD)
- Pergunte se quer um orçamento
- Formato da resposta: comece com "Recebi sua receita! 📋" e liste os dados de forma clara

SE FOR OUTRA IMAGEM (óculos quebrado, armação, etc.):
- Descreva o que vê
- Ofereça ajuda adequada (conserto, orçamento, etc.)

SE NÃO CONSEGUIR LER A IMAGEM:
- Peça para o cliente enviar novamente com melhor qualidade/iluminação

REGRAS:
- Tom: acolhedor, profissional
- Use "aqui na loja", "aqui na Ótica Leve Mais" (você é de Dourados)
- 0-2 emojis
- Responda em texto puro
- Máximo 5 linhas${caption ? `\n\nO cliente enviou com a legenda: "${caption}"` : ''}

Contexto da conversa até agora:
${convoContext || '(primeira mensagem)'}`
                },
                {
                    role: 'user',
                    content: [
                        imageContent,
                        { type: 'text', text: caption || 'O cliente enviou esta imagem.' }
                    ]
                }
            ],
            temperature: 0.5,
            max_tokens: 600
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (!reply) return null;

        // Now try to extract prescription data if it looks like a prescription
        let prescriptionData = null;
        if (reply.includes('receita') || reply.includes('OD') || reply.includes('OE') ||
            reply.includes('esférico') || reply.includes('grau') || reply.includes('Esf')) {
            prescriptionData = await extractPrescriptionData(chatId, imageUrl, imageContent);
        }

        return { reply, prescriptionData };
    } catch (err) {
        console.error('[AI] Error analyzing image:', err.message);
        return null;
    }
}

// Extract structured prescription data from image
async function extractPrescriptionData(chatId, imageUrl, imageContent) {
    if (!openai) return null;

    try {
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            messages: [
                {
                    role: 'system',
                    content: `Analise esta receita oftalmológica e extraia os dados em JSON puro.
Retorne APENAS o JSON, sem texto extra. Se não conseguir ler algum campo, use null.

Formato:
{
  "od_esferico": "+2.00 ou -1.50 etc",
  "od_cilindrico": "-0.75 etc ou null",
  "od_eixo": "180 etc ou null",
  "oe_esferico": "+2.00 ou -1.50 etc",
  "oe_cilindrico": "-0.75 etc ou null",
  "oe_eixo": "180 etc ou null",
  "adicao": "+2.00 etc ou null (ADD, Adição)",
  "dnp": "32/30 etc ou null (DNP, DP, distância pupilar)",
  "tipo_lente": "Simples ou Multifocal (Multifocal se tem ADD/Adição)",
  "medico": "nome do médico ou null",
  "crm": "número CRM ou null",
  "validade": "data de validade ou null",
  "observacoes": "qualquer observação relevante ou null"
}`
                },
                {
                    role: 'user',
                    content: [
                        imageContent,
                        { type: 'text', text: 'Extraia os dados desta receita oftalmológica em JSON.' }
                    ]
                }
            ],
            temperature: 0,
            max_tokens: 400,
            response_format: { type: 'json_object' }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return null;

        const data = JSON.parse(content);
        console.log(`[AI] Prescription data extracted:`, JSON.stringify(data).substring(0, 200));

        return {
            tem_receita: true,
            tipo_lente: data.tipo_lente || (data.adicao ? 'Multifocal' : 'Simples'),
            intencao: 'Orçamento',
            receita_dados: JSON.stringify(data) // Salva os dados completos como JSON string
        };
    } catch (err) {
        console.error('[AI] Error extracting prescription data:', err.message);
        return null;
    }
}

// =============================================
// TRANSCRIBE AUDIO — Whisper API
// =============================================
async function transcribeAudio(audioUrl) {
    if (!openai) {
        console.warn('[AI] OpenAI not initialized, skipping transcription');
        return null;
    }

    try {
        // Download the audio file
        const response = await require('axios').get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        // Create a file-like object for the API
        const audioBuffer = Buffer.from(response.data);

        // Detect format from URL or content-type
        let ext = 'ogg';
        if (audioUrl.includes('.mp3')) ext = 'mp3';
        else if (audioUrl.includes('.m4a')) ext = 'm4a';
        else if (audioUrl.includes('.wav')) ext = 'wav';
        else if (audioUrl.includes('.webm')) ext = 'webm';

        // Use OpenAI Whisper to transcribe
        const file = new File([audioBuffer], `audio.${ext}`, {
            type: ext === 'ogg' ? 'audio/ogg' : ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`
        });

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            language: 'pt',
            response_format: 'text'
        });

        const text = typeof transcription === 'string' ? transcription.trim() : transcription.text?.trim();

        if (!text || text.length < 2) {
            console.log('[AI] Transcription empty or too short');
            return null;
        }

        console.log(`[AI] Whisper transcription (${audioBuffer.length} bytes): "${text.substring(0, 100)}"`);
        return text;

    } catch (err) {
        console.error('[AI] Error transcribing audio:', err.message);
        return null;
    }
}

module.exports = { initialize, generateResponse, analyzeImage, transcribeAudio, upsertAtendimento, resetFollowupOnResponse };
