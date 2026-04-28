# Guia de testes

Este projeto tem dois tipos principais de teste: testes automatizados do backend e testes manuais das rotas completas usando a API em execucao.

## Testes automatizados do backend

Rode:

```bash
cd backend
npm test
```

A suite usa um runner simples em ES Modules, sem dependencias extras. Ela sobe o Express em uma porta temporaria, faz requisicoes HTTP reais e valida:

- `GET /health`
- validacao de `POST /auth/login`
- protecao por JWT em `GET /orders`
- protecao por JWT em `GET /market/my-trades`
- validacoes de `POST /orders`
- calculo de reserva de compra com taxa maker

Durante os testes, `NODE_ENV=test` troca o Redis por um stub local para evitar conexao externa. Os cenarios escolhidos tambem evitam tocar MySQL.

## Testes manuais das rotas

Suba a aplicacao:

```bash
docker compose up --build
```

Em outro terminal, defina a URL base:

```bash
API=http://localhost:3000
```

### Health check

```bash
curl "$API/health"
```

Esperado:

```json
{"status":"ok"}
```

### Login

```bash
curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"user1"}'
```

Guarde o campo `token` retornado:

```bash
TOKEN="cole-o-token-aqui"
```

### Criar ordem

Compra:

```bash
curl -s -X POST "$API/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"BUY","price":50000,"amount":0.1}'
```

Venda:

```bash
curl -s -X POST "$API/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"SELL","price":51000,"amount":0.1}'
```

### Listar ordens ativas

```bash
curl -s "$API/orders" \
  -H "Authorization: Bearer $TOKEN"
```

### Cancelar ordem

Troque `1` pelo id da ordem:

```bash
curl -s -X DELETE "$API/orders/1" \
  -H "Authorization: Bearer $TOKEN"
```

### Order book publico

```bash
curl -s "$API/market/orderbook"
```

### Trades publicos

```bash
curl -s "$API/market/trades"
```

### Meus trades

```bash
curl -s "$API/market/my-trades" \
  -H "Authorization: Bearer $TOKEN"
```

### Estatisticas e saldo

```bash
curl -s "$API/market/stats" \
  -H "Authorization: Bearer $TOKEN"
```

## Fluxo recomendado de matching

1. Faca login com dois usuarios diferentes, por exemplo `user1` e `user2`.
2. Crie uma venda com `user2`: `SELL` a `50000` por `0.1`.
3. Crie uma compra com `user1`: `BUY` a `50000` por `0.1`.
4. Consulte `/market/trades`, `/market/orderbook`, `/orders` e `/market/stats`.
5. Confirme que a ordem executada saiu das ordens ativas e apareceu no historico.

## Testes do frontend

O frontend usa React Scripts, entao os testes podem ser executados com:

```bash
cd frontend
npm test
```

Para rodar uma vez em CI:

```bash
cd frontend
CI=true npm test -- --watchAll=false
```
