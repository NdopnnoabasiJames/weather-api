import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { ResolveLocationDto } from './dto/resolve-location.dto';
import { ResolvedLocationResponseDto } from './dto/resolved-location-response.dto';

@ApiTags('location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve location coordinates from city name' })
  @ApiQuery({ name: 'query', type: String, description: 'City name (min 2 characters)' })
  @ApiResponse({
    status: 200,
    description: 'Location successfully resolved',
    type: ResolvedLocationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid query parameter',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - External API error',
  })
  async resolveLocation(
    @Query() dto: ResolveLocationDto,
  ): Promise<ResolvedLocationResponseDto> {
    return this.locationService.resolveLocation(dto.query);
  }
}
