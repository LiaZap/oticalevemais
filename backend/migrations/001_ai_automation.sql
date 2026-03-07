-- Migration: AI Automation + Follow-up System
-- Adds columns for AI/human handoff, follow-up tiers, and chat linking

-- ============================================
-- tb_whatsapp_chats: AI/Human mode control
-- ============================================
ALTER TABLE tb_whatsapp_chats ADD COLUMN IF NOT EXISTS atendimento_mode VARCHAR(10) DEFAULT 'auto';
-- 'auto' = IA fora do horário, humano no horário
-- 'human' = vendedor assumiu (IA silenciosa)
-- 'ai' = IA sempre responde

ALTER TABLE tb_whatsapp_chats ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE tb_whatsapp_chats ADD COLUMN IF NOT EXISTS ai_context_summary TEXT;

-- ============================================
-- tb_atendimentos: Follow-up tiers + chat link
-- ============================================
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS tem_receita BOOLEAN DEFAULT FALSE;
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS ultima_interacao TIMESTAMP DEFAULT NOW();
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS followup_tier INTEGER DEFAULT 0;
-- 0=nenhum, 1=30min enviado, 2=2h enviado, 3=24h enviado (encerrado)
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS followup_1_at TIMESTAMP;
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS followup_2_at TIMESTAMP;
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS followup_3_at TIMESTAMP;
ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS chat_id VARCHAR(255);

-- Index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_tb_atendimentos_chat_id ON tb_atendimentos (chat_id);
CREATE INDEX IF NOT EXISTS idx_tb_atendimentos_followup_tier ON tb_atendimentos (followup_tier);
CREATE INDEX IF NOT EXISTS idx_tb_atendimentos_ultima_interacao ON tb_atendimentos (ultima_interacao);
