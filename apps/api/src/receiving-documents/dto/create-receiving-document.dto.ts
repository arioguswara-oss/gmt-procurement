import { ReceivingDocumentType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReceivingDocumentDto {
  @IsEnum(ReceivingDocumentType)
  documentType: ReceivingDocumentType;

  @IsOptional() @IsString() @MaxLength(190)
  documentNo?: string;

  @IsOptional() @IsDateString()
  documentDate?: string;

  @IsOptional() @IsString() @MaxLength(190)
  receivedBy?: string;

  @IsOptional() @IsDateString()
  receivedAt?: string;

  @IsOptional() @IsString()
  notes?: string;
}
