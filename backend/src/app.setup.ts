import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export function setupApp(app: INestApplication) {
  
  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:4001');
  const sessionSecret = configService.get<string>('sessionSecret') ?? 'dev-session-secret';

  // Enable CORS
  app.enableCors({
    origin: [frontendUrl, 'http://192.168.1.138:4001'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  // Middleware
  app.use(cookieParser());
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: configService.get<number>('sessionTtlMs', 7 * 24 * 60 * 60 * 1000),
      },
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI/Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Shelter Backend API')
    .setDescription('API documentation for Shelter Backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Expose OpenAPI JSON at /api/openapi.json
  app.getHttpAdapter().get('/api/openapi.json', (req, res) => {
    res.json(document);
  });
}