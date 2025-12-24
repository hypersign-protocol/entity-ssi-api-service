import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsArray } from 'class-validator';

import { RegistrationStatus } from '../schema/status.schema';

export class RegistrationStatusList {
  @ApiProperty({
    description: 'totalCount',
    example: 12,
  })
  @IsNumber()
  totalCount: number;

  @ApiProperty({
    description: 'data',
    type: RegistrationStatus,
    example: [],
    isArray: true,
  })
  @IsString()
  @IsArray()
  data: Array<RegistrationStatus[]>;
}
