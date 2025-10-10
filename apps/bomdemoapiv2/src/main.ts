/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { loadSSLCertificates } from './utils/ssl-config';
import { join } from 'path';

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

  // Configure payload limit (convert from string like '50mb' to bytes)
  const payloadLimit = configService.get('PAYLOAD_LIMIT', '50mb');
  const bodyLimitBytes = parsePayloadLimit(payloadLimit);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ 
      bodyLimit: bodyLimitBytes,
      https: enableHttps ? httpsOptions : undefined 
    }),
    {
      bufferLogs: true,
    },
  );

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

  // CORS configuration using Fastify plugin
  const corsOrigin = true; // configService.get('CORS_ORIGIN', 'http://localhost:4200');
  const corsCredentials = configService.get('CORS_CREDENTIALS', 'true') === 'true';
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];

  await app.register(require('@fastify/cors'), {
    origin: corsOrigin,
    methods: methods,
    credentials: corsCredentials,
  });

  // Register static file serving for uploads (if uploads directory exists)
  try {
    await app.register(require('@fastify/static'), {
      root: join(__dirname, '..', 'uploads'),
      prefix: '/uploads/', // makes files available at /uploads/*
    });
    Logger.log('📁 Static file serving enabled for /uploads/*');
  } catch (error) {
    Logger.warn('⚠️  Uploads directory not found, static file serving disabled', error);
  }

  const port = configService.get('PORT', 8001);
  const nodeEnv = configService.get('NODE_ENV', 'development');

  await app.listen(port, '0.0.0.0');

  const protocol = enableHttps ? 'https' : 'http';
  Logger.log(`🚀 Application is running on: ${protocol}://localhost:${port}/${globalPrefix}`);
  Logger.log(`🌍 Environment: ${nodeEnv}`);
  Logger.log(`🔒 HTTPS: ${enableHttps ? 'Enabled' : 'Disabled'}`);
  Logger.log(`🔗 CORS enabled for: ${corsOrigin}`);
  Logger.log(`📦 Payload limit: ${payloadLimit} (${bodyLimitBytes} bytes)`);
  Logger.log(`⚡ Using Fastify adapter for improved performance`);
}

/**
 * Parse payload limit string (e.g., '50mb', '1gb') to bytes
 */
function parsePayloadLimit(limit: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = limit.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!match) {
    Logger.warn(`Invalid payload limit format: ${limit}, using default 50MB`);
    return 50 * 1024 * 1024; // 50MB default
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * units[unit]);
}

bootstrap();
