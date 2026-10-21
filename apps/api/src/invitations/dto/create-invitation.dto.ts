import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateInvitationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsEmail()
  @MaxLength(190)
  email: string;

  @IsEnum(UserRole)
  role: UserRole;
}
