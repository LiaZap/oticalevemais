# Guia de Deploy no Easypanel

O projeto foi preparado para ser implantado usando Docker. Siga os passos abaixo no seu painel Easypanel.

## 1. Backend (Node.js)

Crie um serviço do tipo **App** ou **Docker Image** apontando para o diretório `backend`.

### Environment Variables

Você DEVE configurar as seguintes variáveis de ambiente:

- `PORT`: `80` (O Easypanel gerencia isso, mas garanta que a porta interna do container seja 5000)
- `DATABASE_URL`: A URL de conexão interna do seu banco PostgreSQL (ex: `postgres://user:pass@host:5432/db`)
- `JWT_SECRET`: Uma string secreta e longa para segurança
- `FRONTEND_URL`: A URL onde seu frontend estará rodando (ex: `https://app.oticalevemais.com`). Importante para o CORS.

## 2. Frontend (React + Nginx)

Crie um serviço do tipo **App** ou **Docker Image** apontando para o diretório `frontend`.

### Build Args / Environment Variables

Para o frontend, como é uma build estática, você precisa passar a URL da API **durante o build**.

- `VITE_API_URL`: A URL completa do seu backend (ex: `https://api.oticalevemais.com/api`).
  - **Atenção:** Certifique-se de incluir `/api` no final se a sua rota base for essa.

## 3. Banco de Dados

Você precisará de um serviço PostgreSQL rodando. Certifique-se de que o Backend consiga conectar nele (usando a rede interna do Docker do Easypanel é o mais fácil).

Use os scripts SQL na raiz do projeto para criar as tabelas iniciais se necessário.
