import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CatPhotoUrlService } from './cat-photo-url.service';
import { CatPhotoCleanupService } from './cat-photo-cleanup.service';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import { CreateCatHandler } from './commands/create-cat.handler';
import { WriteCatAuditEventCommand } from './commands/write-cat-audit-event.command';
import { ListCatHistoryQuery } from './queries/list-cat-history.query';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule],
  controllers: [CatsController],
  providers: [CatsService, CatPhotoUrlService, CatPhotoCleanupService, CreateCatHandler, WriteCatAuditEventCommand, ListCatHistoryQuery],
  exports: [CatsService],
})
export class CatsModule {}
