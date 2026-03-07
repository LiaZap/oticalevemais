-- Tabela de Conversas (Chats/Contatos)
CREATE TABLE IF NOT EXISTS tb_whatsapp_chats (
    id VARCHAR(255) PRIMARY KEY, -- ID do WhatsApp (ex: 5511999999999@s.whatsapp.net)
    name VARCHAR(255),
    photo_url TEXT,
    unread_count INT DEFAULT 0,
    last_message_content TEXT,
    last_message_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS tb_whatsapp_messages (
    id SERIAL PRIMARY KEY,
    whatsapp_id VARCHAR(255) UNIQUE, -- ID da mensagem no WhatsApp
    chat_id VARCHAR(255) REFERENCES tb_whatsapp_chats(id),
    sender_id VARCHAR(255), -- 'me' ou ID do remetente
    content TEXT,
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, etc.
    status VARCHAR(50) DEFAULT 'sent', -- sent, delivered, read
    timestamp TIMESTAMP
);

-- Index para busca rápida de mensagens por chat
CREATE INDEX idx_whatsapp_messages_chat_id ON tb_whatsapp_messages(chat_id);
