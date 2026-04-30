import { config as loadEnv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

loadEnv({ path: `${__dirname}/../.env` });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

  app.enableCors({
    origin: corsOrigin,
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
