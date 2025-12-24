import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateLogDto {
  @ApiProperty({
    name: 'appId',
    description: 'appId of the request',
    example: 'jag-gasgah-aw14234-1234',
  })
  @IsString()
  appId: string;
  @ApiProperty({
    name: 'method',
    description: 'method of the request',
    example: 'POST',
  })
  @IsString()
  method: string;
  @ApiProperty({
    name: 'path',
    description: 'path of the request',
    example: '/api/v1/did',
  })
  @IsString()
  path: string;
  @ApiProperty({
    name: 'statusCode',
    description: 'statusCode of the request',
    example: 200,
  })
  @IsString()
  statusCode: number;
  @ApiProperty({
    name: 'contentLength',
    description: 'contentLength of the request',
    example: 200,
  })
  @IsString()
  contentLength: string;
  @ApiProperty({
    name: 'userAgent',
    description: 'userAgent of the request',
    example: 'postman',
  })
  @IsString()
  userAgent: string;
  @IsOptional()
  @IsString()
  dataRequest?: string;
}
