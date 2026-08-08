import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Setup the application separately to reuse setup in tests
  setupApp(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);

  await app.listen(port, () => {
    console.log(`✅ Shelter backend listening on port ${port}`);
    console.log(`📖 OpenAPI documentation available at http://localhost:${port}/api/docs`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

