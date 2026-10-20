import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UploadTaxDocumentDto } from './dto/upload-tax-document.dto';
import { TaxDocumentsService } from './tax-documents.service';

@Controller('invoices/:invoiceId/tax-documents')
@UseGuards(JwtAuthGuard)
export class TaxDocumentsController {
  constructor(private readonly service: TaxDocumentsService) {}

  @Get('verification-access')
  verificationAccess(@CurrentUser() user: AuthenticatedUser) {
    return this.service.verificationAccess(user.id);
  }

  @Post(':taxId/verify')
  verify(@Param('invoiceId') invoiceId: string, @Param('taxId') taxId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.verify(BigInt(invoiceId), BigInt(taxId), user.id);
  }

  @Get()
  list(@Param('invoiceId') invoiceId: string) {
    return this.service.list(BigInt(invoiceId));
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UploadTaxDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.upload(BigInt(invoiceId), dto, file, user.id);
  }
}
