import { Test } from '@nestjs/testing';
import { TransacoesController } from './transacoes.controller.js';
import { TransacoesService } from './transacoes.service.js';

describe('TransacoesController', () => {
  let controller: TransacoesController;
  const service = { create: vi.fn(), findAllComMetricas: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [TransacoesController],
      providers: [{ provide: TransacoesService, useValue: service }],
    }).compile();
    controller = moduleRef.get(TransacoesController);
  });

  it('create delega ao service', async () => {
    const dto = {
      descricao: 'Salario',
      valor: 2000,
      tipo: 'receita' as const,
      categoria: 'Trabalho',
    };
    service.create.mockResolvedValue({ _id: '1', ...dto });

    await expect(controller.create(dto)).resolves.toEqual({ _id: '1', ...dto });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll devolve historico e metricas do service', async () => {
    const resposta = {
      historico: [],
      metricas: { saldoTotal: 0, totalDespesas: 0, totalGastoImpulso: 0 },
    };
    service.findAllComMetricas.mockResolvedValue(resposta);

    await expect(controller.findAll()).resolves.toEqual(resposta);
  });
});
