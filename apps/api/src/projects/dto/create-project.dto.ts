import { ProjectSourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class ProjectOriginInputDto {
  @IsOptional() @IsString() externalReference?: string;
  @IsOptional() @IsString() emailSubject?: string;
  @IsOptional() @IsString() senderName?: string;
  @IsOptional() @IsEmail() senderEmail?: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @IsDateString() quotationDeadline?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateProjectDto {
  // Satu nomor bisnis GMT dibuat pada awal project dan diteruskan ke dokumen internal berikutnya.
  // Nomor ini sengaja tidak disediakan di UpdateProjectDto agar tidak berubah setelah project dibuat.
  @IsString() @IsNotEmpty() @MaxLength(80) gmtReference: string;
  @IsString() @IsNotEmpty() @MaxLength(255) projectName: string;
  @IsEnum(ProjectSourceType) sourceType: ProjectSourceType;
  @IsString() customerId: string;
  @IsOptional() @IsString() projectOwnerId?: string;
  @IsOptional() @IsString() notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectOriginInputDto)
  origin?: ProjectOriginInputDto;
}
