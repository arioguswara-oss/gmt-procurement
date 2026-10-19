import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankAccountDto, UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Injectable()
export class CompanyProfileService {
  constructor(private readonly prisma: PrismaService) {}

  get() {
    return this.prisma.companyProfile.findFirst({ include: { bankAccounts: true } });
  }

  async upsert(dto: UpdateCompanyProfileDto) {
    const current = await this.prisma.companyProfile.findFirst();
    if (!current) return this.prisma.companyProfile.create({ data: dto });
    return this.prisma.companyProfile.update({ where: { id: current.id }, data: dto });
  }

  async addBank(dto: CreateBankAccountDto) {
    const company = await this.prisma.companyProfile.findFirst();
    if (!company) throw new NotFoundException('Company profile belum dibuat');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.bankAccount.updateMany({
          where: { companyProfileId: company.id },
          data: { isDefault: false },
        });
      }
      return tx.bankAccount.create({
        data: { companyProfileId: company.id, ...dto, currency: dto.currency ?? 'IDR' },
      });
    });
  }
}
