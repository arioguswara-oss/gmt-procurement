import { IsBoolean, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCompanyProfileDto {
  @IsString() companyName: string;
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() npwp?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() logoPath?: string;
  @IsOptional() @IsString() @Length(3, 3) defaultCurrency?: string;
  @IsOptional() @IsString() defaultSignatoryName?: string;
  @IsOptional() @IsString() defaultSignatoryTitle?: string;
}

export class CreateBankAccountDto {
  @IsString() bankName: string;
  @IsOptional() @IsString() branchName?: string;
  @IsString() accountNumber: string;
  @IsString() accountName: string;
  @IsOptional() @IsString() swiftCode?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
