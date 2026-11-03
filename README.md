# API de Controle Financeiro Pessoal

API RESTful em **NestJS** + **MongoDB** que funciona como o motor de um aplicativo de controle financeiro pessoal. Ela registra receitas e despesas e devolve metricas consolidadas: saldo, total de despesas e quanto foi gasto por impulso.

Atividade da Aula 7 da disciplina Web Mobile (TADS), parte do componente extensionista.

## Impacto na comunidade

A ferramenta pode ser usada em oficinas comunitarias de letramento financeiro:

- **ODS 1 – Erradicacao da pobreza:** ajuda familias a enxergar para onde vai o dinheiro e a prevenir o superendividamento.
- **ODS 12 – Consumo e producao responsaveis:** o campo `consumoConsciente` leva a pessoa a refletir se cada despesa foi essencial ou um gasto por impulso. A metrica `totalGastoImpulso` mostra o peso desses gastos no orcamento.

## Tecnologias

- NestJS 12 (TypeScript)
- MongoDB Atlas com `@nestjs/mongoose`
- `@nestjs/config` (variaveis de ambiente)
- `class-validator` / `class-transformer` (validacao dos dados de entrada)
- Vitest + Supertest (testes)

## Configurando o MongoDB Atlas

1. Crie uma conta gratuita em <https://www.mongodb.com/cloud/atlas> e um cluster **M0 (Free)**.
2. Em **Database Access**, crie um usuario com senha.
3. Em **Network Access**, libere o seu IP (ou `0.0.0.0/0` para testes).
4. Em **Connect → Drivers**, copie a connection string.
5. Copie `.env.example` para `.env` e cole a string em `MONGODB_URI`, trocando `<usuario>`, `<senha>` e `<cluster>`:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/controle-financeiro?retryWrites=true&w=majority
PORT=3000
```

> O arquivo `.env` esta no `.gitignore` e nao vai para o GitHub.

## Como executar

```bash
npm install
npm run start:dev     # desenvolvimento, com reload automatico
# ou
npm run build && npm run start:prod
```

A API sobe em `http://localhost:3000`. Sem `MONGODB_URI` definida, a aplicacao nao inicia e mostra um erro.

## Modelo de dados – `Transacao`

| Campo | Tipo | Regras |
|---|---|---|
| `descricao` | String | obrigatorio. Ex: "Conta de Luz" |
| `valor` | Number | obrigatorio, maior que zero, ate 2 casas decimais |
| `tipo` | String | obrigatorio: `"receita"` ou `"despesa"` |
| `categoria` | String | obrigatorio. Ex: "Moradia", "Alimentacao", "Lazer" |
| `consumoConsciente` | Boolean | opcional, padrao `true`. Use `false` para gastos por impulso |

Os campos `createdAt` e `updatedAt` sao gerados automaticamente.

## Endpoints

### `POST /transacoes`

Cadastra uma receita ou despesa.

```bash
curl -X POST http://localhost:3000/transacoes \
  -H "Content-Type: application/json" \
  -d '{"descricao":"Salario","valor":2500,"tipo":"receita","categoria":"Trabalho"}'

curl -X POST http://localhost:3000/transacoes \
  -H "Content-Type: application/json" \
  -d '{"descricao":"Delivery de sexta","valor":80,"tipo":"despesa","categoria":"Alimentacao","consumoConsciente":false}'
```

Resposta `201 Created`: a transacao salva. Dados invalidos (por exemplo `tipo: "investimento"`, valor negativo ou campos desconhecidos) recebem `400 Bad Request` com a lista de erros.

### `GET /transacoes`

Devolve o historico (mais recente primeiro) e as metricas calculadas no back-end (`TransacoesService.calcularMetricas`).

```json
{
  "historico": [
    { "_id": "...", "descricao": "Delivery de sexta", "valor": 80, "tipo": "despesa", "categoria": "Alimentacao", "consumoConsciente": false, "createdAt": "...", "updatedAt": "..." },
    { "_id": "...", "descricao": "Salario", "valor": 2500, "tipo": "receita", "categoria": "Trabalho", "consumoConsciente": true, "createdAt": "...", "updatedAt": "..." }
  ],
  "metricas": {
    "saldoTotal": 2420,
    "totalDespesas": 80,
    "totalGastoImpulso": 80
  }
}
```

- **saldoTotal:** soma das receitas menos a soma das despesas
- **totalDespesas:** soma das transacoes do tipo `despesa`
- **totalGastoImpulso:** soma das despesas com `consumoConsciente: false`

## Testes

Os testes nao precisam de banco de dados: o model do Mongoose e substituido por um mock.

```bash
npm test           # unitarios: DTO, service (metricas) e controller
npm run test:e2e   # HTTP: POST/GET /transacoes e validacao
```

## Estrutura

```
src/
  main.ts
  app.module.ts          # conexao com o MongoDB via MONGODB_URI
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

O ZIP contem: `src/`, `test/`, `package.json`, `tsconfig.json`, `nest-cli.json`, `github.txt` e os arquivos de configuracao extras (`tsconfig.build.json`, `vitest.config.ts`, `vitest.config.e2e.ts`, `.env.example`).
