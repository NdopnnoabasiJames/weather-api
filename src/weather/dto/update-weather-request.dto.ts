import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWeatherRequestDto {
  @ApiProperty({
    description: 'Optional note or comment about this weather request',
    example: 'This data was requested for quarterly report analysis',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
