import { IsString, Matches } from 'class-validator';

export class TokenInvitationDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token: string;
}
