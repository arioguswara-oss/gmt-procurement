import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { constants } from 'fs';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { resolve } from 'path';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  get() {
    return {
      ok: true,
      service: 'gmt-procurement-api',
      environment: this.config.get('NODE_ENV') ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    const checks: Record<string, { ok: boolean; message?: string }> = {};

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1 AS ok');
      checks.database = { ok: true };
    } catch (error) {
      checks.database = { ok: false, message: error instanceof Error ? error.message : 'Database unavailable' };
    }

    const storageRoot = resolve(process.cwd(), this.config.get('STORAGE_ROOT') ?? '../../storage');
    const probe = resolve(storageRoot, `.health-${randomUUID()}`);
    try {
      await mkdir(storageRoot, { recursive: true });
      await writeFile(probe, 'ok', { flag: 'wx' });
      await unlink(probe);
      checks.storage = { ok: true };
    } catch (error) {
      checks.storage = { ok: false, message: error instanceof Error ? error.message : 'Storage unavailable' };
      await unlink(probe).catch(() => undefined);
    }

    const pdfServerEnabled = ['1', 'true', 'yes', 'on'].includes(
      String(this.config.get('PDF_SERVER_ENABLED') ?? 'false').toLowerCase(),
    );
    if (pdfServerEnabled) {
      const chromium = this.config.get<string>('PDF_CHROMIUM_EXECUTABLE') || '/usr/bin/chromium';
      try {
        await access(chromium, constants.X_OK);
        checks.chromium = { ok: true };
      } catch (error) {
        checks.chromium = { ok: false, message: `Chromium tidak executable di ${chromium}` };
      }
    } else {
      checks.chromium = { ok: true, message: 'Server-side PDF dinonaktifkan; Preview/Print browser tetap tersedia' };
    }

    const ok = Object.values(checks).every((check) => check.ok);
    response.status(ok ? 200 : 503);
    return { ok, checks, timestamp: new Date().toISOString() };
  }
}
