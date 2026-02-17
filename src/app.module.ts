import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { LocationModule } from './location/location.module';
import { WeatherModule } from './weather/weather.module';
import { AppController } from './app.controller';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import throttleConfig from './config/throttle.config';
import openweatherConfig from './config/openweather.config';
import redisConfig from './config/redis.config';
import { validationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, throttleConfig, openweatherConfig, redisConfig],
      envFilePath: '.env',
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('throttle.ttl') || 60,
            limit: configService.get<number>('throttle.limit') || 20,
          },
        ],
      }),
    }),
    DatabaseModule,
    RedisModule,
    LocationModule,
    WeatherModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '(.*)', method: RequestMethod.ALL });
  }
}
