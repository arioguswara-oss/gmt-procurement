import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Length, MaxLength, Min,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsDateString()
  invoiceDate: string;

  @IsArray() @ArrayMinSize(1) @IsString({ each: true })
  deliveryOrderIds: string[];

  @IsOptional() @IsString()
  billToId?: string;

  @IsOptional() @IsString() @Length(3, 3)
  currency?: string;

  @IsOptional() @IsString() @MaxLength(50)
  taxScheme?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0)
  taxRate?: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  taxBase?: number;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  taxAmount?: number;

  @IsOptional() @IsString()
  paymentTerm?: string;

  @IsOptional() @IsDateString()
  dueDate?: string;
}
