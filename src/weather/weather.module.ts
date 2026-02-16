import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { WeatherController } from './weather.controller';
import { WeatherService } from './weather.service';
import { LocationModule } from '../location/location.module';
import { Location } from '../entities/location.entity';
import { WeatherRequest } from '../entities/weather-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Location, WeatherRequest]),
    HttpModule,
    LocationModule,
  ],
  controllers: [WeatherController],
  providers: [WeatherService],
  exports: [WeatherService],
})
export class WeatherModule {}
