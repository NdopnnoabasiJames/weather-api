import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExportWeatherDto {
  @ApiProperty({
    description: 'Export format',
    example: 'json',
    enum: ['json', 'csv'],
  })
  @IsString()
  @IsIn(['json', 'csv'], { message: 'Format must be either json or csv' })
  format: 'json' | 'csv';
}
