# Controle Financeiro Pessoal API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NestJS + MongoDB API with `POST /transacoes` and `GET /transacoes` (history + metrics) per `docs/superpowers/specs/2026-11-02-controle-financeiro-api-design.md`.

**Architecture:** Nest CLI scaffold in the repo root. One feature module `transacoes` (schema, DTO, service, controller). Metrics are a pure method of the service. Validation via global `ValidationPipe` configured in a shared `configurarApp()` used by both `main.ts` and the e2e test. Tests never touch a real database (model is mocked/stubbed).

**Tech Stack:** NestJS 11, @nestjs/mongoose + mongoose, @nestjs/config, class-validator, class-transformer, Jest, supertest.

**Remote:** `https://github.com/capirotocodes/WEB_Aula7` (empty, branch `main`).

---

### Task 1: Scaffold project and git

**Files:** Create: Nest scaffold in repo root (`src/`, `test/`, `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.gitignore`, `eslint.config.mjs`, `.prettierrc`)

- [ ] **Step 1: Scaffold**

Run (repo root): `npx -y @nestjs/cli@latest new controle-financeiro-api --directory . --package-manager npm --skip-git --strict`
Expected: "Successfully created project".

- [ ] **Step 2: Init git with local identity and remote**

```bash
git init -b main
git config user.name "capirotocodes"
git config user.email "hellborn333@gmail.com"
git remote add origin https://github.com/capirotocodes/WEB_Aula7.git
```

- [ ] **Step 3: Verify scaffold tests pass**

Run: `npm test` → PASS (app.controller.spec).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold NestJS project"
```

### Task 2: Dependencies and cleanup

**Files:** Modify `package.json`; Delete `src/app.controller.ts`, `src/app.controller.spec.ts`, `src/app.service.ts`

- [ ] **Step 1: Install**

`npm install @nestjs/mongoose mongoose @nestjs/config class-validator class-transformer`

- [ ] **Step 2: Delete scaffold app controller/service** and remove their references from `src/app.module.ts` (rewritten in Task 6).

### Task 3: Schema and DTO (TDD on DTO)

**Files:**
- Create: `src/transacoes/schemas/transacao.schema.ts`
- Create: `src/transacoes/dto/create-transacao.dto.ts`
- Test: `src/transacoes/dto/create-transacao.dto.spec.ts`

- [ ] **Step 1: Schema**

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const TIPOS_TRANSACAO = ['receita', 'despesa'] as const;
export type TipoTransacao = (typeof TIPOS_TRANSACAO)[number];

@Schema({ timestamps: true, collection: 'transacoes' })
export class Transacao {
  @Prop({ required: true, trim: true })
  descricao!: string;

  @Prop({ required: true, min: 0.01 })
  valor!: number;

  @Prop({ type: String, required: true, enum: TIPOS_TRANSACAO })
  tipo!: TipoTransacao;

  @Prop({ required: true, trim: true })
  categoria!: string;

  @Prop({ default: true })
  consumoConsciente!: boolean;
}

export type TransacaoDocument = HydratedDocument<Transacao>;
export const TransacaoSchema = SchemaFactory.createForClass(Transacao);
```

- [ ] **Step 2: Failing DTO test**

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransacaoDto } from './create-transacao.dto';

const valido = {
  descricao: 'Conta de Luz',
  valor: 150.5,
  tipo: 'despesa',
  categoria: 'Moradia',
  consumoConsciente: true,
};

async function erros(payload: object) {
  const dto = plainToInstance(CreateTransacaoDto, payload);
  const resultado = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return resultado.map((e) => e.property);
}

describe('CreateTransacaoDto', () => {
  it('aceita um payload válido', async () => {
    expect(await erros(valido)).toEqual([]);
  });

  it('aceita payload sem consumoConsciente', async () => {
    const { consumoConsciente, ...semFlag } = valido;
    expect(await erros(semFlag)).toEqual([]);
  });

  it('rejeita tipo diferente de receita/despesa', async () => {
    expect(await erros({ ...valido, tipo: 'investimento' })).toEqual(['tipo']);
  });

  it('rejeita valor zero ou negativo', async () => {
    expect(await erros({ ...valido, valor: 0 })).toEqual(['valor']);
    expect(await erros({ ...valido, valor: -10 })).toEqual(['valor']);
  });

  it('rejeita valor como texto', async () => {
    expect(await erros({ ...valido, valor: '10' })).toEqual(['valor']);
  });

  it('rejeita campos obrigatórios ausentes', async () => {
    expect((await erros({})).sort()).toEqual(['categoria', 'descricao', 'tipo', 'valor']);
  });

  it('rejeita campos extras', async () => {
    expect(await erros({ ...valido, usuario: 'x' })).toEqual(['usuario']);
  });
});
```

Run: `npx jest src/transacoes/dto` → FAIL (module not found).

- [ ] **Step 3: DTO**

```ts
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { TIPOS_TRANSACAO, type TipoTransacao } from '../schemas/transacao.schema';

export class CreateTransacaoDto {
  @IsString()
  @IsNotEmpty()
  descricao!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor!: number;

  @IsIn(TIPOS_TRANSACAO)
  tipo!: TipoTransacao;

  @IsString()
  @IsNotEmpty()
  categoria!: string;

  @IsOptional()
  @IsBoolean()
  consumoConsciente?: boolean;
}
```

Run: `npx jest src/transacoes/dto` → PASS.

- [ ] **Step 4: Commit** `feat: add Transacao schema and validated DTO`

### Task 4: Service with metrics (TDD)

**Files:** Create `src/transacoes/transacoes.service.ts`; Test `src/transacoes/transacoes.service.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Transacao } from './schemas/transacao.schema';
import { TransacoesService } from './transacoes.service';

const t = (tipo: 'receita' | 'despesa', valor: number, consumoConsciente = true) => ({
  descricao: 'x',
  categoria: 'y',
  tipo,
  valor,
  consumoConsciente,
});

describe('TransacoesService', () => {
  let service: TransacoesService;
  const exec = jest.fn();
  const sort = jest.fn(() => ({ lean: () => ({ exec }) }));
  const model = { create: jest.fn(), find: jest.fn(() => ({ sort })) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TransacoesService, { provide: getModelToken(Transacao.name), useValue: model }],
    }).compile();
    service = moduleRef.get(TransacoesService);
  });

  describe('calcularMetricas', () => {
    it('retorna zeros para lista vazia', () => {
      expect(service.calcularMetricas([])).toEqual({ saldoTotal: 0, totalDespesas: 0, totalGastoImpulso: 0 });
    });

    it('soma apenas receitas no saldo', () => {
      expect(service.calcularMetricas([t('receita', 1000), t('receita', 500)])).toEqual({
        saldoTotal: 1500,
        totalDespesas: 0,
        totalGastoImpulso: 0,
      });
    });

    it('calcula saldo, despesas e gasto por impulso', () => {
      const lista = [t('receita', 2000), t('despesa', 800), t('despesa', 150, false), t('despesa', 50, false)];
      expect(service.calcularMetricas(lista)).toEqual({ saldoTotal: 1000, totalDespesas: 1000, totalGastoImpulso: 200 });
    });

    it('não conta receita como gasto por impulso', () => {
      expect(service.calcularMetricas([t('receita', 300, false)]).totalGastoImpulso).toBe(0);
    });

    it('permite saldo negativo', () => {
      expect(service.calcularMetricas([t('receita', 100), t('despesa', 250)]).saldoTotal).toBe(-150);
    });

    it('arredonda para 2 casas decimais', () => {
      expect(service.calcularMetricas([t('receita', 0.1), t('receita', 0.2), t('despesa', 0.1, false)])).toEqual({
        saldoTotal: 0.2,
        totalDespesas: 0.1,
        totalGastoImpulso: 0.1,
      });
    });
  });

  it('create delega ao model', async () => {
    const dto = t('despesa', 10);
    model.create.mockResolvedValue({ _id: '1', ...dto });
    await expect(service.create(dto)).resolves.toEqual({ _id: '1', ...dto });
    expect(model.create).toHaveBeenCalledWith(dto);
  });

  it('findAllComMetricas devolve histórico ordenado e métricas', async () => {
    const docs = [t('despesa', 40, false), t('receita', 100)];
    exec.mockResolvedValue(docs);
    await expect(service.findAllComMetricas()).resolves.toEqual({
      historico: docs,
      metricas: { saldoTotal: 60, totalDespesas: 40, totalGastoImpulso: 40 },
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});
```

Run: `npx jest src/transacoes/transacoes.service` → FAIL.

- [ ] **Step 2: Implementation**

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTransacaoDto } from './dto/create-transacao.dto';
import { Transacao } from './schemas/transacao.schema';

export interface Metricas {
  saldoTotal: number;
  totalDespesas: number;
  totalGastoImpulso: number;
}

type DadosMetrica = Pick<Transacao, 'tipo' | 'valor' | 'consumoConsciente'>;

// `|| 0` evita devolver -0 no JSON
const arredondar = (valor: number) => Math.round(valor * 100) / 100 || 0;

@Injectable()
export class TransacoesService {
  constructor(@InjectModel(Transacao.name) private readonly transacaoModel: Model<Transacao>) {}

  create(dto: CreateTransacaoDto) {
    return this.transacaoModel.create(dto);
  }

  async findAllComMetricas() {
    const historico = await this.transacaoModel.find().sort({ createdAt: -1 }).lean().exec();
    return { historico, metricas: this.calcularMetricas(historico) };
  }

  calcularMetricas(transacoes: DadosMetrica[]): Metricas {
    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalGastoImpulso = 0;

    for (const { tipo, valor, consumoConsciente } of transacoes) {
      if (tipo === 'receita') {
        totalReceitas += valor;
        continue;
      }
      totalDespesas += valor;
      if (consumoConsciente === false) totalGastoImpulso += valor;
    }

    return {
      saldoTotal: arredondar(totalReceitas - totalDespesas),
      totalDespesas: arredondar(totalDespesas),
      totalGastoImpulso: arredondar(totalGastoImpulso),
    };
  }
}
```

Run → PASS. **Commit** `feat: add TransacoesService with metrics`

### Task 5: Controller and module

**Files:** Create `src/transacoes/transacoes.controller.ts`, `src/transacoes/transacoes.module.ts`; Test `src/transacoes/transacoes.controller.spec.ts`

- [ ] **Step 1: Failing test**

```ts
import { Test } from '@nestjs/testing';
import { TransacoesController } from './transacoes.controller';
import { TransacoesService } from './transacoes.service';

describe('TransacoesController', () => {
  let controller: TransacoesController;
  const service = { create: jest.fn(), findAllComMetricas: jest.fn() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TransacoesController],
      providers: [{ provide: TransacoesService, useValue: service }],
    }).compile();
    controller = moduleRef.get(TransacoesController);
  });

  it('create delega ao service', async () => {
    const dto = { descricao: 'Salário', valor: 2000, tipo: 'receita' as const, categoria: 'Trabalho' };
    service.create.mockResolvedValue({ _id: '1', ...dto });
    await expect(controller.create(dto)).resolves.toEqual({ _id: '1', ...dto });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll devolve histórico e métricas do service', async () => {
    const resposta = { historico: [], metricas: { saldoTotal: 0, totalDespesas: 0, totalGastoImpulso: 0 } };
    service.findAllComMetricas.mockResolvedValue(resposta);
    await expect(controller.findAll()).resolves.toEqual(resposta);
  });
});
```

- [ ] **Step 2: Controller**

```ts
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateTransacaoDto } from './dto/create-transacao.dto';
import { TransacoesService } from './transacoes.service';

@Controller('transacoes')
export class TransacoesController {
  constructor(private readonly transacoesService: TransacoesService) {}

  @Post()
  create(@Body() dto: CreateTransacaoDto) {
    return this.transacoesService.create(dto);
  }

  @Get()
  findAll() {
    return this.transacoesService.findAllComMetricas();
  }
}
```

- [ ] **Step 3: Module**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transacao, TransacaoSchema } from './schemas/transacao.schema';
import { TransacoesController } from './transacoes.controller';
import { TransacoesService } from './transacoes.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Transacao.name, schema: TransacaoSchema }])],
  controllers: [TransacoesController],
  providers: [TransacoesService],
})
export class TransacoesModule {}
```

Run `npm test` → PASS. **Commit** `feat: add transacoes controller and module`

### Task 6: App wiring

**Files:** Create `src/app.setup.ts`; Modify `src/app.module.ts`, `src/main.ts`

- [ ] `src/app.setup.ts`

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';

export function configurarApp(app: INestApplication) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
```

- [ ] `src/app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TransacoesModule } from './transacoes/transacoes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGODB_URI') }),
    }),
    TransacoesModule,
  ],
})
export class AppModule {}
```

- [ ] `src/main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

Run `npm run build` → success. **Commit** `feat: wire MongoDB connection and validation`

### Task 7: e2e test (no database)

**Files:** Modify `test/app.e2e-spec.ts`

```ts
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configurarApp } from '../src/app.setup';
import { Transacao } from '../src/transacoes/schemas/transacao.schema';
import { TransacoesController } from '../src/transacoes/transacoes.controller';
import { TransacoesService } from '../src/transacoes/transacoes.service';

function criarModelEmMemoria() {
  const docs: Record<string, unknown>[] = [];
  return {
    create: jest.fn((dto: Record<string, unknown>) => {
      const doc = { _id: String(docs.length + 1), consumoConsciente: true, ...dto };
      docs.push(doc);
      return Promise.resolve(doc);
    }),
    find: jest.fn(() => ({
      sort: () => ({ lean: () => ({ exec: () => Promise.resolve([...docs].reverse()) }) }),
    })),
  };
}

describe('Transacoes (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TransacoesController],
      providers: [TransacoesService, { provide: getModelToken(Transacao.name), useValue: criarModelEmMemoria() }],
    }).compile();
    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterEach(() => app.close());

  it('POST e GET /transacoes devolvem histórico e métricas', async () => {
    await request(app.getHttpServer())
      .post('/transacoes')
      .send({ descricao: 'Salário', valor: 2500, tipo: 'receita', categoria: 'Trabalho' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/transacoes')
      .send({ descricao: 'Delivery', valor: 80, tipo: 'despesa', categoria: 'Alimentação', consumoConsciente: false })
      .expect(201);

    const res = await request(app.getHttpServer()).get('/transacoes').expect(200);
    expect(res.body.historico).toHaveLength(2);
    expect(res.body.historico[0].descricao).toBe('Delivery');
    expect(res.body.metricas).toEqual({ saldoTotal: 2420, totalDespesas: 80, totalGastoImpulso: 80 });
  });

  it('POST /transacoes com tipo inválido devolve 400', async () => {
    await request(app.getHttpServer())
      .post('/transacoes')
      .send({ descricao: 'X', valor: 10, tipo: 'investimento', categoria: 'Y' })
      .expect(400);
  });
});
```

Run `npm run test:e2e` → PASS. **Commit** `test: add e2e tests for transacoes`

### Task 8: Docs and delivery files

**Files:** Create `.env.example`, `github.txt`, `README.md` (replace scaffold README); ensure `.gitignore` contains `.env`.

- `.env.example`:
  ```
  MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>.mongodb.net/controle-financeiro?retryWrites=true&w=majority
  PORT=3000
  ```
- `github.txt`: `https://github.com/capirotocodes/WEB_Aula7`
- `README.md` (pt-BR): objective and ODS 1/12, stack, Atlas setup (create free M0 cluster, database user, Network Access, copy URI to `.env`), run commands, endpoint docs with curl examples and sample GET response, tests, ZIP contents.

**Commit** `docs: add README, env example and github.txt`

### Task 9: Verify and publish

- [ ] `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e` → all pass
- [ ] `git push -u origin main`
- [ ] Confirm `git ls-remote origin` shows `refs/heads/main`
