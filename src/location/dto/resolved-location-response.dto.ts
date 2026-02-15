import { ApiProperty } from '@nestjs/swagger';

export class ResolvedLocationResponseDto {
  @ApiProperty({
    description: 'Original query input',
    example: 'London',
  })
  input: string;

  @ApiProperty({
    description: 'Normalized location name with state/region and country',
    example: 'London, England, GB',
  })
  normalizedLocation: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 51.5074,
  })
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -0.1278,
  })
  longitude: number;
}
