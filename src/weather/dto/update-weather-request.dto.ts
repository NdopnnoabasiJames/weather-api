import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWeatherRequestDto {
  @ApiProperty({
    description: 'Updated location input',
    example: 'Paris',
    required: false,
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  locationInput?: string;
}
