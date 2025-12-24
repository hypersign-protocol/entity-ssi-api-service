import { ApiProperty } from '@nestjs/swagger';
import { DidDoc } from './update-did.dto';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';
import { IClientSpec } from 'hs-ssi-sdk';

export class ClientSpec {
  @ApiProperty({
    description: "IClientSpec  'eth-personalSign' or  'cosmos-ADR036'",
    example: 'eth-personalSign',
    name: 'type',
    required: false,
    enum: IClientSpec,
  })
  @IsEnum(IClientSpec)
  type: IClientSpec;
  @ApiProperty({
    description: 'bech32Address',
    example: 'hid334XFEAYYAGLKA....',
    name: 'adr036SignerAddress',
    required: false,
    type: String,
  })
  adr036SignerAddress: string;
}

export class SignInfo {
  @ApiProperty({
    description: 'Verification Method id for did registration',
    example: 'did:hid:testnet:123...#key-1',
    required: true,
  })
  @ValidateVerificationMethodId()
  verification_method_id: string;

  @ApiProperty({
    description: 'Signature for clientSpec',
    example: 'afafljagahgp9agjagknaglkj/kagka=',
    name: 'signature',
    required: true,
  })
  @ValidateIf((o, value) => o.clientSpec !== undefined)
  @IsNotEmpty()
  @IsString()
  signature: string;

  @ApiProperty({
    description: 'ClientSpec ',
    example: {
      type: IClientSpec['cosmos-ADR036'],
      adr036SignerAddress: 'bech32address',
    },
    type: ClientSpec,
    name: 'clientSpec',
  })
  @Type(() => ClientSpec)
  @ValidateNested({ each: true })
  clientSpec: ClientSpec;
  @ApiProperty({
    description: 'created',
    example: '2023-01-23T13:45:17Z',
  })
  @IsString()
  @IsNotEmpty()
  created: string;
}
export class RegisterDidDto {
  @ApiProperty({
    description: 'Did doc to be registered',
    type: DidDoc,
    required: true,
  })
  @IsNotEmptyObject()
  @Type(() => DidDoc)
  @ValidateNested({ each: true })
  didDocument: Partial<DidDoc>;

  @ApiProperty({
    description: 'Verification Method id for did registration',
    example: 'did:hid:testnet:........#key-${idx}',
    required: false,
  })
  @IsOptional()
  @ValidateVerificationMethodId()
  verificationMethodId?: string;

  @ApiProperty({
    description: "IClientSpec  'eth-personalSign' or  'cosmos-ADR036'",
    example: 'eth-personalSign',
    name: 'clientSpec',
    required: false,
  })
  @IsOptional()
  @IsEnum(IClientSpec)
  clientSpec?: IClientSpec | undefined;

  @ApiProperty({
    description: 'Signature for clientSpec',
    example: 'afafljagahgp9agjagknaglkj/kagka=',
    name: 'signature',
    required: false,
  })
  @ValidateIf((o, value) => o.clientSpec !== undefined)
  @IsNotEmpty()
  @IsString()
  signature?: string;

  @ApiProperty({
    description: 'Sign Info',
    example: [
      {
        verification_method_id: 'did:hid:testnet:........#key-${idx}',
        signature: 'signature',
        clientSpec: {
          type: IClientSpec['cosmos-ADR036'],
          adr036SignerAddress: 'Bech32address',
        },
      },
    ],
    isArray: true,
    required: false,
    type: SignInfo,
  })
  @Type(() => SignInfo)
  @ValidateNested({ each: true })
  signInfos?: Array<SignInfo>;
  // @ApiProperty({
  //   description: 'Checksum address from web3 wallet',
  //   example: 'hid148273582',
  //   name: 'address',
  //   required: false,
  // })
  // @IsOptional()
  // @IsString()
  // address?: string;
}

export class RegisterV2SignInfo {
  @ApiProperty({
    description: 'Verification Method id for did registration',
    example: 'did:hid:testnet:........#key-${idx}',
    required: true,
  })
  @ValidateVerificationMethodId()
  verification_method_id: string;

  @ApiProperty({
    description: 'Signature for clientSpec',
    example: 'afafljagahgp9agjagknaglkj/kagka=',
    name: 'signature',
    required: false,
  })
  @ValidateIf((o, value) => o.clientSpec !== undefined)
  @IsNotEmpty()
  @IsString()
  signature?: string;
  @ApiProperty({
    description: 'ClientSpec ',
    example: {
      type: IClientSpec['cosmos-ADR036'],
      adr036SignerAddress: 'bech32address',
    },
    type: ClientSpec,
    name: 'clientSpec',
    required: false,
  })
  @IsOptional()
  @Type(() => ClientSpec)
  @ValidateNested({ each: true })
  clientSpec?: ClientSpec;
  @ApiProperty({
    description: 'created',
    example: '2023-01-23T13:45:17Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  created?: string;
}
export class RegisterV2DidDto {
  @ApiProperty({
    description: 'Did doc to be registered',
    type: DidDoc,
    required: true,
  })
  @IsNotEmptyObject()
  @Type(() => DidDoc)
  @ValidateNested({ each: true })
  didDocument: Partial<DidDoc>;

  @ApiProperty({
    description: 'Sign Info',
    isArray: true,
    required: true,
    type: RegisterV2SignInfo,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: false })
  @Type(() => RegisterV2SignInfo)
  signInfos: Array<RegisterV2SignInfo>;
}
