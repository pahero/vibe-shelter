import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Express } from "express";

export function setupApp(app: INestApplication) {
  // Caddy terminates TLS; trust its forwarded protocol for secure deployments.
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set("trust proxy", 1);

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>(
    "frontendUrl",
    "http://localhost:4001",
  );

  // Enable CORS
  app.enableCors({
    origin: [frontendUrl],
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  });


  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
