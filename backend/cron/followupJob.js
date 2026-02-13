const configStore = require('../configStore');
const cron = require('node-cron');
const db = require('../db');

// Configuração do Cron Job
// Para demonstração, roda a cada 1 minuto: '* * * * *'
// Para produção, recomendaria a cada hora: '0 * * * *'
const SCHEDULE = '* * * * *'; 

const runFollowUpCheck = async () => {
    console.log(`[Cron] Iniciando verificação de follow-up: ${new Date().toISOString()}`);
    
    try {
        // Obter mensagem configurada
        const messageTemplate = await configStore.get('FOLLOWUP_MSG');

        // Encontrar atendimentos que:
        // 1. Começaram há mais de 24 horas
        // 2. Ainda não foram finalizados (estão Pendentes, Em Andamento, etc)
        // 3. Ainda não receberam follow-up (followup_enviado = false)
        // 4. Não agendaram (seguiu_fluxo_agendamento = false)
        
        const query = `
            SELECT id, telefone_cliente, data_inicio 
            FROM tb_atendimentos 
            WHERE 
                data_inicio < NOW() - INTERVAL '24 hours'
                AND status NOT IN ('Finalizado', 'Cancelado')
                AND followup_enviado = FALSE
                AND seguiu_fluxo_agendamento = FALSE
            LIMIT 50;
        `;

        const { rows } = await db.query(query);

        if (rows.length === 0) {
            console.log('[Cron] Nenhum atendimento precisando de follow-up encontrado.');
            return;
        }

        console.log(`[Cron] Encontrados ${rows.length} atendimentos para follow-up.`);

        // Processar cada atendimento
        for (const atendimento of rows) {
            // AQUI: Integrar com API de envio de mensagem se existir
            // ex: await whatsappService.sendMessage(atendimento.telefone_cliente, message);
            
            // Como não temos a coluna nome, usamos "Cliente" ou o próprio número
            const nomeCliente = "Cliente"; 
            const message = messageTemplate ? messageTemplate.replace('{cliente}', nomeCliente) : "Olá, podemos ajudar?";
            
            console.log(`[Cron] Enviando follow-up simulado para: ${atendimento.telefone_cliente} (${atendimento.id})`);
            console.log(`[Mensagem]: "${message}"`);

            // Atualizar status no banco
            await db.query(
                `UPDATE tb_atendimentos 
                 SET followup_enviado = TRUE, status = 'Aguardando Retorno' 
                 WHERE id = $1`,
                [atendimento.id]
            );
        }

        console.log(`[Cron] Processamento concluído. ${rows.length} atualizados.`);

    } catch (error) {
        console.error('[Cron] Erro ao executar job de follow-up:', error);
    }
};

// Iniciar o Job
const start = () => {
    console.log(`[Cron] Serviço de Follow-up agendado para: ${SCHEDULE}`);
    cron.schedule(SCHEDULE, runFollowUpCheck);
};

module.exports = { start, runFollowUpCheck };
