import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import type { Response } from 'express';
import { WeatherService } from './weather.service';
import { GetWeatherDto } from './dto/get-weather.dto';
import { CreateWeatherRequestDto } from './dto/create-weather-request.dto';
import { UpdateWeatherRequestDto } from './dto/update-weather-request.dto';
import { ExportWeatherDto } from './dto/export-weather.dto';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';
import { WeatherRequestResponseDto } from './dto/weather-request-response.dto';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current weather and air quality for a location with caching' })
  @ApiQuery({
    name: 'location',
    type: String,
    description: 'City name (min 2 characters)',
  })
  @ApiResponse({
    status: 200,
    description: 'Weather and air quality data successfully retrieved',
    type: CurrentWeatherResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid location parameter',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - External API error and no cache',
  })
  async getCurrentWeather(
    @Query() dto: GetWeatherDto,
  ): Promise<CurrentWeatherResponseDto> {
    return this.weatherService.getCurrentWeather(dto.location);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new weather request (current or historical)' })
  @ApiResponse({
    status: 201,
    description: 'Weather request created successfully',
    type: WeatherRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input or date range',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  async create(
    @Body() createDto: CreateWeatherRequestDto,
  ): Promise<WeatherRequestResponseDto> {
    return this.weatherService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all weather requests' })
  @ApiResponse({
    status: 200,
    description: 'List of weather requests',
    type: [WeatherRequestResponseDto],
  })
  async findAll(): Promise<WeatherRequestResponseDto[]> {
    return this.weatherService.findAll();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export weather requests as JSON or CSV' })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'csv'],
    description: 'Export format (json or csv)',
  })
  @ApiResponse({
    status: 200,
    description: 'Weather data exported successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid format parameter',
  })
  @ApiResponse({
    status: 404,
    description: 'No weather request records found',
  })
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
  @ApiOperation({ summary: 'Get a specific weather request by ID' })
  @ApiParam({ name: 'id', description: 'Weather request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Weather request found',
    type: WeatherRequestResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Weather request not found',
  })
  async findOne(@Param('id') id: string): Promise<WeatherRequestResponseDto> {
    return this.weatherService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update weather request note (immutable core data)' })
  @ApiParam({ name: 'id', description: 'Weather request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Weather request note updated successfully',
    type: WeatherRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid note input',
  })
  @ApiResponse({
    status: 404,
    description: 'Weather request not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateWeatherRequestDto,
  ): Promise<WeatherRequestResponseDto> {
    return this.weatherService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a weather request' })
  @ApiParam({ name: 'id', description: 'Weather request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Weather request deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Weather request not found',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.weatherService.remove(id);
  }
}
