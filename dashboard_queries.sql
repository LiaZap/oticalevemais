-- Queries Estratégicas para Dashboard de Gestão
-- Compatível com: Looker Studio, PowerBI, Metabase, Tableau
-- Autor: Antigravity (Google Deepmind)

--------------------------------------------------------------------------------
-- KPI 1: Volume de Demanda (Picos de Atendimento)
-- Objetivo: Identificar horários de maior movimento para alocar equipe humana se necessário.
--------------------------------------------------------------------------------
SELECT 
    TO_CHAR(data_inicio, 'DD/MM/YYYY') AS data,
    EXTRACT(HOUR FROM data_inicio) AS hora_do_dia,
    COUNT(*) AS total_atendimentos
FROM 
    tb_atendimentos
WHERE 
    data_inicio >= CURRENT_DATE - INTERVAL '30 days' -- Últimos 30 dias
GROUP BY 
    1, 2
ORDER BY 
    1 DESC, 2 ASC;

--------------------------------------------------------------------------------
-- KPI 2: Classificação de Assuntos (Pareto das Intenções)
-- Objetivo: Entender o que os clientes mais procuram (Ex: 80% é só preço?).
--------------------------------------------------------------------------------
SELECT 
    COALESCE(intencao_detectada, 'Não Identificado') AS motivo_contato,
    COUNT(*) AS quantidade,
    ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) AS porcentagem
FROM 
    tb_atendimentos
WHERE 
    data_inicio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
    1
ORDER BY 
    2 DESC;

--------------------------------------------------------------------------------
-- KPI 3: Eficiência do Follow-up (Taxa de Recuperação)
-- Objetivo: Medir se a mensagem de "Oi, ainda tem interesse?" está funcionando.
--------------------------------------------------------------------------------
SELECT 
    COUNT(*) FILTER (WHERE followup_enviado = TRUE) AS total_followups_enviados,
    COUNT(*) FILTER (WHERE followup_enviado = TRUE AND respondeu_followup = TRUE) AS total_recuperados,
    CASE 
        WHEN COUNT(*) FILTER (WHERE followup_enviado = TRUE) = 0 THEN 0
        ELSE ROUND(
            (COUNT(*) FILTER (WHERE followup_enviado = TRUE AND respondeu_followup = TRUE) * 100.0) / 
            NULLIF(COUNT(*) FILTER (WHERE followup_enviado = TRUE), 0), 
        2) 
    END AS taxa_conversao_followup_percentual
FROM 
    tb_atendimentos
WHERE 
    data_inicio >= CURRENT_DATE - INTERVAL '30 days';

--------------------------------------------------------------------------------
-- KPI 4: Conversão Real (Funil de Vendas Automático)
-- Objetivo: Saber quantos atendimentos viram agendamento de fato.
--------------------------------------------------------------------------------
SELECT 
    COUNT(*) AS total_iniciados,
    COUNT(*) FILTER (WHERE seguiu_fluxo_agendamento = TRUE) AS total_agendados,
    ROUND(
        (COUNT(*) FILTER (WHERE seguiu_fluxo_agendamento = TRUE) * 100.0) / COUNT(*), 
    2) AS taxa_conversao_geral_percentual
FROM 
    tb_atendimentos
WHERE 
    data_inicio >= CURRENT_DATE - INTERVAL '30 days';

--------------------------------------------------------------------------------
-- KPI 5: Retenção (Lista de "Quase Clientes")
-- Objetivo: Gerar uma lista para o time de vendas ligar ativamente.
-- Critério: Interagiu nos últimos 7 dias, não agendou, e não foi finalizado com sucesso.
--------------------------------------------------------------------------------
SELECT 
    id,
    telefone_cliente,
    TO_CHAR(data_inicio, 'DD/MM/YYYY HH24:MI') AS data_contato,
    intencao_detectada,
    status
FROM 
    tb_atendimentos
WHERE 
    data_inicio >= CURRENT_DATE - INTERVAL '7 days' -- Janela de oportunidade recente
    AND seguiu_fluxo_agendamento = FALSE -- Não converteu
    AND status NOT IN ('finalizado') -- Ainda está "aberto" ou perdido
ORDER BY 
    data_inicio DESC;
