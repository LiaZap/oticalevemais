-- Tabela de Atendimentos Otimizada para Analytics e Gestão
-- Autor: Antigravity (Google Deepmind)
-- Data: 2026-02-11

CREATE TABLE IF NOT EXISTS tb_atendimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Identificador único do atendimento
    telefone_cliente VARCHAR(50) NOT NULL, -- Telefone do cliente (pode ser hash ou texto, dependendo da LGPD)
    data_inicio TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(), -- Data e hora do início do atendimento
    
    -- Status do atendimento
    status VARCHAR(20) CHECK (status IN ('novo', 'em_andamento', 'aguardando_followup', 'recuperado', 'finalizado')) NOT NULL DEFAULT 'novo',
    
    -- Intenção detectada pela IA
    intencao_detectada VARCHAR(100), -- Ex: 'Orçamento', 'Exame', 'Dúvida', 'Agendamento', etc.
    
    -- Métricas de Conversão
    seguiu_fluxo_agendamento BOOLEAN DEFAULT FALSE, -- Se o cliente chegou a marcar horário
    
    -- Métricas de Recuperação (Follow-up)
    followup_enviado BOOLEAN DEFAULT FALSE, -- Se o sistema enviou a mensagem de follow-up
    respondeu_followup BOOLEAN DEFAULT FALSE -- Se o cliente respondeu ao follow-up (Recuperação)
);

-- Índices para otimizar as consultas do Dashboard

-- 1. Índice para filtrar por data (essencial para qualquer filtro de período)
CREATE INDEX IF NOT EXISTS idx_tb_atendimentos_data_inicio ON tb_atendimentos (data_inicio);

-- 2. Índice para agrupar por intenção (KPI 2)
CREATE INDEX IF NOT EXISTS idx_tb_atendimentos_intencao ON tb_atendimentos (intencao_detectada);

-- 3. Índice para filtrar por status (útil para funil)
CREATE INDEX IF NOT EXISTS idx_tb_atendimentos_status ON tb_atendimentos (status);

-- 4. Índice composto para métricas de follow-up (KPI 3)
CREATE INDEX IF NOT EXISTS idx_tb_atendimentos_followup ON tb_atendimentos (followup_enviado, respondeu_followup);

COMMENT ON TABLE tb_atendimentos IS 'Tabela que registra os atendimentos automáticos do WhatsApp para análise de BI.';
COMMENT ON COLUMN tb_atendimentos.intencao_detectada IS 'Motivo do contato identificado pela IA (Ex: Orçamento, Agendamento).';
COMMENT ON COLUMN tb_atendimentos.respondeu_followup IS 'Indica se o cliente retornou após a mensagem de reengajamento.';
