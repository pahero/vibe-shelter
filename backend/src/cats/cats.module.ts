import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CatPhotoUrlService } from './cat-photo-url.service';
import { CatPhotoCleanupService } from './cat-photo-cleanup.service';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';
import { CreateCatHandler } from './commands/create-cat.handler';
import { ArchiveCatHandler } from './commands/archive-cat.handler';
import { DearchiveCatHandler } from './commands/dearchive-cat.handler';
import { WriteCatAuditEventCommand } from './commands/write-cat-audit-event.command';
import { ListCatHistoryQuery } from './queries/list-cat-history.query';
import { ListAllCatHistoryQuery } from './queries/list-all-cat-history.query';
import { ArchivationReasonsController } from './archivation-reasons/archivation-reasons.controller';
import { CreateArchivationReasonCommand } from './archivation-reasons/create-archivation-reason.command';
import { DeleteArchivationReasonCommand } from './archivation-reasons/delete-archivation-reason.command';
import { ListArchivationReasonsQuery } from './archivation-reasons/list-archivation-reasons.query';
import { UpdateArchivationReasonCommand } from './archivation-reasons/update-archivation-reason.command';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule],
  controllers: [ArchivationReasonsController, CatsController],
  providers: [CatsService, CatPhotoUrlService, CatPhotoCleanupService, CreateCatHandler, ArchiveCatHandler, DearchiveCatHandler, WriteCatAuditEventCommand, ListCatHistoryQuery, ListAllCatHistoryQuery, ListArchivationReasonsQuery, CreateArchivationReasonCommand, UpdateArchivationReasonCommand, DeleteArchivationReasonCommand],
  exports: [CatsService],
})
export class CatsModule {}
