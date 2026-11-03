import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTransacaoDto } from './dto/create-transacao.dto.js';
import { Transacao } from './schemas/transacao.schema.js';

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
  constructor(
    @InjectModel(Transacao.name)
    private readonly transacaoModel: Model<Transacao>,
  ) {}

  create(dto: CreateTransacaoDto) {
    return this.transacaoModel.create(dto);
  }

  async findAllComMetricas() {
    const historico = await this.transacaoModel
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
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
