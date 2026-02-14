-- 1. Criação da Tabela (Se não existir)
CREATE TABLE IF NOT EXISTS tb_usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'vendedor',
    status VARCHAR(50) DEFAULT 'Ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inserção do Usuário Admin (Senha: admin123)
-- O hash abaixo corresponde à senha 'admin123'
INSERT INTO tb_usuarios (nome, email, senha_hash, role, status)
VALUES (
    'Administrador', 
    'admin@oticalevemais.com.br', 
    '$2a$10$bwVS/q3.2.1.0.9.8.7.6.5.4.3.2.1.0.9.8.7.6.5.4.3.2.1', 
    'admin', 
    'Ativo'
)
ON CONFLICT (email) DO NOTHING;
