import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

/**
 * Only a PDF or a scan image can be submitted as Coretax evidence.
 * The extension AND binary signature must agree; MIME/filename alone are not proof.
 * This checks file format, not the authenticity of a tax invoice.
 */
export function assertTaxInvoiceFile(file: Pick<Express.Multer.File, 'originalname' | 'buffer'>): void {
  const ext = extname(file.originalname ?? '').toLowerCase();
  const content = file.buffer;
  if (!content?.length) throw new BadRequestException('File Faktur Pajak kosong');

  const isPdf = ext === '.pdf' && content.length >= 5 && content.subarray(0, 5).toString('ascii') === '%PDF-';
  const isPng = ext === '.png' && content.length >= 8 && content.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const isJpeg = (ext === '.jpg' || ext === '.jpeg') &&
    content.length >= 3 && content.subarray(0, 3).toString('hex') === 'ffd8ff';

  if (!isPdf && !isPng && !isJpeg) {
    throw new BadRequestException('Faktur Pajak harus berupa PDF/JPG/PNG dengan isi file yang sesuai');
  }
}
