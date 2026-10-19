import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuotationItemInputDto {
  @IsOptional() @IsInt() @Min(1) lineNo?: number;
  @IsString() description: string;
  @IsOptional() @IsString() @MaxLength(190) partNumber?: string;
  @IsOptional() @IsString() @MaxLength(190) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(190) model?: string;
  @IsOptional() @IsString() @MaxLength(120) origin?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) qty: number;
  @IsString() @MaxLength(50) uom: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitPrice: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateQuotationDto {
  @IsDateString() quotationDate: string;
  @IsOptional() @IsDateString() validUntil?: string | null;
  @IsOptional() @IsString() @MaxLength(190) rfqNo?: string;
  @IsOptional() @IsString() customerContactId?: string;
  @IsOptional() @IsString() @MaxLength(500) subject?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;

  // Percentage values use human-readable percent: 11 = 11%, not 0.11.
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) discountRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) discountAmount?: number;
  @IsOptional() @IsString() @MaxLength(50) taxScheme?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) taxRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) taxBase?: number;

  @IsOptional() @IsString() deliveryTerm?: string;
  @IsOptional() @IsString() @MaxLength(255) deliveryTime?: string;
  @IsOptional() @IsString() paymentTerm?: string;
  @IsOptional() @IsString() certificateTerm?: string;
  @IsOptional() @IsString() additionalNotes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuotationItemInputDto)
  items: QuotationItemInputDto[];
}
