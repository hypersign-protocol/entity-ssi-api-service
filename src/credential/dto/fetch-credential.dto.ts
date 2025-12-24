import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CredentialData {
  @ApiProperty({
    name: 'credentialId',
    description: 'Id of the credential',
    example: 'vc:hid:testnet:............',
  })
  credentialId: string;
  @ApiProperty({
    name: 'createdAt',
    description: 'Time at which document is created',
    example: '2025-11-19T07:47:15.632Z',
  })
  createdAt: string;
}
export class GetCredentialList {
  @ApiProperty({
    description: 'totalCount',
    example: 12,
  })
  @IsNumber()
  totalCount: number;

  @ApiProperty({
    description: 'data',
    type: CredentialData,
    isArray: true,
  })
  @Type(() => CredentialData)
  @ValidateNested()
  @IsArray()
  data: CredentialData[];
}
