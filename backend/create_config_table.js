const db = require('./db');

const setupConfig = async () => {
    try {
        console.log('Criando tabela tb_configuracoes...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS tb_configuracoes (
                chave VARCHAR(50) PRIMARY KEY,
                valor TEXT
            );
        `);

        console.log('Inserindo configuração padrão...');
        const msg = "Olá {cliente}, tudo bem? Vi que você entrou em contato conosco recentemente. Ficou alguma dúvida ou gostaria de agendar um horário?";
        
        await db.query(`
            INSERT INTO tb_configuracoes (chave, valor)
            VALUES ('FOLLOWUP_MSG', $1)
            ON CONFLICT (chave) DO NOTHING;
        `, [msg]);

        console.log('Configuração inicial concluída com sucesso!');
    } catch (error) {
        console.error('Erro ao configurar banco:', error);
    }
};

setupConfig();
