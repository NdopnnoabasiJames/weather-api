import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ResolvedLocationResponseDto } from '../dto/resolved-location-response.dto';

export function ApiResolveLocation() {
  return applyDecorators(
    ApiOperation({ summary: 'Resolve location coordinates from city name' }),
    ApiQuery({ name: 'query', type: String, description: 'City name (min 2 characters)' }),
    ApiResponse({
      status: 200,
      description: 'Location successfully resolved',
      type: ResolvedLocationResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid query parameter',
    }),
    ApiResponse({
      status: 404,
      description: 'Location not found',
    }),
    ApiResponse({
      status: 503,
      description: 'Service unavailable - External API error',
    }),
  );
}
