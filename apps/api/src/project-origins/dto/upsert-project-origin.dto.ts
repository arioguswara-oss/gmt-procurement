import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpsertProjectOriginDto {
  @IsOptional() @IsString() externalReference?: string;
  @IsOptional() @IsString() emailSubject?: string;
  @IsOptional() @IsString() senderName?: string;
  @IsOptional() @IsEmail() senderEmail?: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @IsDateString() quotationDeadline?: string;
  @IsOptional() @IsString() notes?: string;
}
