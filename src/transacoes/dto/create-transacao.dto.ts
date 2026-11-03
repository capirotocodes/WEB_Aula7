import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import {
  TIPOS_TRANSACAO,
  type TipoTransacao,
} from '../schemas/transacao.schema.js';

// Remove acentos antes de salvar: separa letra e acento (NFD) e descarta o acento
const removerAcentos = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : value;

export class CreateTransacaoDto {
  @Transform(removerAcentos)
  @IsString()
  @IsNotEmpty()
  descricao: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor: number;

  @IsIn(TIPOS_TRANSACAO, { message: 'tipo deve ser "receita" ou "despesa"' })
  tipo: TipoTransacao;

  @Transform(removerAcentos)
  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsOptional()
  @IsBoolean()
  consumoConsciente?: boolean;
}
