import { ApiProperty } from '@nestjs/swagger';

class LocationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  state?: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;
}

export class WeatherRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  locationInput: string;

  @ApiProperty()
  location: LocationDto;

  @ApiProperty({ required: false })
  startDate?: Date;

  @ApiProperty({ required: false })
  endDate?: Date;

  @ApiProperty({ required: false })
  avgTemperature?: number;

  @ApiProperty({ required: false })
  minTemperature?: number;

  @ApiProperty({ required: false })
  maxTemperature?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
