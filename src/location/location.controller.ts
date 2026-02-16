import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LocationService } from './location.service';
import { ResolveLocationDto } from './dto/resolve-location.dto';
import { ResolvedLocationResponseDto } from './dto/resolved-location-response.dto';
import { ApiResolveLocation } from './decorators/location.swagger';

@ApiTags('location')
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('resolve')
  @ApiResolveLocation()
  async resolveLocation(
    @Query() dto: ResolveLocationDto,
  ): Promise<ResolvedLocationResponseDto> {
    return this.locationService.resolveLocation(dto.query);
  }
}
