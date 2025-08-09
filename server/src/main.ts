import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // Basic request logger (non-sensitive)
  app.use((req: any, _res: any, next: any) => {
    try {
      // Avoid logging large/raw bodies
      const bodyPreview = typeof req.body === 'object' ? JSON.stringify(req.body).slice(0, 300) : String(req.body).slice(0, 300);
      // eslint-disable-next-line no-console
      console.log(`[HTTP] ${req.method} ${req.originalUrl || req.url} body=${bodyPreview}`);
    } catch {}
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(cors({ origin: true, credentials: true }));
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}/api`);
}

bootstrap();

