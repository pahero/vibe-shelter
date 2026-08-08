import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import databaseConfig from '../config/database.config';
import { S3Client } from '@aws-sdk/client-s3';

@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
  providers: [PrismaService,
    {
      provide: PrismaClient,
      inject: [databaseConfig.KEY],
      useFactory: (dbConfig: ConfigType<typeof databaseConfig>) => {
        const prisma = new PrismaClient({
          adapter: new PrismaPg({
            connectionString: dbConfig.url,
          }),
          log: ['error', 'warn'],
        });
        return Object.assign(prisma, {
          onModuleDestroy: () => prisma.$disconnect(),
        });
      },
    },
    {
      provide: S3Client,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const client = new S3Client({
          endpoint: configService.get<string>('s3.endpoint') ?? process.env.AWS_ENDPOINT_URL_S3,
          region: configService.get<string>('s3.region') ?? process.env.AWS_REGION ?? 'us-east-1',
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
          credentials: {
            accessKeyId: configService.get<string>('s3.accessKeyId') ?? process.env.AWS_ACCESS_KEY_ID ?? '',
            secretAccessKey: configService.get<string>('s3.secretAccessKey') ?? process.env.AWS_SECRET_ACCESS_KEY ?? '',
          },
        });
        return Object.assign(client, {
          onModuleDestroy: () => client.destroy(),
        });
      }
    },
  ],
  exports: [PrismaService, PrismaClient, S3Client],
})
export class DatabaseModule { }
