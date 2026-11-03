import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Transacao, type TipoTransacao } from './schemas/transacao.schema.js';
import { TransacoesService } from './transacoes.service.js';

const transacao = (
  tipo: TipoTransacao,
  valor: number,
  consumoConsciente = true,
) => ({ descricao: 'x', categoria: 'y', tipo, valor, consumoConsciente });

describe('TransacoesService', () => {
  let service: TransacoesService;
  const exec = vi.fn();
  const sort = vi.fn(() => ({ lean: () => ({ exec }) }));
  const model = { create: vi.fn(), find: vi.fn(() => ({ sort })) };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TransacoesService,
        { provide: getModelToken(Transacao.name), useValue: model },
      ],
    }).compile();
    service = moduleRef.get(TransacoesService);
  });

  describe('calcularMetricas', () => {
    it('retorna zeros para lista vazia', () => {
      expect(service.calcularMetricas([])).toEqual({
        saldoTotal: 0,
        totalDespesas: 0,
        totalGastoImpulso: 0,
      });
    });

    it('soma apenas receitas no saldo', () => {
      expect(
        service.calcularMetricas([
          transacao('receita', 1000),
          transacao('receita', 500),
        ]),
      ).toEqual({ saldoTotal: 1500, totalDespesas: 0, totalGastoImpulso: 0 });
    });

    it('calcula saldo, despesas e gasto por impulso', () => {
      const lista = [
        transacao('receita', 2000),
        transacao('despesa', 800),
        transacao('despesa', 150, false),
        transacao('despesa', 50, false),
      ];
      expect(service.calcularMetricas(lista)).toEqual({
        saldoTotal: 1000,
        totalDespesas: 1000,
        totalGastoImpulso: 200,
      });
    });

    it('nao conta receita como gasto por impulso', () => {
      expect(
        service.calcularMetricas([transacao('receita', 300, false)])
          .totalGastoImpulso,
      ).toBe(0);
    });

    it('permite saldo negativo', () => {
      expect(
        service.calcularMetricas([
          transacao('receita', 100),
          transacao('despesa', 250),
        ]).saldoTotal,
      ).toBe(-150);
    });

    it('arredonda para 2 casas decimais', () => {
      expect(
        service.calcularMetricas([
          transacao('receita', 0.1),
          transacao('receita', 0.2),
          transacao('despesa', 0.1, false),
        ]),
      ).toEqual({
        saldoTotal: 0.2,
        totalDespesas: 0.1,
        totalGastoImpulso: 0.1,
      });
    });
  });

  it('create delega ao model', async () => {
    const dto = transacao('despesa', 10);
    model.create.mockResolvedValue({ _id: '1', ...dto });

    await expect(service.create(dto)).resolves.toEqual({ _id: '1', ...dto });
    expect(model.create).toHaveBeenCalledWith(dto);
  });

  it('findAllComMetricas devolve historico mais recente primeiro e metricas', async () => {
    const docs = [transacao('despesa', 40, false), transacao('receita', 100)];
    exec.mockResolvedValue(docs);

    await expect(service.findAllComMetricas()).resolves.toEqual({
      historico: docs,
      metricas: { saldoTotal: 60, totalDespesas: 40, totalGastoImpulso: 40 },
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});
