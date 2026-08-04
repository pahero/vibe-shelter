import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DatabaseModule } from '../database/database.module';
import { CatPhotoUrlService } from './cat-photo-url.service';
import { CatPhotoCleanupService } from './cat-photo-cleanup.service';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, AuditModule],
  controllers: [CatsController],
  providers: [CatsService, CatPhotoUrlService, CatPhotoCleanupService],
  exports: [CatsService],
})
export class CatsModule {}
