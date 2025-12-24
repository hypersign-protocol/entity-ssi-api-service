import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class UsageError {
  @ApiProperty({
    description: 'statusCode',
    example: 400,
  })
  @IsNumber()
  statusCode: number;

  @ApiProperty({
    description: 'message',
    example: ['error message 1', 'error message 2'],
  })
  @IsString()
  message: Array<string>;

  @ApiProperty({
    description: 'error',
    example: 'Bad Request',
  })
  @IsString()
  error: string;
}
export class UsageNotFoundError {
  @ApiProperty({
    description: 'statusCode',
    example: 404,
  })
  @IsNumber()
  statusCode: number;

  @ApiProperty({
    description: 'message',
    example: ['error message 1', 'error message 2'],
  })
  @IsString()
  message: Array<string>;

  @ApiProperty({
    description: 'error',
    example: 'Not Found',
  })
  @IsString()
  error: string;
}

export class UsageUnAuthorizeError {
  @ApiProperty({
    description: 'statusCode',
    example: 401,
  })
  @IsNumber()
  statusCode: number;

  @ApiProperty({
    description: 'message',
    example: ['error message 1', 'error message 2'],
  })
  @IsString()
  message: Array<string>;

  @ApiProperty({
    description: 'error',
    example: 'Not Found',
  })
  @IsString()
  error: string;
}
