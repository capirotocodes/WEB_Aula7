import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransacaoDto } from './create-transacao.dto.js';

const valido = {
  descricao: 'Conta de Luz',
  valor: 150.5,
  tipo: 'despesa',
  categoria: 'Moradia',
  consumoConsciente: true,
};

async function errosEm(payload: object) {
  const dto = plainToInstance(CreateTransacaoDto, payload);
  const erros = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return erros.map((erro) => erro.property).sort();
}

describe('CreateTransacaoDto', () => {
  it('aceita um payload valido', async () => {
    expect(await errosEm(valido)).toEqual([]);
  });

  it('aceita payload sem consumoConsciente', async () => {
    const { consumoConsciente: _, ...semFlag } = valido;
    expect(await errosEm(semFlag)).toEqual([]);
  });

  it('rejeita tipo diferente de receita/despesa', async () => {
    expect(await errosEm({ ...valido, tipo: 'investimento' })).toEqual([
      'tipo',
    ]);
  });

  it('rejeita valor zero ou negativo', async () => {
    expect(await errosEm({ ...valido, valor: 0 })).toEqual(['valor']);
    expect(await errosEm({ ...valido, valor: -10 })).toEqual(['valor']);
  });

  it('rejeita valor enviado como texto', async () => {
    expect(await errosEm({ ...valido, valor: '10' })).toEqual(['valor']);
  });

  it('rejeita consumoConsciente que nao seja booleano', async () => {
    expect(await errosEm({ ...valido, consumoConsciente: 'sim' })).toEqual([
      'consumoConsciente',
    ]);
  });

  it('rejeita campos obrigatorios ausentes', async () => {
    expect(await errosEm({})).toEqual([
      'categoria',
      'descricao',
      'tipo',
      'valor',
    ]);
  });

  it('rejeita campos extras', async () => {
    expect(await errosEm({ ...valido, usuario: 'x' })).toEqual(['usuario']);
  });

  it('remove acentos de descricao e categoria', () => {
    // entrada com acentos, escrita como escapes unicode
    const dto = plainToInstance(CreateTransacaoDto, {
      ...valido,
      descricao: 'Feij\u00e3o e P\u00e3o',
      categoria: 'Alimenta\u00e7\u00e3o',
    });
    expect(dto.descricao).toBe('Feijao e Pao');
    expect(dto.categoria).toBe('Alimentacao');
  });
});
