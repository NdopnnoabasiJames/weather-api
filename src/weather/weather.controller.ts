import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { GetWeatherDto } from './dto/get-weather.dto';
import { CurrentWeatherResponseDto } from './dto/current-weather-response.dto';

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
}
