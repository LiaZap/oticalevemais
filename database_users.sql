-- Tabela de Usuários para Dashboard
-- Autor: Antigravity (Google Deepmind)
-- Data: 2026-02-11

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- Necessário para gen_random_uuid()

CREATE TABLE IF NOT EXISTS tb_usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL, -- Senha criptografada (bcrypt)
    role VARCHAR(20) DEFAULT 'gestor' CHECK (role IN ('admin', 'gestor', 'vendedor')),
    criado_em TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Inserir um usuário admin padrão (Senha: 'admin123' -> hash fictício para exemplo)
-- Na prática, a senha deve ser gerada pela aplicação usando bcrypt
-- INSERT INTO tb_usuarios (nome, email, senha_hash, role) VALUES 
-- ('Administrador', 'admin@oticalevemais.com.br', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxwKc.6PHs5.7JOF.6.lH3E.6Q', 'admin');

COMMENT ON TABLE tb_usuarios IS 'Tabela de usuários com acesso ao dashboard administrativo.';
