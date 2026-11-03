import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configurarApp } from './../src/app.setup.js';
import { Transacao } from './../src/transacoes/schemas/transacao.schema.js';
import { TransacoesController } from './../src/transacoes/transacoes.controller.js';
import { TransacoesService } from './../src/transacoes/transacoes.service.js';

// Substitui o model do Mongoose para não depender do MongoDB Atlas nos testes
function criarModelEmMemoria() {
  const docs: Record<string, unknown>[] = [];
  return {
    create: vi.fn((dto: Record<string, unknown>) => {
      const doc = {
        _id: String(docs.length + 1),
        consumoConsciente: true,
        ...dto,
      };
      docs.push(doc);
      return Promise.resolve(doc);
    }),
    find: vi.fn(() => ({
      sort: () => ({
        lean: () => ({ exec: () => Promise.resolve([...docs].reverse()) }),
      }),
    })),
  };
}

describe('Transacoes (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TransacoesController],
      providers: [
        TransacoesService,
        {
          provide: getModelToken(Transacao.name),
          useValue: criarModelEmMemoria(),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST e GET /transacoes devolvem histórico e métricas', async () => {
    await request(app.getHttpServer())
      .post('/transacoes')
      .send({
        descricao: 'Salário',
        valor: 2500,
        tipo: 'receita',
        categoria: 'Trabalho',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/transacoes')
      .send({
        descricao: 'Delivery',
        valor: 80,
        tipo: 'despesa',
        categoria: 'Alimentação',
        consumoConsciente: false,
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/transacoes')
      .expect(200);

    expect(res.body.historico).toHaveLength(2);
    expect(res.body.historico[0].descricao).toBe('Delivery');
    expect(res.body.metricas).toEqual({
      saldoTotal: 2420,
      totalDespesas: 80,
      totalGastoImpulso: 80,
    });
  });

  it('POST /transacoes com tipo inválido devolve 400', async () => {
    await request(app.getHttpServer())
      .post('/transacoes')
      .send({ descricao: 'X', valor: 10, tipo: 'investimento', categoria: 'Y' })
      .expect(400);
  });

  it('POST /transacoes com campos extras devolve 400', async () => {
    await request(app.getHttpServer())
      .post('/transacoes')
      .send({
        descricao: 'X',
        valor: 10,
        tipo: 'despesa',
        categoria: 'Y',
        admin: true,
      })
      .expect(400);
  });
});
