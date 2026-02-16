import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global API prefix
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS
  app.enableCors();

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Weather Backend API')
    .setDescription(
      'Production-ready weather backend with caching, persistence, export, and air quality integration.',
    )
    .setVersion('1.0')
    .addTag('location', 'Location resolution with geocoding')
    .addTag('weather', 'Weather data with air quality, caching, persistence, and export')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
