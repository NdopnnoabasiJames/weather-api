import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CurrentWeatherResponseDto } from '../dto/current-weather-response.dto';
import { WeatherRequestResponseDto } from '../dto/weather-request-response.dto';

export function ApiGetCurrentWeather() {
  return applyDecorators(
    ApiOperation({ summary: 'Get current weather and air quality for a location with caching' }),
    ApiQuery({
      name: 'location',
      type: String,
      description: 'City name (min 2 characters)',
    }),
    ApiResponse({
      status: 200,
      description: 'Weather and air quality data successfully retrieved',
      type: CurrentWeatherResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid location parameter',
    }),
    ApiResponse({
      status: 404,
      description: 'Location not found',
    }),
    ApiResponse({
      status: 503,
      description: 'Service unavailable - External API error and no cache',
    }),
  );
}

export function ApiCreateWeatherRequest() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new weather request (current or historical)' }),
    ApiResponse({
      status: 201,
      description: 'Weather request created successfully',
      type: WeatherRequestResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid input or date range',
    }),
    ApiResponse({
      status: 404,
      description: 'Location not found',
    }),
  );
}

export function ApiFindAllWeatherRequests() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all weather requests' }),
    ApiResponse({
      status: 200,
      description: 'List of weather requests',
      type: [WeatherRequestResponseDto],
    }),
  );
}

export function ApiExportWeatherData() {
  return applyDecorators(
    ApiOperation({ summary: 'Export weather requests as JSON or CSV' }),
    ApiQuery({
      name: 'format',
      enum: ['json', 'csv'],
      description: 'Export format (json or csv)',
    }),
    ApiResponse({
      status: 200,
      description: 'Weather data exported successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid format parameter',
    }),
    ApiResponse({
      status: 404,
      description: 'No weather request records found',
    }),
  );
}

export function ApiFindOneWeatherRequest() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a specific weather request by ID' }),
    ApiParam({ name: 'id', description: 'Weather request UUID' }),
    ApiResponse({
      status: 200,
      description: 'Weather request found',
      type: WeatherRequestResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Weather request not found',
    }),
  );
}

export function ApiUpdateWeatherRequest() {
  return applyDecorators(
    ApiOperation({ summary: 'Update weather request note (immutable core data)' }),
    ApiParam({ name: 'id', description: 'Weather request UUID' }),
    ApiResponse({
      status: 200,
      description: 'Weather request note updated successfully',
      type: WeatherRequestResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid note input',
    }),
    ApiResponse({
      status: 404,
      description: 'Weather request not found',
    }),
  );
}

export function ApiDeleteWeatherRequest() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a weather request' }),
    ApiParam({ name: 'id', description: 'Weather request UUID' }),
    ApiResponse({
      status: 200,
      description: 'Weather request deleted successfully',
    }),
    ApiResponse({
      status: 404,
      description: 'Weather request not found',
    }),
  );
}
