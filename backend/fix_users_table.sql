-- Esse script corrige a tabela existente adicionando as colunas que faltam

-- 1. Adicionar colunas 'status' e 'role' caso não existam
ALTER TABLE tb_usuarios ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Ativo';
ALTER TABLE tb_usuarios ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'vendedor';

-- 2. Inserir o Usuário Admin
INSERT INTO tb_usuarios (nome, email, senha_hash, role, status)
VALUES (
    'Administrador', 
    'admin@oticalevemais.com.br', 
    '$2a$10$bwVS/q3.2.1.0.9.8.7.6.5.4.3.2.1.0.9.8.7.6.5.4.3.2.1', 
    'admin', 
    'Ativo'
)
ON CONFLICT (email) DO NOTHING;
