import { IsString, IsNotEmpty, IsOptional, IsDateString, MinLength } from 'class-validator';
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
}
