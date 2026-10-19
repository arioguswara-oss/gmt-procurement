import { PurchaseOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional,
  IsString, Length, MaxLength, Min, ValidateNested,
} from 'class-validator';

export class PurchaseOrderItemInputDto {
  @IsOptional() @IsInt() @Min(1) lineNo?: number;
  @IsString() description: string;
  @IsOptional() @IsString() @MaxLength(190) partNumber?: string;
  @IsOptional() @IsString() @MaxLength(190) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(190) model?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) qtyOrdered: number;
  @IsString() @MaxLength(50) uom: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitPrice: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsOptional() @IsString() quotationId?: string;
  @IsString() @MaxLength(190) poNo: string;
  @IsDateString() poDate: string;
  @IsString() buyerId: string;
  @IsOptional() @IsString() billToId?: string;
  @IsOptional() @IsString() shipToId?: string;
  @IsOptional() @IsString() receivingPartyId?: string;
  @IsOptional() @IsString() buyerContactId?: string;
  @IsOptional() @IsString() @MaxLength(190) requestorName?: string;
  @IsOptional() @IsString() @MaxLength(190) prNo?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsBoolean() taxIncluded?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) taxAmount?: number;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) grandTotal?: number;
  @IsOptional() @IsString() deliveryTerm?: string;
  @IsOptional() @IsString() paymentTerm?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsEnum(PurchaseOrderStatus) status?: PurchaseOrderStatus;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseOrderItemInputDto)
  items: PurchaseOrderItemInputDto[];
}
