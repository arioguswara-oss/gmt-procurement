import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadTaxDocumentDto {
  @IsOptional() @IsString() @MaxLength(190)
  documentNo?: string;

  @IsOptional() @IsDateString()
  documentDate?: string;

  @IsOptional() @IsString()
  notes?: string;
}
