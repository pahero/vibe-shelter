import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CatPhotoUrlService } from './cat-photo-url.service';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule],
  controllers: [CatsController],
  providers: [CatsService, CatPhotoUrlService],
  exports: [CatsService],
})
export class CatsModule {}
