# API de Controle Financeiro Pessoal

API RESTful em **NestJS** + **MongoDB** que funciona como o motor de um aplicativo de controle financeiro pessoal. Ela registra receitas e despesas e devolve métricas consolidadas: saldo, total de despesas e quanto foi gasto por impulso.

Atividade da Aula 7 da disciplina Web Mobile (TADS), parte do componente extensionista.

## Impacto na comunidade

A ferramenta pode ser usada em oficinas comunitárias de letramento financeiro:

- **ODS 1 – Erradicação da pobreza:** ajuda famílias a enxergar para onde vai o dinheiro e a prevenir o superendividamento.
- **ODS 12 – Consumo e produção responsáveis:** o campo `consumoConsciente` leva a pessoa a refletir se cada despesa foi essencial ou um gasto por impulso. A métrica `totalGastoImpulso` mostra o peso desses gastos no orçamento.

## Tecnologias

- NestJS 12 (TypeScript)
- MongoDB Atlas com `@nestjs/mongoose`
- `@nestjs/config` (variáveis de ambiente)
- `class-validator` / `class-transformer` (validação dos dados de entrada)
- Vitest + Supertest (testes)

## Configurando o MongoDB Atlas

1. Crie uma conta gratuita em <https://www.mongodb.com/cloud/atlas> e um cluster **M0 (Free)**.
2. Em **Database Access**, crie um usuário com senha.
3. Em **Network Access**, libere o seu IP (ou `0.0.0.0/0` para testes).
4. Em **Connect → Drivers**, copie a connection string.
5. Copie `.env.example` para `.env` e cole a string em `MONGODB_URI`, trocando `<usuario>`, `<senha>` e `<cluster>`:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/controle-financeiro?retryWrites=true&w=majority
PORT=3000
```

> O arquivo `.env` está no `.gitignore` e não vai para o GitHub.

## Como executar

```bash
npm install
npm run start:dev     # desenvolvimento, com reload automático
# ou
npm run build && npm run start:prod
```

A API sobe em `http://localhost:3000`. Sem `MONGODB_URI` definida, a aplicação não inicia e mostra um erro.

## Modelo de dados – `Transacao`

| Campo | Tipo | Regras |
|---|---|---|
| `descricao` | String | obrigatório. Ex: "Conta de Luz" |
| `valor` | Number | obrigatório, maior que zero, até 2 casas decimais |
| `tipo` | String | obrigatório: `"receita"` ou `"despesa"` |
| `categoria` | String | obrigatório. Ex: "Moradia", "Alimentação", "Lazer" |
| `consumoConsciente` | Boolean | opcional, padrão `true`. Use `false` para gastos por impulso |

Os campos `createdAt` e `updatedAt` são gerados automaticamente.

## Endpoints

### `POST /transacoes`

Cadastra uma receita ou despesa.

```bash
curl -X POST http://localhost:3000/transacoes \
  -H "Content-Type: application/json" \
  -d '{"descricao":"Salário","valor":2500,"tipo":"receita","categoria":"Trabalho"}'

curl -X POST http://localhost:3000/transacoes \
  -H "Content-Type: application/json" \
  -d '{"descricao":"Delivery de sexta","valor":80,"tipo":"despesa","categoria":"Alimentação","consumoConsciente":false}'
```

Resposta `201 Created`: a transação salva. Dados inválidos (por exemplo `tipo: "investimento"`, valor negativo ou campos desconhecidos) recebem `400 Bad Request` com a lista de erros.

### `GET /transacoes`

Devolve o histórico (mais recente primeiro) e as métricas calculadas no back-end (`TransacoesService.calcularMetricas`).

```json
{
  "historico": [
    { "_id": "...", "descricao": "Delivery de sexta", "valor": 80, "tipo": "despesa", "categoria": "Alimentação", "consumoConsciente": false, "createdAt": "...", "updatedAt": "..." },
    { "_id": "...", "descricao": "Salário", "valor": 2500, "tipo": "receita", "categoria": "Trabalho", "consumoConsciente": true, "createdAt": "...", "updatedAt": "..." }
  ],
  "metricas": {
    "saldoTotal": 2420,
    "totalDespesas": 80,
    "totalGastoImpulso": 80
  }
}
```

- **saldoTotal:** soma das receitas menos a soma das despesas
- **totalDespesas:** soma das transações do tipo `despesa`
- **totalGastoImpulso:** soma das despesas com `consumoConsciente: false`

## Testes

Os testes não precisam de banco de dados: o model do Mongoose é substituído por um mock.

```bash
npm test           # unitários: DTO, service (métricas) e controller
npm run test:e2e   # HTTP: POST/GET /transacoes e validação
```

## Estrutura

```
src/
  main.ts
  app.module.ts          # conexão com o MongoDB via MONGODB_URI
  app.setup.ts           # ValidationPipe global
  transacoes/
    schemas/transacao.schema.ts
    dto/create-transacao.dto.ts
    transacoes.controller.ts
    transacoes.service.ts
    transacoes.module.ts
test/
  app.e2e-spec.ts
```

## Entrega

O ZIP contém: `src/`, `test/`, `package.json`, `tsconfig.json`, `nest-cli.json`, `github.txt` e os arquivos de configuração extras (`tsconfig.build.json`, `vitest.config.ts`, `vitest.config.e2e.ts`, `.env.example`).
