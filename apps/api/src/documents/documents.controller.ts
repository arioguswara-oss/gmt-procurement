import {
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './upload-document.dto';

@Controller('projects/:projectId/documents')
@UseGuards(JwtAuthGuard)
export class ProjectDocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  list(@Param('projectId') projectId: string) {
    return this.service.list(BigInt(projectId));
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('projectId') projectId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.upload(BigInt(projectId), dto, file, user.id);
  }
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get(':id/download')
  async download(@Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const result = await this.service.download(BigInt(id));
    response.setHeader('Content-Type', result.document.mimeType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(result.document.originalFilename)}`,
    );
    return result.file;
  }
}
