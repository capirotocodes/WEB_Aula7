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

export class CreateTransacaoDto {
  @IsString()
  @IsNotEmpty()
  descricao: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor: number;

  @IsIn(TIPOS_TRANSACAO, { message: 'tipo deve ser "receita" ou "despesa"' })
  tipo: TipoTransacao;

  @IsString()
  @IsNotEmpty()
  categoria: string;

  @IsOptional()
  @IsBoolean()
  consumoConsciente?: boolean;
}
