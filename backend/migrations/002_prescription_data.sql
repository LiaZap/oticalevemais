-- Migration: Add prescription data column
-- Stores extracted prescription data from photo analysis (JSON)

ALTER TABLE tb_atendimentos ADD COLUMN IF NOT EXISTS receita_dados JSONB;
-- Stores: od_esferico, od_cilindrico, od_eixo, oe_esferico, oe_cilindrico, oe_eixo,
--         adicao, dnp, tipo_lente, medico, crm, validade, observacoes
