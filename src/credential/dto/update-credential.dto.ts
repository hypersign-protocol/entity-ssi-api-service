import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';
import { IsDid } from 'src/utils/customDecorator/did.decorator';

export enum Status {
  LIVE = 'LIVE',
  SUSPEND = 'SUSPEND',
  REVOKE = 'REVOKE',
}

export enum Namespace {
  testnet = 'testnet',
  mainnet = '',
}
export class UpdateCredentialDto {
  @ApiProperty({
    name: 'namespace',
    description: 'Namespace to be added in vcId.',
    example: 'testnet',
  })
  @IsString()
  @IsEnum(Namespace, {
    message: "namespace must be one of the following values: 'testnet'",
  })
  namespace: string;
  @ApiProperty({
    name: 'status',
    description: 'Credential status',
    example: 'LIVE / SUSPEND / REVOKE',
  })
  @IsEnum(Status)
  status: Status;
  @ApiProperty({
    name: 'statusReason',
    description: 'Credential status Reason',
    example: 'Reason',
  })
  @IsOptional()
  statusReason: string;
  @ApiProperty({
    name: 'issuerDid',
    description: 'issuerDid of the credential',
  })
  @IsString()
  @IsNotEmpty()
  @IsDid()
  issuerDid: string;

  @ApiProperty({
    description: 'Verification Method id for did updation',
    example: 'did:hid:testnet:........#key-${idx}',
  })
  @ValidateVerificationMethodId()
  verificationMethodId: string;
}
