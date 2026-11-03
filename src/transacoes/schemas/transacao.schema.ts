import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const TIPOS_TRANSACAO = ['receita', 'despesa'] as const;
export type TipoTransacao = (typeof TIPOS_TRANSACAO)[number];

@Schema({ timestamps: true, collection: 'transacoes' })
export class Transacao {
  @Prop({ required: true, trim: true })
  descricao: string;

  @Prop({ required: true, min: 0.01 })
  valor: number;

  @Prop({ type: String, required: true, enum: TIPOS_TRANSACAO })
  tipo: TipoTransacao;

  @Prop({ required: true, trim: true })
  categoria: string;

  // Despesa essencial (true) ou gasto por impulso (false) — ODS 12
  @Prop({ default: true })
  consumoConsciente: boolean;
}

export type TransacaoDocument = HydratedDocument<Transacao>;
export const TransacaoSchema = SchemaFactory.createForClass(Transacao);
