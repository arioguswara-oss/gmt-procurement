import { IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional() @IsString() projectName?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() projectOwnerId?: string;
  @IsOptional() @IsString() notes?: string;
}
