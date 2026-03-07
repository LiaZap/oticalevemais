-- Migration 003: Add performance indexes
-- Ótica Leve Mais — Índices para queries frequentes

-- Índice para ordenar mensagens por timestamp (usado em todas as queries de chat)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp
ON tb_whatsapp_messages(timestamp DESC);

-- Índice composto para buscar mensagens por chat + timestamp (query principal)
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_timestamp
ON tb_whatsapp_messages(chat_id, timestamp DESC);

-- Índice para ordenar chats por última mensagem (listagem de contatos)
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_last_msg_timestamp
ON tb_whatsapp_chats(last_message_timestamp DESC);

-- Índice para buscar atendimentos por telefone (usado no upsert)
CREATE INDEX IF NOT EXISTS idx_atendimentos_telefone
ON tb_atendimentos(telefone_cliente);

-- Índice para buscar atendimentos por chat_id (usado no follow-up)
CREATE INDEX IF NOT EXISTS idx_atendimentos_chat_id
ON tb_atendimentos(chat_id);

-- Índice para buscar atendimentos abertos (usado no follow-up e dashboard)
CREATE INDEX IF NOT EXISTS idx_atendimentos_status
ON tb_atendimentos(status) WHERE status NOT IN ('Finalizado', 'Cancelado');

-- Índice para relatórios por data
CREATE INDEX IF NOT EXISTS idx_atendimentos_data_inicio
ON tb_atendimentos(data_inicio DESC);

-- Índice para follow-up: atendimentos que precisam de follow-up
CREATE INDEX IF NOT EXISTS idx_atendimentos_followup
ON tb_atendimentos(followup_tier, ultima_interacao)
WHERE status NOT IN ('Finalizado', 'Cancelado') AND chat_id IS NOT NULL AND followup_tier < 3;
