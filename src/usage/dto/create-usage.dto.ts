import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class ServiceDetails {
  @ApiProperty({
    name: 'apiPath',
    description: 'Api path',
    example:
      '/api/v1/did/resolve/did:hid:testnet:z6MkwA7dopBx7HGBNUwvfeg2Sh9LyWvvLuBKRtf2vmJxCsfv',
  })
  apiPath: string;
  @ApiProperty({
    name: 'method',
    description: 'Api method detail',
    example: 'GET',
  })
  method: string;
  @ApiProperty({
    name: 'quantity',
    description: 'Number of api call for specific path.',
    example: 8,
  })
  quantity: number;
  @ApiProperty({
    name: 'onchain_unit_cost',
    description: 'On chain unit cost',
    example: 0,
  })
  onchain_unit_cost: number;
  @ApiProperty({
    name: 'offchain_unit_cost',
    description: 'off chain unit cost',
    example: 1,
  })
  offchain_unit_cost: number;
  @ApiProperty({
    name: 'onchainAmount',
    description:
      'Total amount required for onchain transaction(in uhid) for specificv api path.',
    example: 0,
  })
  onchainAmount: number;
  @ApiProperty({
    name: 'offchainAmount',
    description:
      'Total amount required for onchain transaction(in uhid) for specificv api path.',
    example: 8,
  })
  offchainAmount: number;
}

export class FetchUsageRespDetail {
  @ApiProperty({
    name: 'startDate',
    description: 'Date from where usage detail is to be fetched',
    example: '2025-02-28T18:30:00.000Z',
  })
  startDate: Date;
  @ApiProperty({
    name: 'endDate',
    description: 'Date till which we have to fetch detail',
    example: '2025-03-07T04:28:10.362Z',
  })
  endDate: Date;
  @ApiProperty({
    name: 'serviceDetails',
    description: 'Detailed service description',
    type: ServiceDetails,
    isArray: true,
  })
  @Type(() => ServiceDetails)
  @ValidateNested({ each: true })
  serviceDetails: ServiceDetails;
}
export class DetailedServiceUsage {
  @ApiProperty({
    name: 'apiPath',
    description: 'Api path',
    example: '/api/v1/credential?page=1&limit=100',
  })
  apiPath: string;

  @ApiProperty({
    name: 'quantity',
    description: 'Number of api call for specific path.',
    example: 4,
  })
  quantity: number;

  @ApiProperty({
    name: 'data',
    description: 'detailed date wise data and quantity',
    example: { '2025-03-07': 4 },
  })
  data: object;
}
export class FetchDetailUsageDto {
  @ApiProperty({
    name: 'startDate',
    description: 'Date from where usage detail is to be fetched',
    example: '2025-02-28T18:30:00.000Z',
  })
  startDate: Date;
  @ApiProperty({
    name: 'endDate',
    description: 'Date till which we have to fetch detail',
    example: '2025-03-07T04:28:10.362Z',
  })
  endDate: Date;
  @ApiProperty({
    name: 'serviceDetails',
    description: 'Detailed service description',
    type: DetailedServiceUsage,
    isArray: true,
  })
  @Type(() => DetailedServiceUsage)
  @ValidateNested({ each: true })
  serviceDetails: DetailedServiceUsage;
}
