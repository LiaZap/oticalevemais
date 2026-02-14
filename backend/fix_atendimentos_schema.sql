-- Script Completo de Correção da Tabela de Atendimentos
-- Este script garante que TODAS as colunas necessárias existam.

-- 1. Cria a tabela se ela não existir (Schema completo correto)
CREATE TABLE IF NOT EXISTS tb_atendimentos (
    id SERIAL PRIMARY KEY,
    cliente VARCHAR(255),
    telefone_cliente VARCHAR(50),
    canal_entrada VARCHAR(50),
    tipo_servico VARCHAR(50),
    data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Pendente',
    observacoes TEXT,
    data_nascimento DATE,
    classificacao_lente VARCHAR(50)
);

-- 2. Se a tabela JÁ EXISTIA, adiciona as colunas que podem estar faltando
-- Isso resolve o erro "column cliente does not exist"

ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS cliente VARCHAR(255);
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS telefone_cliente VARCHAR(50);
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS canal_entrada VARCHAR(50);
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS tipo_servico VARCHAR(50);
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pendente';
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS classificacao_lente VARCHAR(50);
