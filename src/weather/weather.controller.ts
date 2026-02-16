import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { WeatherService } from './weather.service';
import { GetWeatherDto } from './dto/get-weather.dto';
import { CreateWeatherRequestDto } from './dto/create-weather-request.dto';
import { UpdateWeatherRequestDto } from './dto/update-weather-request.dto';
import { ExportWeatherDto } from './dto/export-weather.dto';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';
import { WeatherRequestResponseDto } from './dto/weather-request-response.dto';
import {
  ApiGetCurrentWeather,
  ApiCreateWeatherRequest,
  ApiFindAllWeatherRequests,
  ApiExportWeatherData,
  ApiFindOneWeatherRequest,
  ApiUpdateWeatherRequest,
  ApiDeleteWeatherRequest,
} from './decorators/weather.swagger';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiGetCurrentWeather()
  async getCurrentWeather(
    @Query() dto: GetWeatherDto,
  ): Promise<CurrentWeatherResponseDto> {
    return this.weatherService.getCurrentWeather(dto.location);
  }

  @Post()
  @ApiCreateWeatherRequest()
  async create(
    @Body() createDto: CreateWeatherRequestDto,
  ): Promise<WeatherRequestResponseDto> {
    return this.weatherService.create(createDto);
  }

  @Get()
  @ApiFindAllWeatherRequests()
  async findAll(): Promise<WeatherRequestResponseDto[]> {
    return this.weatherService.findAll();
  }

  @Get('export')
  @ApiExportWeatherData()
  async export(
    @Query() dto: ExportWeatherDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = await this.weatherService.exportData(dto.format);

    if (dto.format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    } else if (dto.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="weather-export.csv"');
      res.send(data);
    }
  }

  @Get(':id')
  @ApiFindOneWeatherRequest()
  async findOne(@Param('id') id: string): Promise<WeatherRequestResponseDto> {
    return this.weatherService.findOne(id);
  }

  @Patch(':id')
  @ApiUpdateWeatherRequest()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWeatherRequestDto,
  ): Promise<WeatherRequestResponseDto> {
    return this.weatherService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiDeleteWeatherRequest()
  async remove(@Param('id') id: string): Promise<void> {
    return this.weatherService.remove(id);
  }
}
