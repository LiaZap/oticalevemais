-- Migration: Add data_nascimento and classificacao_lente to tb_atendimentos

ALTER TABLE tb_atendimentos 
ADD COLUMN IF NOT EXISTS data_nascimento DATE,
ADD COLUMN IF NOT EXISTS classificacao_lente VARCHAR(20);

-- Optional: Update existing records if needed (example logic, implies manual update based on customer interaction)
-- UPDATE tb_atendimentos SET classificacao_lente = 'Simples' WHERE classificacao_lente IS NULL;
