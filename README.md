# App Order Matching

Sistema de matching de ordens para USD/BTC, seguindo a stack recomendada do desafio: Node.js ES Modules, MySQL, Redis, Socket.io, React CRA e Bootstrap.

## Funcionalidades

- Autenticação por username com JWT Bearer.
- Cadastro automático de usuário com saldo inicial de 100 BTC e 100000 USD.
- Ordens limite de compra e venda.
- Reserva de saldo ao criar ordens para evitar gasto duplo.
- Matching serial em worker separado usando fila Redis.
- Taxas de 0.5% para maker e 0.3% para taker.
- Estatisticas 24h: ultimo preco, volume BTC/USD, high e low.
- Order book agregado por preco com Bid e Ask clicaveis.
- Matches globais, minhas ordens ativas com cancelamento e meu historico.
- Atualizacao em tempo real via Socket.io com eventos publicados pelo worker via Redis Pub/Sub.

## Como rodar com Docker

```bash
docker compose up --build
```

Servicos:

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Adminer: http://localhost:8080
- MySQL: localhost:3306
- Redis: localhost:6379

## Acesso ao Adminer

Depois de subir o projeto com Docker, acesse http://localhost:8080 e use:

```text
Sistema: MySQL
Servidor: mysql
Usuario: root
Senha: root
Base de dados: exchange
```

Observacao: dentro do Docker, o Adminer acessa o banco pelo nome do servico `mysql`. Se voce for conectar em uma ferramenta fora do Docker, use `localhost` como host e a porta `3306`.

O container do backend executa as migrations antes de iniciar a API. O Docker Compose tambem inicia o container `worker`, entao o matching engine ja fica rodando automaticamente dentro do Docker. Nesse modo, nao precisa executar `npm run worker` em outro terminal.

## Rodando localmente sem o Docker

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run migrate
npm run dev
```

Worker em outro terminal:

```bash
cd backend
npm run worker
```

Esse comando so e necessario quando voce esta rodando o backend fora do Docker. Se voce iniciou o projeto com `docker compose up --build`, o worker ja esta ativo no container `app_worker`.

Se voce rodar backend/worker direto na maquina e usar MySQL/Redis do Docker, mantenha no `backend/.env`:

```env
DB_HOST=localhost
REDIS_HOST=localhost
```

Frontend:

```bash
cd frontend
npm install
npm start
```

## Testes

Backend:

```bash
cd backend
npm test
```

Frontend:

```bash
cd frontend
npm test
```

O guia completo de testes automatizados e testes manuais das rotas esta em [docs/testing.md](docs/testing.md).

## Estrutura de pastas

```text
app-order-matching/
├── backend/
│   ├── src/
│   │   ├── config/          # Conexoes com MySQL e Redis
│   │   ├── controllers/     # Entrada das requisicoes HTTP
│   │   ├── database/        # Migrations do banco de dados
│   │   ├── middlewares/     # Middlewares como autenticacao JWT
│   │   ├── repositories/    # Consultas e comandos SQL
│   │   ├── routes/          # Definicao das rotas da API
│   │   ├── services/        # Regras de negocio
│   │   ├── utils/           # Utilitarios compartilhados
│   │   ├── workers/         # Motor de matching consumindo Redis
│   │   ├── app.js           # Configuração do Express
│   │   ├── index.js         # Inicialização da API e Socket.io
│   │   └── worker.js        # Inicialização do worker
│   ├── test/                # Testes automatizados do backend
│   ├── Dockerfile
│   ├── knexfile.js
│   └── package.json
├── frontend/
│   ├── public/              # Arquivos publicos do React
│   ├── src/
│   │   ├── app/             # App principal, rotas e estilos globais
│   │   ├── features/        # Modulos por dominio
│   │   │   ├── auth/        # Login e servicos de autenticacao
│   │   │   ├── market/      # Dashboard, order book, stats e trades
│   │   │   └── orders/      # Formulario e lista de ordens
│   │   ├── shared/          # Servicos compartilhados de API e socket
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── docs/                    # Documentacao tecnica e guia de testes
├── docker-compose.yml       # Orquestracao local dos servicos
└── README.md
```

## Variaveis de ambiente

Backend:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=exchange
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change-me
PORT=3000
```

Frontend:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
```

## Arquitetura

A API cria a ordem em status `QUEUED`, reserva o saldo do usuario e publica o id da ordem na lista Redis `orders:queue`. O worker consome essa lista com `BLPOP`, processando uma ordem por vez em transacao MySQL com `SELECT ... FOR UPDATE`.

Ordens que encontram liquidez executam pelo preco da ordem maker, garantindo condicao igual ou melhor para a ordem taker. Quando sobra quantidade, a ordem passa para o livro como `OPEN` ou `PARTIAL`; quando toda a quantidade e executada, fica `COMPLETED`. Cancelamentos liberam o saldo reservado restante.
