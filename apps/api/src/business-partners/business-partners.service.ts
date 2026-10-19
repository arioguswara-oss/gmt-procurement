import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessPartnerDto, CreatePartnerContactDto } from './dto/create-business-partner.dto';
import { UpdateBusinessPartnerDto } from './dto/update-business-partner.dto';

@Injectable()
export class BusinessPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  list(search?: string) {
    return this.prisma.businessPartner.findMany({
      where: search
        ? { OR: [
            { companyName: { contains: search } },
            { partnerCode: { contains: search } },
            { npwp: { contains: search } },
          ] }
        : undefined,
      include: { contacts: { where: { active: true }, orderBy: { name: 'asc' } } },
      orderBy: { companyName: 'asc' },
    });
  }

  async get(id: bigint) {
    const item = await this.prisma.businessPartner.findUnique({
      where: { id },
      include: { contacts: { orderBy: { name: 'asc' } } },
    });
    if (!item) throw new NotFoundException('Business partner tidak ditemukan');
    return item;
  }

  create(dto: CreateBusinessPartnerDto) {
    const { contacts, ...partner } = dto;
    return this.prisma.businessPartner.create({
      data: {
        ...partner,
        country: partner.country ?? 'Indonesia',
        contacts: contacts?.length ? { create: contacts } : undefined,
      },
      include: { contacts: true },
    });
  }

  async update(id: bigint, dto: UpdateBusinessPartnerDto) {
    await this.get(id);
    const { contacts: _ignored, ...data } = dto;
    return this.prisma.businessPartner.update({ where: { id }, data });
  }

  async addContact(partnerId: bigint, dto: CreatePartnerContactDto) {
    await this.get(partnerId);
    return this.prisma.businessPartnerContact.create({ data: { partnerId, ...dto } });
  }
}
