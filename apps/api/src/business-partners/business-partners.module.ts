import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessPartnersController } from './business-partners.controller';
import { BusinessPartnersService } from './business-partners.service';

@Module({
  imports: [AuthModule],
  controllers: [BusinessPartnersController],
  providers: [BusinessPartnersService],
  exports: [BusinessPartnersService],
})
export class BusinessPartnersModule {}
