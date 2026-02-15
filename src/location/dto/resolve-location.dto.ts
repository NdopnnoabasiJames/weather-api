import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveLocationDto {
  @ApiProperty({
    description: 'City name or location to resolve',
    example: 'London',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Query must be at least 2 characters long' })
  query: string;
}
