import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResolveLocationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Query must be at least 2 characters long' })
  query: string;
}
