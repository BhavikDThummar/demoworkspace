/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { loadSSLCertificates } from './utils/ssl-config';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const configService = new ConfigService();

  // Check if HTTPS is enabled
  let enableHttps = configService.get('ENABLE_HTTPS', 'false') === 'true';

  let httpsOptions = {};
  if (enableHttps) {
    const sslConfig = loadSSLCertificates();
    if (sslConfig) {
      httpsOptions = sslConfig;
    } else {
      Logger.warn('⚠️  HTTPS requested but certificates not found, falling back to HTTP mode');
      enableHttps = false;
    }
  }

  const app = await NestFactory.create(AppModule, {
    httpsOptions: enableHttps ? httpsOptions : undefined,
    bodyParser: false, // Disable default body parser to configure custom limits
  });

  // Configure body parser with increased limits
  const payloadLimit = configService.get('PAYLOAD_LIMIT', '50mb');
  app.use(bodyParser.json({ limit: payloadLimit }));
  app.use(bodyParser.urlencoded({ limit: payloadLimit, extended: true }));

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

  const port = configService.get('PORT', 8001);
  const nodeEnv = configService.get('NODE_ENV', 'development');

  await app.listen(port);

  const protocol = enableHttps ? 'https' : 'http';
  Logger.log(`🚀 Application is running on: ${protocol}://localhost:${port}/${globalPrefix}`);
  Logger.log(`🌍 Environment: ${nodeEnv}`);
  Logger.log(`� HTTPS: ${enableHttps ? 'Enabled' : 'Disabled'}`);
  Logger.log(`🔗 CORS enabled for: ${corsOrigin}`);
  Logger.log(`📦 Payload limit: ${payloadLimit}`);
}

bootstrap();
