const db = require('./db');

const testCron = async () => {
    try {
        console.log('Criando atendimento atrasado para teste...');
        
        // Inserir atendimento com data de 25 horas atrás
        const result = await db.query(`
            INSERT INTO tb_atendimentos (cliente, telefone, data_inicio, status, followup_enviado, seguiu_fluxo_agendamento)
            VALUES ('Cliente Teste Cron', '11999999999', NOW() - INTERVAL '25 hours', 'Pendente', FALSE, FALSE)
            RETURNING id;
        `);
        
        const id = result.rows[0].id;
        console.log(`Atendimento criado com ID: ${id}`);
        console.log('Agora execute o cron job acessando http://localhost:5000/api/test-cron ou aguarde 1 minuto.');
        
    } catch (error) {
        console.error('Erro:', error);
    }
};

testCron();
