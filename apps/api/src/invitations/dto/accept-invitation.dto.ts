import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;
}
