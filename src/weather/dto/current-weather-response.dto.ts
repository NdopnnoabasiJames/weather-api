import { ApiProperty } from '@nestjs/swagger';

class AirQualityDto {
  @ApiProperty({
    description: 'Air Quality Index (1-5)',
    example: 1,
  })
  aqi: number;

  @ApiProperty({
    description: 'Air quality category',
    example: 'Good',
  })
  category: string;
}

export class CurrentWeatherResponseDto {
  @ApiProperty({
    description: 'Location for which weather was retrieved',
    example: 'London, England, GB',
  })
  location: string;

  @ApiProperty({
    description: 'Temperature in Celsius',
    example: 15.5,
  })
  temperature: number;

  @ApiProperty({
    description: 'Feels like temperature in Celsius',
    example: 13.2,
  })
  feelsLike: number;

  @ApiProperty({
    description: 'Humidity percentage',
    example: 72,
  })
  humidity: number;

  @ApiProperty({
    description: 'Wind speed in m/s',
    example: 5.4,
  })
  windSpeed: number;

  @ApiProperty({
    description: 'Weather condition description',
    example: 'Partly cloudy',
  })
  weatherDescription: string;

  @ApiProperty({
    description: 'Air quality information',
    type: AirQualityDto,
    required: false,
    nullable: true,
  })
  airQuality: AirQualityDto | null;

  @ApiProperty({
    description: 'Timestamp when data was fetched',
    example: '2026-02-15T20:30:00.000Z',
  })
  fetchedAt: string;

  @ApiProperty({
    description: 'Whether the data was served from cache',
    example: false,
  })
  isCached: boolean;

  @ApiProperty({
    description: 'Warning message if data is stale',
    example: 'Using cached data due to API unavailability',
    required: false,
  })
  warning?: string;
}
