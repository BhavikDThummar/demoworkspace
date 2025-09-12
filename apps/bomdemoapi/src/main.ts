/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global prefix from environment or default
  const globalPrefix = configService.get('API_PREFIX', 'api');
  app.setGlobalPrefix(globalPrefix);

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration
  const corsOrigin = true; //   configService.get('CORS_ORIGIN', 'http://localhost:4200');
  const corsCredentials = configService.get('CORS_CREDENTIALS', 'true') === 'true';

  app.enableCors({
    origin: corsOrigin,
    credentials: corsCredentials,
  });

  const port = configService.get('PORT', 8000);
  const nodeEnv = configService.get('NODE_ENV', 'development');

  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`🌍 Environment: ${nodeEnv}`);
  Logger.log(`🔗 CORS enabled for: ${corsOrigin}`);
}

bootstrap();
