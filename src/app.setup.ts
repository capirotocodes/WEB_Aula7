import { INestApplication, ValidationPipe } from '@nestjs/common';

// Compartilhado entre main.ts e os testes e2e
export function configurarApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
