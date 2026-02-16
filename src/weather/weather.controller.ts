import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { GetWeatherDto } from './dto/get-weather.dto';
import { CreateWeatherRequestDto } from './dto/create-weather-request.dto';
import { UpdateWeatherRequestDto } from './dto/update-weather-request.dto';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';
import { WeatherRequestResponseDto } from './dto/weather-request-response.dto';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current weather for a location with caching' })
  @ApiQuery({
    name: 'location',
    type: String,
    description: 'City name (min 2 characters)',
  })
  @ApiResponse({
    status: 200,
    description: 'Weather data successfully retrieved',
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
  @ApiOperation({ summary: 'Update a weather request (only locationInput)' })
  @ApiParam({ name: 'id', description: 'Weather request UUID' })
  @ApiResponse({
    status: 200,
    description: 'Weather request updated successfully',
    type: WeatherRequestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input',
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
