-- O erro acontece porque existe uma regra (constraint) antiga no banco que
-- só aceita alguns status (ex: talvez só 'Aberto'/'Fechado') e rejeita 'Pendente'.

-- Vamos remover essa regra para o sistema funcionar livremente.
-- O Backend já controla os status válidos.

ALTER TABLE tb_atendimentos DROP CONSTRAINT IF EXISTS tb_atendimentos_status_check;
