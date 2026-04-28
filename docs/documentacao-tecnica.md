# Documentação tecnica do sistema

Este documento explica o funcionamento do **App Order Matching**, uma aplicação de exchange simplificada para o par **USD/BTC**. A ideia e servir como material: o que o sistema faz, como ele faz, quais componentes existem e quais decisoes tecnicas sustentam o fluxo de matching.

## 1. Visão geral

O sistema permite que usuários façam login por username, recebam saldo inicial, criem ordens limite de compra e venda, acompanhem o livro de ofertas, vejam trades executados, cancelem ordens ativas e recebam atualizações em tempo real no dashboard.

A arquitetura foi separada em:

- **Frontend React**: interface de login e dashboard da exchange.
- **Backend Node.js/Express**: API REST, autenticação, validação, criação/cancelamento de ordens e leitura de dados de mercado.
- **MySQL**: persistencia de usuários, ordens e trades.
- **Redis**: fila de ordens e canal Pub/Sub de eventos de mercado.
- **Worker de matching**: processo separado que consome a fila Redis e executa o matching das ordens.
- **Socket.io**: entrega eventos de atualização do mercado para o frontend em tempo real.

Fluxo resumido:

```text
Usuario -> Frontend React -> API Express -> MySQL
                                  |
                                  v
                              Redis Queue
                                  |
                                  v
                         Worker de matching -> MySQL
                                  |
                                  v
                            Redis Pub/Sub
                                  |
                                  v
                         API Socket.io -> Frontend
```

## 2. Stack tecnica

### Backend

- Node.js com ES Modules.
- Express para rotas HTTP.
- MySQL via `mysql2`.
- Knex para migrations.
- Redis via `ioredis`.
- JWT para autenticação.
- Socket.io para tempo real.
- Testes com runner proprio em Node.js.

### Frontend

- React com Create React App.
- React Router para navegação.
- Axios para chamadas HTTP.
- Socket.io Client para eventos em tempo real.
- Bootstrap para layout e componentes visuais.

### Infra local

O projeto pode rodar via `docker compose up --build`, subindo backend, frontend, MySQL, Redis, worker e Adminer.

## 3. Modelo de dominio

### Usuario

Tabela: `users`

Cada usuario possui:

- `username`: identificador único usado no login.
- `usd_balance`: saldo USD disponível.
- `reserved_usd`: saldo USD reservado em ordens de compra abertas ou enfileiradas.
- `btc_balance`: saldo BTC disponível.
- `reserved_btc`: saldo BTC reservado em ordens de venda abertas ou enfileiradas.

Quando um usuário novo faz login, ele e criado automaticamente com:

- 100000 USD.
- 100 BTC.


### Ordem

Tabela: `orders`

Campos principais:

- `type`: `BUY` ou `SELL`.
- `price`: preço limite.
- `amount`: quantidade original.
- `remaining_amount`: quantidade ainda não executada.
- `status`: estado da ordem.

Estados possiveis:

- `QUEUED`: ordem criada, saldo reservado e aguardando processamento pelo worker.
- `OPEN`: ordem processada, sem match completo, disponivel no livro.
- `PARTIAL`: ordem parcialmente executada, ainda com saldo restante no livro.
- `COMPLETED`: ordem totalmente executada.
- `CANCELLED`: ordem cancelada pelo usuario.

### Trade

Tabela: `trades`

Cada trade registra:

- ordem compradora.
- ordem vendedora.
- ordem maker (Vendedor).
- ordem taker (Comprador).
- preco de execução.
- quantidade executada.
- taxa maker (Vendedor).
- taxa taker (Comprador).
- data de criação.

O registro de maker/taker e importante para explicar por que as taxas sao diferentes e qual ordem ja estava no livro no momento do match.

## 4. Autenticação

O login acontece em `POST /auth/login`.

O usuário envia apenas um `username`. O backend:

1. valida se o username existe no payload;
2. procura o usuario no banco;
3. cria automaticamente se ainda nao existir;
4. gera um JWT;
5. retorna `{ user, token }`.

O frontend salva o token e os dados do usuario no `localStorage`. Nas chamadas seguintes, o interceptor do Axios adiciona:

```text
Authorization: Bearer <token>
```

Rotas protegidas usam `authMiddleware`, que valida o JWT e injeta o usuario decodificado em `req.user`.

## 5. Criação de ordens

A criação de ordem acontece em `POST /orders`.

O backend recebe:

```json
{
  "type": "BUY",
  "price": 50000,
  "amount": 0.1
}
```

O servico normaliza e valida:

- `type` precisa ser `BUY` ou `SELL`;
- `price` precisa ser maior que zero;
- `amount` precisa ser maior que zero;
- preco e arredondado para 2 casas decimais;
- quantidade e arredondada para 8 casas decimais.

Depois disso, o backend abre uma transação MySQL e bloqueia o usuario com `SELECT ... FOR UPDATE`. Esse bloqueio evita que duas ordens concorrentes gastem o mesmo saldo ao mesmo tempo.

### Reserva em ordem de compra

Para ordem `BUY`, o sistema reserva USD suficiente para cobrir:

- preco limite vezes quantidade;
- taxa maker de 0.5%.

Formula:

```text
reserva = price * amount * (1 + 0.005)
```

Exemplo:

```text
BUY 0.1 BTC a 50000 USD
valor bruto = 5000 USD
reserva = 5000 * 1.005 = 5025 USD
```

O saldo disponivel diminui e o saldo reservado aumenta:

```text
usd_balance -= reserva
reserved_usd += reserva
```

### Reserva em ordem de venda

Para ordem `SELL`, o sistema reserva a quantidade de BTC da ordem:

```text
btc_balance -= amount
reserved_btc += amount
```

### Enfileiramento

Depois de reservar saldo e criar a ordem com status `QUEUED`, a API publica o ID da ordem na lista Redis:

```text
orders:queue
```

Isso separa a criação da ordem do matching. A API responde rapido, enquanto o worker processa a ordem de forma serializada.

## 6. Worker de matching

O worker roda separado da API em `backend/src/worker.js`.

Ele chama `startMatchingEngine`, que fica em loop consumindo a fila Redis com `BLPOP`:

```text
BLPOP orders:queue 0
```

Isso significa que o processo fica bloqueado aguardando uma ordem. Quando chega um ID, ele chama `processOrder(orderId)`.

Essa separação e uma decisao importante:

- a API nao precisa executar matching dentro da requisição HTTP;
- o matching fica serializado em um unico consumidor;
- reduz o risco de corrida entre ordens;
- facilita escalar a API independentemente do motor de matching.

## 7. Algoritmo de matching

O matching acontece em `backend/src/services/matchingService.js`.

Passos principais:

1. Abre uma transação MySQL.
2. Busca a ordem taker com `SELECT ... FOR UPDATE`.
3. Ignora a ordem se ela nao estiver mais em `QUEUED`.
4. Busca ordens maker compativeis tambem com `FOR UPDATE`.
5. Executa matches enquanto houver quantidade restante.
6. Atualiza saldo dos usuarios.
7. Cria registros em `trades`.
8. Atualiza status e `remaining_amount` das ordens.
9. Faz commit da transação.
10. Publica evento de mercado.

### Ordem taker e maker

- **Taker**: a ordem nova que saiu da fila e esta tentando executar.
- **Maker**: uma ordem que ja estava aberta no livro.

O preco de execução e sempre o preco da ordem maker. Isso e comum em engines de matching, porque a ordem nova aceita a liquidez disponivel no livro.

Exemplo:

```text
Maker SELL: 0.1 BTC a 49000
Taker BUY:  0.1 BTC a 50000
Preco executado: 49000
```

A compra aceitou pagar ate 50000, mas conseguiu executar melhor, a 49000.

### Regras para encontrar makers

Se a ordem nova e `BUY`, ela busca vendas:

```text
SELL com price <= preco da compra
status OPEN ou PARTIAL
remaining_amount > 0
user_id diferente do taker
ordenado por menor preco, depois mais antiga
```

Se a ordem nova e `SELL`, ela busca compras:

```text
BUY com price >= preco da venda
status OPEN ou PARTIAL
remaining_amount > 0
user_id diferente do taker
ordenado por maior preco, depois mais antiga
```

Essa ordenação implementa prioridade de preco e tempo:

- melhor preco primeiro;
- em empate, ordem mais antiga primeiro;
- em novo empate, menor ID primeiro.

O sistema tambem evita self-trade ao exigir `user_id <> taker.user_id`.

### Execução parcial

A quantidade executada em cada match e:

```text
min(taker.remaining_amount, maker.remaining_amount)
```

Isso permite:

- uma ordem grande consumir varias ordens menores;
- uma ordem pequena executar parcialmente uma ordem maior;
- sobras continuarem no livro como `OPEN` ou `PARTIAL`.

## 8. Taxas e saldos

O sistema usa duas taxas:

- Maker: 0.5%.
- Taker: 0.3%.

### Comprador

Quando o comprador executa, ele recebe BTC:

```text
btc_balance += amount
```

O sistema remove do reservado a fatia correspondente ao preco limite da ordem de compra:

```text
reserved_usd -= reserva_da_fatia
```

Se a execução saiu mais barata do que o limite, a diferenca volta para `usd_balance`.

Exemplo:

```text
BUY limite: 50000
Executado: 49000
Quantidade: 0.1
Reserva aproximada: 5025
Custo bruto: 4900
Taxa taker: 14.70
Refund: 5025 - 4900 - 14.70 = 110.30
```

### Vendedor

Quando o vendedor executa, o BTC reservado diminui:

```text
reserved_btc -= amount
```

E o vendedor recebe USD liquido da taxa:

```text
usd_balance += grossTotal - fee
```

### Arredondamentos

O backend usa:

- 8 casas para BTC.
- 2 casas para USD.

Isso aparece em funcoes como `roundBtc`, `roundUsd` e na normalização da ordem.

## 9. Cancelamento de ordens

O cancelamento acontece em `DELETE /orders/:id`.

O backend:

1. abre transação;
2. busca a ordem do usuario com status `QUEUED`, `OPEN` ou `PARTIAL`;
3. bloqueia a linha com `FOR UPDATE`;
4. muda o status para `CANCELLED`;
5. devolve a reserva restante;
6. publica evento de mercado.

Para `BUY`, devolve a reserva em USD da quantidade restante.

Para `SELL`, devolve o BTC restante.

## 10. Dados de mercado

### Order book

Rota:

```text
GET /market/orderbook
```

O backend agrupa ordens abertas e parciais por preco e tipo:

```text
bids: compras
asks: vendas
```

O retorno e usado pelo componente `OrderBook`. Clicar em uma ask preenche o formulario de compra; clicar em uma bid preenche o formulario de venda.

### Trades globais

Rota:

```text
GET /market/trades
```

Retorna os ultimos 50 trades, ordenados do mais recente para o mais antigo.

### Historico do usuario

Rota:

```text
GET /market/my-trades
```

Protegida por JWT. Retorna os trades em que o usuario participou e informa se ele atuou como `BUY` ou `SELL`.

### Estatisticas 24h

Rota:

```text
GET /market/stats
```

Retorna:

- ultimo preco;
- volume BTC nas ultimas 24h;
- volume USD nas ultimas 24h;
- maior preco;
- menor preco;
- saldo do usuario.

## 11. Tempo real

O tempo real usa Redis Pub/Sub mais Socket.io.

Quando algo relevante acontece, o backend publica no canal Redis:

```text
market:events
```

Eventos sao publicados, por exemplo, ao:

- criar ordem;
- processar matching;
- cancelar ordem.

A API principal assina esse canal e, quando recebe uma mensagem, emite para os clientes Socket.io:

```text
market:updated
```

No frontend, o hook `useMarket` escuta `market:updated` e recarrega em paralelo:

- stats;
- order book;
- trades globais;
- meus trades;
- minhas ordens ativas.

Essa abordagem favorece simplicidade: o evento nao carrega todo o estado novo, apenas avisa que o mercado mudou. O frontend busca novamente os dados consolidados.

## 12. Frontend

### Rotas

- `/`: tela de login.
- `/dashboard`: tela protegida da exchange.

`ProtectedRoute` verifica se existe token no `localStorage`. Sem token, mostra tela de acesso negado.

### Login

O componente `Login` envia o username para a API, salva token e usuario no `localStorage` e redireciona para o dashboard.

### Dashboard

O dashboard mostra:

- cards de estatisticas e saldo;
- formulario de compra;
- formulario de venda;
- order book;
- trades globais;
- ordens ativas do usuario;
- historico do usuario.

O estado principal vem do hook `useMarket`, que centraliza carregamento e atualização via Socket.io.

### Formularios de ordem

`OrderForm` recebe o tipo da ordem (`BUY` ou `SELL`) e valida a digitação decimal no frontend. O backend ainda faz a validação final, que e a garantia real de integridade.

O total exibido e:

```text
price * amount
```

## 13. Rotas principais da API

### Publicas

```text
GET  /health
POST /auth/login
GET  /market/orderbook
GET  /market/trades
```

### Protegidas

```text
GET    /orders
POST   /orders
DELETE /orders/:id
GET    /market/my-trades
GET    /market/stats
```

## 14. Banco de dados

### `users`

Guarda identidade e saldos.

O sistema separa saldo disponivel de saldo reservado. Isso evita que uma mesma quantia seja usada em varias ordens simultaneamente.

### `orders`

Guarda ordens e estados do ciclo de vida.

Indices importantes:

- `type`, `status`, `price`, `created_at`: ajuda nas consultas do livro e matching.
- `user_id`, `status`: ajuda a buscar ordens ativas do usuario.

### `trades`

Guarda execucoes realizadas.

Tem FKs para compra, venda, maker e taker, permitindo auditoria do match.

## 15. Concorrencia e consistencia

Os pontos mais importantes de consistencia sao:

- Reserva de saldo feita antes da ordem entrar no livro.
- Transacoes MySQL em criação, cancelamento e matching.
- `SELECT ... FOR UPDATE` para bloquear usuarios e ordens durante alteracoes criticas.
- Worker consumindo a fila de forma serial.
- Status de ordem impede reprocessamento indevido.
- Saldo reservado e liberado conforme execucoes e cancelamentos.

Esse conjunto reduz problemas como:

- gasto duplo de saldo;
- duas execucoes usando a mesma ordem ao mesmo tempo;
- cancelamento concorrendo com matching;
- inconsistencia entre ordem, saldo e trade.

## 16. Testes

O backend possui testes automatizados rodando com:

```bash
cd backend
npm test
```

A suite cobre:

- health check;
- login;
- proteção por JWT;
- validacoes de criação de ordem;
- calculo de reserva de compra com taxa maker.

Tambem existe um guia de testes manuais em `docs/testing.md`, com exemplos de `curl` para validar o fluxo completo com Docker.

## 17. Explicação.

> O projeto e uma exchange simplificada de USD/BTC. O usuario faz login por username, recebe saldo inicial e pode criar ordens limite de compra ou venda. Ao criar uma ordem, o backend valida os dados, reserva saldo em uma transação MySQL e coloca a ordem em uma fila Redis. Um worker separado consome essa fila e faz o matching de forma serial, bloqueando as ordens com `SELECT FOR UPDATE`. Quando ha match, ele executa pelo preco da ordem maker, atualiza saldos, calcula taxas, registra o trade e atualiza o status das ordens. Depois publica um evento Redis, que a API repassa via Socket.io para o frontend atualizar o dashboard em tempo real.

- separação entre API e worker;
- uso de fila para serializar matching;
- transacoes e locks para consistencia;
- reserva de saldo para evitar gasto duplo;
- prioridade preco-tempo no matching;
- suporte a execução parcial;
- eventos em tempo real com Redis Pub/Sub e Socket.io;
- frontend organizado por features.

## 18. Possiveis melhorias futuras

- adicionar autenticação com senha ou OAuth;
- criar testes integrados com MySQL e Redis reais em ambiente isolado;
- implementar idempotencia na criação de ordens;
- adicionar rate limit;
- melhorar observabilidade com logs estruturados e metricas;
- criar pagina administrativa;
- usar WebSocket para enviar deltas em vez de recarregar todos os dados;
- suportar multiplos pares de negociação alem de USD/BTC;
- revisar modelo de taxas para armazenar moeda e regra de cobranca de forma mais explicita.

