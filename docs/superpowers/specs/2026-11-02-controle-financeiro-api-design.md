# Controle Financeiro Pessoal API — Design

Date: 2026-11-02
Source: `2026.2_TADS_WEB MOBILE_AULA 7.pdf` (Aula 7, Web Mobile)

## Goal

RESTful API in NestJS + MongoDB (Mongoose / Atlas) that records income and
expenses and returns consolidated metrics, supporting financial-literacy
workshops (ODS 1 and ODS 12).

## Scope

In: the two endpoints required by the PDF, input validation, unit tests.
Out: update/delete/get-by-id, authentication, multi-user, front-end.

## Stack

- NestJS (scaffolded with `npx @nestjs/cli new`, npm, strict TypeScript)
- `@nestjs/mongoose` + `mongoose`
- `@nestjs/config` for `MONGODB_URI`
- `class-validator` + `class-transformer`
- Jest (scaffold default)

## Structure

```
src/
  main.ts                         # global ValidationPipe
  app.module.ts                   # ConfigModule + MongooseModule.forRootAsync
  transacoes/
    schemas/transacao.schema.ts
    dto/create-transacao.dto.ts
    transacoes.controller.ts
    transacoes.service.ts
    transacoes.module.ts
    transacoes.service.spec.ts
    transacoes.controller.spec.ts
    dto/create-transacao.dto.spec.ts
test/
  app.e2e-spec.ts
  jest-e2e.json
```

The scaffold's `AppController`/`AppService` are removed. The default e2e test
is replaced with an e2e test of the `TransacoesController` that overrides the
Mongoose model (`getModelToken`) with an in-memory stub, so it needs no database.

## Schema `Transacao`

Collection `transacoes`, `timestamps: true`.

| Field | Type | Rules |
|---|---|---|
| descricao | String | required, trim |
| valor | Number | required, min 0.01 |
| tipo | String | required, enum `receita` \| `despesa` |
| categoria | String | required, trim |
| consumoConsciente | Boolean | default `true` |

## DTO `CreateTransacaoDto`

- `descricao`: `@IsString() @IsNotEmpty()`
- `valor`: `@IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()`
- `tipo`: `@IsIn(['receita', 'despesa'])`
- `categoria`: `@IsString() @IsNotEmpty()`
- `consumoConsciente`: `@IsOptional() @IsBoolean()`

Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
Invalid body → HTTP 400 with class-validator messages.

## Endpoints

### POST /transacoes

Body: `CreateTransacaoDto`. Response 201: the created document.

### GET /transacoes

Response 200:

```json
{
  "historico": [ /* all transactions, newest first (createdAt desc) */ ],
  "metricas": {
    "saldoTotal": 0,
    "totalDespesas": 0,
    "totalGastoImpulso": 0
  }
}
```

## Metrics (Service)

`calcularMetricas(transacoes)` — pure function in `TransacoesService`:

- `totalReceitas` = sum of `valor` where `tipo === 'receita'` (internal only)
- `totalDespesas` = sum of `valor` where `tipo === 'despesa'`
- `saldoTotal` = `totalReceitas - totalDespesas` (may be negative)
- `totalGastoImpulso` = sum of `valor` where `tipo === 'despesa'` and
  `consumoConsciente === false` (income is never counted as impulse spending)
- Each result rounded to 2 decimals (`Math.round(x * 100) / 100`)
- Empty list → all zeros

`findAllComMetricas()` loads all documents (`find().sort({ createdAt: -1 }).lean()`)
and returns `{ historico, metricas: calcularMetricas(historico) }`.

## Configuration

- `.env` (git-ignored): `MONGODB_URI=...`, optional `PORT` (default 3000)
- `.env.example` committed with placeholders
- Missing `MONGODB_URI` → app fails at startup with a clear error

## Testing

- `calcularMetricas`: empty list; only income; mixed; impulse expenses;
  income with `consumoConsciente: false` ignored for impulse; decimal rounding;
  negative balance.
- Service: `create` and `findAllComMetricas` with mocked model.
- Controller: delegates to service.
- DTO: valid payload passes; invalid `tipo`, non-positive `valor`, missing
  fields, extra fields rejected.
- e2e: POST then GET through Nest app with stubbed model; POST with invalid
  body returns 400.

## Delivery

- `README.md` (pt-BR): purpose and ODS link, Atlas setup steps, how to run,
  request examples, how to build the ZIP.
- `github.txt`: public repo URL (filled in by the user after creating the repo).
- ZIP contents: `src/`, `test/`, `package.json`, `tsconfig.json`,
  `nest-cli.json`, `github.txt` (plus `tsconfig.build.json`, `.env.example`).
