import { DocumentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsOptional() @IsString() projectOriginId?: string;
  @IsOptional() @IsString() quotationId?: string;
  @IsOptional() @IsString() purchaseOrderId?: string;
  @IsOptional() @IsString() deliveryOrderId?: string;
  @IsOptional() @IsString() receivingDocumentId?: string;
  @IsOptional() @IsString() invoiceId?: string;
  @IsOptional() @IsString() taxDocumentId?: string;
  @IsOptional() @IsString() receiptId?: string;
  @IsOptional() @IsString() paymentId?: string;
  @IsOptional() @IsString() notes?: string;
}
