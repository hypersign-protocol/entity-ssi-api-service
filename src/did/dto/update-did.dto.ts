import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsDid } from 'src/utils/customDecorator/did.decorator';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';
import { SignInfo } from './register-did.dto';
export enum IClientSpec {
  'eth-personalSign' = 'eth-personalSign',
  'cosmos-ADR036' = 'cosmos-ADR036',
}

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

export class verificationMethod {
  @ApiProperty({
    description: 'Verification Method id',
    example:
      'did:hid:testnet:z28ScfSszr2zi2Bd7qmNE4mfHX5j8nCwx4DBF6nAUHu4p#key-1',
  })
  @ValidateVerificationMethodId()
  id: string;

  @ApiProperty({
    description: 'Verification Method type',
    example: 'EcdsaSecp256k1RecoveryMethod2020',
  })
  @IsString()
  type: string;
  @ApiProperty({
    description: 'Verification Method controller',
    example: 'did:hid:method:..............',
  })
  @IsDid()
  @IsString()
  controller: string;
  @ApiProperty({
    description: 'publicKeyMultibase',
    example: 'z28ScfSszr2zi2Bd7qmNE4mfHX5j8nCwx4DBF6nAUHu4p',
    required: false,
  })
  @IsOptional()
  @IsString()
  publicKeyMultibase: string;
  @ApiProperty({
    description: 'blockchainAccountId',
    example: 'eip155:1:0x19d73aeeBcc6FEf2d0342375090401301Fe9663F',
    required: false,
  })
  @IsOptional()
  @IsString()
  blockchainAccountId: string;
}
class Service {
  @ApiProperty({
    description: 'id',
    example:
      'did:hid:testnet:z23dCariJNNpMNca86EtVZVvrLpn61isd86fWVyWa8Jkm#linked-domain',
  })
  @IsDid()
  @IsString()
  id: string;
  @ApiProperty({
    description: 'type',
    example: 'LinkedDomains',
  })
  @IsString()
  type: string;
  @ApiProperty({
    description: 'serviceEndpoint',
    example:
      'https://stage.hypermine.in/studioserver/api/v1/org/did:hid:testnet:......................',
  })
  @IsString()
  serviceEndpoint: string;
}
export class DidDoc {
  @ApiProperty({
    description: 'Context',
    example: ['https://www.w3.org/ns/did/v1'],
  })
  @IsOptional()
  @IsArray()
  '@context'?: Array<string>;

  @ApiProperty({
    description: 'id',
    example: 'did:hid:method:......',
  })
  @IsDid()
  @IsString()
  id: string;
  @ApiProperty({
    description: 'Controller',
    example: ['did:hid:method:......'],
  })
  @IsArray()
  controller: Array<string>;
  @ApiProperty({
    description: 'alsoKnownAs',
    example: ['did:hid:method:......'],
  })
  @IsArray()
  @IsOptional()
  alsoKnownAs: Array<string>;
  @ApiProperty({
    description: 'verificationMethod',
    type: verificationMethod,
    isArray: true,
  })
  @Type(() => verificationMethod)
  @ValidateNested({ each: true })
  verificationMethod: Array<Partial<verificationMethod>>;
  @ApiProperty({
    description: 'authentication',
    example: ['did:hid:method:......'],
  })
  @IsArray()
  authentication: Array<string>;
  @ApiProperty({
    description: 'assertionMethod',
    example: ['did:hid:method:......'],
  })
  @IsArray()
  assertionMethod: Array<string>;

  @ApiProperty({
    description: 'keyAgreement',
    example: [],
  })
  @IsArray()
  @IsOptional()
  keyAgreement: Array<string>;
  @ApiProperty({
    description: 'capabilityInvocation',
    example: [],
  })
  @IsArray()
  @IsOptional()
  capabilityInvocation: Array<string>;
  @ApiProperty({
    description: 'capabilityDelegation',
    example: ['did:hid:method:......'],
  })
  @IsArray()
  @IsOptional()
  capabilityDelegation: Array<string>;
  @ApiProperty({
    description: 'service',
    type: Service,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Array<Service>)
  @ValidateNested()
  @IsArray()
  service: Array<Partial<Service>>;
}

export class DidDocumentMetaData {
  @ApiProperty({
    name: 'created',
    example: '2023-01-23T13:45:17Z',
  })
  created: string;
  @ApiProperty({
    name: 'updated',
    example: '2023-01-23T13:45:17Z',
  })
  updated: string;
  @ApiProperty({
    name: 'deactivated',
    example: 'false',
  })
  deactivated: boolean;
  @ApiProperty({
    name: 'versionId',
    example: '095A65E4D2F9CA2AACE0D17A28883A0E5DDC1BBE1C9BF9D.............',
  })
  versionId: string;
}

export class ResolvedDid {
  @ApiProperty({
    name: 'didDocument',
    description: 'Resolved Did Document',
    example: DidDoc,
  })
  didDocument: DidDoc;
  @ApiProperty({
    name: 'didDocumentMetadata',
    description: 'Resolved didDocumentMetadata',
    example: DidDoc,
  })
  didDocumentMetadata: DidDocumentMetaData;
}

export class UpdateDidDto {
  @ApiProperty({
    description: 'Did doc to be updated',
    type: DidDoc,
    required: false,
  })
  @IsOptional()
  @IsNotEmptyObject()
  @Type(() => DidDoc)
  @ValidateNested()
  didDocument: DidDoc;
  @ApiProperty({
    description: 'DidDocument id',
    example: 'did:hid:testnet:rt245vfnk.......',
    required: false,
  })
  @ValidateIf((dto) => dto.name !== undefined && dto.didDocument === undefined)
  @IsString()
  @IsNotEmpty()
  did?: string;
  
  @ApiProperty({
    description: 'Verification Method id for did registration',
    example: 'did:hid:testnet:........#key-${idx}',
    required: false,
  })
  @IsOptional()
  @ValidateVerificationMethodId()
  verificationMethodId?: string;

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

  @ApiProperty({
    description: 'Field to check if to deactivate did or to update it ',
    example: false,
    required: false,
  })
  @ValidateIf((dto) => dto.didDocument !== undefined)
  @IsBoolean()
  deactivate?: boolean;

  @ApiProperty({
    name: 'name',
    example: `Issuer Identity`,
    description: 'Any human-readable name for this DID',
    required: false,
  })
  @IsOptional()
  name?: string;
}

export class UpdateDidResp {
  @ApiProperty({
    name: 'transactionHash',
    description: 'Transaction Hash',
    example: 'XYAIFLKFLKHSLFHKLAOHFOAIHG..........',
    required: false,
  })
  @IsOptional()
  transactionHash: string;
  @ApiProperty({
    name: 'didDocument',
    description: 'Resolved Did Document',
    example: DidDoc,
    required: false,
  })
  @IsOptional()
  didDocument: DidDoc;
  @ApiProperty({
    description: 'DidDocument id',
    example: 'did:hid:testnet:rt245vfnk.......',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  did?: string;
  @ApiProperty({
    name: 'name',
    example: `Issuer Identity`,
    description: 'Any human-readable name for this DID',
    required: false,
  })
  @IsOptional()
  name?: string;
}
