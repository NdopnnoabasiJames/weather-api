import { Controller, Get, Query } from '@nestjs/common';
import { LocationService } from './location.service';
import { ResolveLocationDto } from './dto/resolve-location.dto';
import { ResolvedLocationResponseDto } from './dto/resolved-location-response.dto';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('resolve')
  async resolveLocation(
    @Query() dto: ResolveLocationDto,
  ): Promise<ResolvedLocationResponseDto> {
    return this.locationService.resolveLocation(dto.query);
  }
}
