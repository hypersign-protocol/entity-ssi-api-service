import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { Status } from '../schema/credit-manager.schema';
import { Type } from 'class-transformer';
export enum ValidityPeriodUnit {
  DAYS = 'DAYS',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}
export class CreateCreditManagerDto {
  @ApiProperty({
    name: 'credit',
    description: 'Number of credits available',
    example: 1000,
  })
  @IsNumber()
  @Min(10)
  totalCredits: number;
  validityDuration: number;
  validityDurationUnit: ValidityPeriodUnit;
  serviceId: string;
  creditDenom: string;
}

export class Credit {
  @ApiProperty({
    name: 'amount',
    description: 'Total available hid',
    example: '5000000',
  })
  @IsNumber()
  amount: number;
  @ApiProperty({
    name: 'denom',
    description: 'Token denom',
    example: 'uhid',
  })
  @IsString()
  denom: string;
  @ApiProperty({
    name: 'used',
    description: 'Total used credit',
    example: 0,
  })
  @IsNumber()
  used: number;
}
export class createCreditResponse {
  @ApiProperty({
    name: 'totalCredits',
    description: 'Total available credit',
    example: 1000,
  })
  @IsNumber()
  totalCredits: number;
  @ApiProperty({
    name: 'creditDenom',
    description: 'Token denom',
    example: 'uHID',
  })
  @IsNumber()
  creditDenom: string;
  @ApiProperty({
    name: 'used',
    description: 'Total number of credit used till now',
    example: 0,
  })
  @IsNumber()
  used: number;
  @ApiProperty({
    name: 'validityDuration',
    description:
      'The number of days the credit is valid from the date of activation',
    example: 42,
  })
  @IsNumber()
  validityDuration: number;
  // @ApiProperty({
  //   name: 'expiresAt',
  //   description: 'Time at which document is added',
  //   example: '2025-04-22T12:50:03.984Z',
  //   required: false
  // })
  // expiresAt: Date;
  @ApiProperty({
    name: 'status',
    description:
      'The current status of the credit detail. Indicates whether the credit is active or inactive.',
    enum: Status,
    example: Status.INACTIVE,
  })
  @IsString()
  status: string;
  @ApiProperty({
    name: 'serviceId',
    description: 'Id of the service',
    example: 'fc0392830696e097b1d7e0607968e9dd3400',
  })
  @IsString()
  serviceId: string;
  @ApiProperty({
    name: 'credit',
    type: Credit,
  })
  @Type(() => Credit)
  @ValidateNested()
  credit: Credit;
  @ApiProperty({
    name: 'creditScope',
    description: 'Scope that one will get',
    example: [
      'MsgRegisterDID',
      'MsgDeactivateDID',
      'MsgRegisterCredentialSchema',
      'MsgUpdateDID',
      'MsgUpdateCredentialStatus',
      'MsgRegisterCredentialStatus',
    ],
  })
  @IsString()
  creditScope: Array<string>;
  @ApiProperty({
    name: '_id',
    description: 'Unique identifier of credit detail',
    example: '66e0407bc7f8a92162d1e824',
  })
  @IsString()
  _id: string;
  @ApiProperty({
    name: 'createdAt',
    description: 'Time at which document is added',
    example: '2025-03-10T12:50:03.984Z',
  })
  @IsString()
  createdAt: string;
  @ApiProperty({
    name: 'updatedAt',
    description: 'Time at which document last updated',
    example: '2025-03-10T12:50:03.984Z',
  })
  @IsString()
  updatedAt: string;
}

export class ActivateCredtiResponse extends createCreditResponse {
  @ApiProperty({
    name: 'status',
    description:
      'The current status of the credit detail. Indicates whether the credit is active or inactive.',
    enum: Status,
    example: Status.ACTIVE,
  })
  @IsString()
  status: string;
  @ApiProperty({
    name: 'expiresAt',
    description:
      'The date and time when the credit expires. After this timestamp, the credit is no longer valid.',
    example: '2025-04-22T12:50:03.984Z',
  })
  @IsString()
  expiresAt: Date;
}

export class CreditManagerRequestDto {
  @ApiProperty({
    name: 'credit',
    type: Credit,
  })
  @Type(() => Credit)
  @ValidateNested()
  credit: Credit;
  @ApiProperty({
    name: 'creditScope',
    description: 'Scope that one will get',
    example: [
      'MsgRegisterDID',
      'MsgDeactivateDID',
      'MsgRegisterCredentialSchema',
      'MsgUpdateDID',
      'MsgUpdateCredentialStatus',
      'MsgRegisterCredentialStatus',
    ],
  })
  @IsString()
  creditScope: Array<string>;
}