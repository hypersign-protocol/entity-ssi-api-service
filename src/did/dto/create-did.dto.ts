import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { RegistrationStatus } from '../schemas/did.schema';
import { DidDoc } from '../dto/update-did.dto';
import {
  IsDid,
  IsMethodSpecificId,
} from 'src/utils/customDecorator/did.decorator';
import { ValidatePublicKeyMultibase } from 'src/utils/customDecorator/pubKeyMultibase.decorator';
import { IVerificationRelationships, IKeyType } from 'hs-ssi-sdk';
import { IsKeyTypeArrayOrSingle } from 'src/utils/customDecorator/keyType.decorator';

export enum Namespace {
  testnet = 'testnet',
  mainnet = '',
}
export class Options {
  @ApiProperty({
    description:
      'Verification Method Keytype Ed25519VerificationKey2020 or EcdsaSecp256k1RecoveryMethod2020 or BabyJubJubKey2021',
    example: 'keyType:EcdsaSecp256k1RecoveryMethod2020',
    name: 'keyType',
    required: false,
  })
  @ValidateIf((o) => o.keyType !== undefined)
  @IsKeyTypeArrayOrSingle()
  keyType: IKeyType | IKeyType[];

  @ApiProperty({
    name: 'chainId',
    example: '0x1',
    description: 'Chain Id in HEX format',
    required: false,
  })
  @IsOptional()
  @IsString()
  chainId?: string;

  @ApiProperty({
    name: 'publicKey',
    example: `z76tzt4XCb6FNqC3CPZvsxRfEDX5HHQc2VPux4DeZYndW`,
    description: 'Public Key extracted from keplr',
    required: false,
  })
  @IsOptional()
  @ValidatePublicKeyMultibase()
  publicKey?: string;

  @ApiProperty({
    name: 'walletAddress',
    example: `0x01978e553Df0C54A63e2E063DFFe71c688d91C76`,
    description: 'Checksum address from web3 wallet',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(32)
  walletAddress?: string;
  @IsOptional()
  @IsBoolean()
  register?: boolean = false; // keeping it for time being will remove it later

  // @ApiProperty({
  //   description:
  //     'verificationRelationships defines  verification methods to be used for which purposes',
  //   example: 'authentication/ assertionMethod',
  //   name: 'verificationRelationships',
  //   required: false,
  //   isArray: true,
  // })
  // @IsOptional()
  // @IsArray()
  // @IsEnum(IVerificationRelationships, { each: true })
  // verificationRelationships?: IVerificationRelationships[];

  @ApiProperty({
    name: 'name',
    example: `Issuer Identity`,
    description: 'Any human-readable name for this DID',
    required: false,
  })
  @IsOptional()
  name?: string;
}
export class CreateDidDto {
  @ApiProperty({
    name: 'namespace',
    description: 'Namespace to be added in did.',
    example: 'testnet',
  })
  @IsEnum(Namespace, {
    message: "namespace must be one of the following values: 'testnet', '' ",
  })
  namespace: string;

  @ApiProperty({
    name: 'methodSpecificId',
    description: 'MethodSpecificId to be added in did',
    example: '0x19d73aeeBcc6FEf2d0342375090401301Fe9663F',
    required: false,
    minLength: 32,
    maxLength: 48,
  })
  @IsOptional()
  @IsString()
  @MinLength(32)
  @MaxLength(48)
  @IsMethodSpecificId()
  methodSpecificId?: string;

  @ApiProperty({
    name: 'options',
    description: ' keyType used for verification',
    required: false,
    example: {
      keyType: ['Ed25519VerificationKey2020'],
      chainId: '0x1',
      publicKey: 'z76tzt4XCb6FNqC3CPZvsxRfEDX5HHQc2VPux4DeZYndW',
      walletAddress: '0x01978e553Df0C54A63e2E063DFFe71c688d91C76',
      // verificationRelationships: ['assertionMethod', 'authentication'],
    },
  })
  @IsOptional()
  @IsObject()
  @Type(() => Options)
  @ValidateNested({
    each: true,
  })
  options?: Options;
}

export class TxnHash {
  @ApiProperty({
    name: 'transactionHash',
    description: 'Transaction Hash',
    example: 'XYAIFLKFLKHSLFHKLAOHFOAIHG..........',
  })
  transactionHash: string;
}
class MetaData {
  @ApiProperty({
    description: 'Did document',
    name: 'didDocument',
    type: DidDoc,
  })
  @ValidateNested()
  @Type(() => DidDoc)
  didDocument: Partial<DidDoc>;
}
export class CreateDidResponse {
  @ApiProperty({
    name: 'did',
    description: 'Did document id',
    example: 'did:hid:namespace:.......................',
  })
  @IsString()
  @IsDid()
  did: string;

  @ApiProperty({
    name: 'registrationStatus',
    description: 'Did document registration status',
    example: 'COMPLETED/PROCESSING',
  })
  registrationStatus: RegistrationStatus;
  @ApiHideProperty()
  @Exclude()
  @IsString()
  transactionHash: string;
  @ApiProperty({
    name: 'metaData',
    description: 'metaData contaning initial didDocument',
    type: MetaData,
  })
  @ValidateNested()
  @Type(() => MetaData)
  metaData: MetaData;
}
export class RegisterDidResponse extends CreateDidResponse {
  @ApiProperty({
    name: 'transactionHash',
    description: 'Transaction Has',
    example: 'XYAIFLKFLKHSLFHKLAOHFOAIHG..........',
  })
  @IsString()
  transactionHash: string;
}
