import { IsString, IsNotEmpty, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWeatherRequestDto {
  @ApiProperty({
    description: 'City name or location',
    example: 'London',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  locationInput: string;

  @ApiProperty({
    description: 'Start date for historical weather (YYYY-MM-DD format)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for historical weather (YYYY-MM-DD format)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Optional note or comment about this weather request',
    example: 'Data needed for quarterly climate analysis report',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
