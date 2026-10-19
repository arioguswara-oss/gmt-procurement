import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from './app.module';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';

function parseOrigins(value?: string) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';
  const allowedOrigins = parseOrigins(config.get<string>('WEB_ORIGIN'));

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  app.enableCors({
    credentials: false,
    origin: allowedOrigins.length
      ? (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
          if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
          return callback(new Error('Origin tidak diizinkan oleh CORS'), false);
        }
      : nodeEnv === 'development',
  });

  const expressApp = app.getHttpAdapter().getInstance();
  if (String(config.get('TRUST_PROXY') ?? '0') === '1') {
    expressApp.set('trust proxy', 1);
  }

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'SAMEORIGIN');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (nodeEnv !== 'development') {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new BigIntSerializerInterceptor());

  // cPanel-friendly single-process deployment:
  // NestJS serves /api and also the compiled React app from apps/web/dist.
  const webDistPath = resolve(
    config.get<string>('WEB_DIST_PATH') || resolve(process.cwd(), 'apps', 'web', 'dist'),
  );
  const webIndex = resolve(webDistPath, 'index.html');
  if (existsSync(webIndex)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const express = require('express') as typeof import('express');
    expressApp.use(express.static(webDistPath, { index: false, fallthrough: true }));
    expressApp.get(/^(?!\/api(?:\/|$)).*/, (_request: Request, response: Response) => {
      response.sendFile(webIndex);
    });
  }

  const port = Number(config.get('PORT') ?? 3001);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
