import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

const sha256 = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAdmin(userId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { active: true, role: true } });
    if (!user?.active || user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Hanya SUPER_ADMIN aktif yang dapat mengatur undangan dan pengguna');
    }
  }

  async create(dto: CreateInvitationDto, actorId: bigint) {
    await this.assertAdmin(actorId);
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Undangan tidak boleh memberikan peran SUPER_ADMIN');
    }
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Nama wajib diisi');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Akun dengan email ini sudah terdaftar');
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.userInvitation.updateMany({
        where: { email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.userInvitation.create({
        data: { email, name, role: dto.role, tokenHash: sha256(token), invitedById: actorId, expiresAt },
      });
    });
    // Return only once to the creating admin over HTTPS; never store/log raw token.
    return { token, expiresAt, email, name, role: dto.role };
  }

  async preview(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token || '')) throw new BadRequestException('Undangan tidak valid');
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash: sha256(token) },
      select: { email: true, name: true, expiresAt: true, acceptedAt: true, revokedAt: true },
    });
    if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) {
      throw new BadRequestException('Undangan tidak ditemukan, sudah dipakai, dicabut, atau kedaluwarsa');
    }
    return { email: invitation.email, name: invitation.name, expiresAt: invitation.expiresAt };
  }

  async accept(dto: AcceptInvitationDto) {
    const now = new Date();
    const tokenHash = sha256(dto.token);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.userInvitation.updateMany({
        where: { tokenHash, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) throw new BadRequestException('Undangan sudah dipakai, dicabut atau kedaluwarsa');
      const invitation = await tx.userInvitation.findUniqueOrThrow({ where: { tokenHash } });
      if (invitation.role === UserRole.SUPER_ADMIN) throw new ForbiddenException('Undangan SUPER_ADMIN tidak diizinkan');
      try {
        const user = await tx.user.create({
          data: { name: invitation.name, email: invitation.email, role: invitation.role, passwordHash, active: true },
          select: { id: true, name: true, email: true, role: true },
        });
        return { accepted: true, user };
      } catch (error) {
        // The transaction rolls back the invitation claim when user creation fails.
        if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
          throw new BadRequestException('Email sudah terdaftar');
        }
        throw error;
      }
    });
  }

  async users(actorId: bigint) {
    await this.assertAdmin(actorId);
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { id: 'asc' },
    });
  }

  async setActive(actorId: bigint, targetId: bigint, active: boolean) {
    await this.assertAdmin(actorId);
    if (targetId === actorId) throw new BadRequestException('Tidak boleh menonaktifkan akun sendiri');
    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundException('Akun tidak ditemukan');
    if (target.role === UserRole.SUPER_ADMIN) throw new ForbiddenException('SUPER_ADMIN tidak dapat diubah melalui endpoint ini');
    return this.prisma.user.update({
      where: { id: targetId },
      data: { active },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }
}
