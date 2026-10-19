import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateReceiptDto {
  @IsDateString()
  receiptDate: string;

  @IsOptional() @IsString()
  description?: string;
}
