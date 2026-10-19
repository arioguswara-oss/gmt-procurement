import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFDocument, PDFPage } from 'pdf-lib';
import puppeteer from 'puppeteer-core';

export type PdfPart = {
  label: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

@Injectable()
export class PdfService {
  constructor(private readonly config: ConfigService) {}

  async htmlToPdf(html: string): Promise<Buffer> {
    const pdfServerEnabled = ['1', 'true', 'yes', 'on'].includes(
      String(this.config.get('PDF_SERVER_ENABLED') ?? 'false').toLowerCase(),
    );
    if (!pdfServerEnabled) {
      throw new ServiceUnavailableException(
        'Server-side PDF belum diaktifkan pada hosting ini. Gunakan Preview/Print browser sementara, atau aktifkan PDF_SERVER_ENABLED setelah Chromium tersedia.',
      );
    }
    const executablePath = this.config.get<string>('PDF_CHROMIUM_EXECUTABLE') || '/usr/bin/chromium';
    const timeout = Number(this.config.get('PDF_TIMEOUT_MS') || 30000);
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
    try {
      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      page.setDefaultTimeout(timeout);
      await page.setContent(html, { waitUntil: 'load', timeout });
      await page.emulateMediaType('print');
      const bytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      });
      return Buffer.from(bytes);
    } catch (error) {
      throw new ServiceUnavailableException(
        `PDF engine gagal dijalankan. Pastikan Chromium tersedia pada PDF_CHROMIUM_EXECUTABLE (${executablePath}). ${error instanceof Error ? error.message : ''}`.trim(),
      );
    } finally {
      await browser?.close().catch(() => undefined);
    }
  }

  async merge(parts: PdfPart[]): Promise<Buffer> {
    if (!parts.length) throw new BadRequestException('Tidak ada dokumen untuk digabungkan');
    const out = await PDFDocument.create();
    for (const part of parts) {
      const mime = part.mimeType.toLowerCase();
      if (mime === 'application/pdf' || part.filename.toLowerCase().endsWith('.pdf')) {
        try {
          const source = await PDFDocument.load(part.buffer, { ignoreEncryption: false });
          const pages = await out.copyPages(source, source.getPageIndices());
          pages.forEach((page) => out.addPage(page));
        } catch (error) {
          throw new BadRequestException(`PDF tidak dapat digabungkan: ${part.label} (${part.filename}). ${error instanceof Error ? error.message : ''}`.trim());
        }
        continue;
      }

      if (mime === 'image/jpeg' || mime === 'image/jpg' || /\.jpe?g$/i.test(part.filename)) {
        const image = await out.embedJpg(part.buffer);
        this.addA4ImagePage(out, image.width, image.height, (page, x, y, width, height) => page.drawImage(image, { x, y, width, height }));
        continue;
      }

      if (mime === 'image/png' || /\.png$/i.test(part.filename)) {
        const image = await out.embedPng(part.buffer);
        this.addA4ImagePage(out, image.width, image.height, (page, x, y, width, height) => page.drawImage(image, { x, y, width, height }));
        continue;
      }

      throw new BadRequestException(
        `Dokumen ${part.label} (${part.filename}) tidak dapat masuk paket PDF. Gunakan PDF, JPG, atau PNG.`,
      );
    }
    return Buffer.from(await out.save());
  }

  private addA4ImagePage(
    document: PDFDocument,
    imageWidth: number,
    imageHeight: number,
    draw: (page: PDFPage, x: number, y: number, width: number, height: number) => void,
  ) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 24;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;
    const page = document.addPage([pageWidth, pageHeight]);
    draw(page, x, y, width, height);
  }
}
