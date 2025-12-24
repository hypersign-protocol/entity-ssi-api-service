import { ApiProperty } from '@nestjs/swagger';
import { DidDoc } from './update-did.dto';
import {
  IsEnum,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';
import { IsDid } from 'src/utils/customDecorator/did.decorator';
import { SupportedPurpose } from 'hs-ssi-sdk';

export enum Purpose {
  'assertion' = 'assertion',
  'authentication' = 'authentication',
}
export class Proof {
  @ApiProperty({
    name: 'type',
    description: 'signature type',
    example: 'Ed25519Signature2020',
  })
  @IsString()
  type: string;
  @ApiProperty({
    name: 'created',
    description: 'Time at which documant is signed',
    example: '2024-05-10T08:29:15Z',
  })
  @IsString()
  created: string;
  
  @ApiProperty({
    name: 'verificationMethod',
    description: 'verificationMethodId which is used for signing',
    example:
      'did:hid:testnet:z6MkvfkK24wE6KxJbw6XadDkmMSZwhmtJx4mYZG6hFci9eNm#key-1',
  })
  @ValidateVerificationMethodId()
  verificationMethod: string;
  
  @ApiProperty({
    name: 'proofPurpose',
    description: 'proofPurpose',
    example: SupportedPurpose.authentication,
  })
  @IsString()
  proofPurpose: string;
  @ApiProperty({
    name: 'challenge',
    description:
      'Random string used to sign in required in case of purpose authentication',
    example: 'skfdhldklgjh-gaghkdhgaskda-aisgkjheyi',
  })
  @ValidateIf((o) => o.purpose === 'authentication')
  @IsString()
  challenge?: string;
  @ApiProperty({
    name: 'domain',
    description: 'domain',
    example: 'example.com',
  })
  @ValidateIf((o) => o.purpose === 'authentication')
  @IsString()
  domain?: string;

  @ApiProperty({
    name: 'proofValue',
    description: 'proofValue of the didDocument',
    example:
      'z4CQEX1xAHauoMbAXfP3igFoKfPAETrGc3FwC5CAtnnLLZEX9FwghJ1eashf9zANfnNPYLZVyhGVg4m43Q9fs',
  })
  @IsString()
  proofValue: string;
}

export class SignedDidDocument extends DidDoc {
  @ApiProperty({
    name: 'proof',
    description: 'proof object of didDocument',
    type: Proof,
  })
  proof: Proof;
}
export class DidSignOption {
  @ApiProperty({
    name: 'purpose',
    description: 'purpose for signing didDocument',
    example: 'authentication',
    required: false,
    enum: SupportedPurpose,
    default: SupportedPurpose.assertionMethod,
  })
  @IsOptional()
  @IsString()
  @IsEnum(SupportedPurpose)
  purpose?: SupportedPurpose;
  @ApiProperty({
    name: 'challenge',
    description:
      'Random string used to sign in required in case of purpose authentication',
    example: 'skfdhldklgjh-gaghkdhgaskda-aisgkjheyi',
    required: false,
  })
  @ValidateIf((o) => o.purpose === 'authentication')
  @IsString()
  challenge: string;
  @ApiProperty({
    name: 'domain',
    description: 'domain',
    example: 'example.com',
    required: false,
  })
  @ValidateIf((o) => o.purpose === 'authentication')
  @IsString()
  domain: string;
}
export class SignDidDto {
  @ApiProperty({
    name: 'didDocument',
    description: 'didDocument',
    type: DidDoc,
    required: false,
  })
  @IsOptional()
  @IsNotEmptyObject()
  @Type(() => DidDoc)
  @ValidateNested({ each: true })
  didDocument: DidDoc;
  @ApiProperty({
    name: 'did',
    description: 'Id of the didDocument',
    example: 'did:hid:testnet:........',
    required: false,
  })
  @IsOptional()
  @IsDid()
  @IsString()
  did: string;

  @ApiProperty({
    description: 'Verification Method id for did registration',
    example: 'did:hid:testnet:........#key-${idx}',
    required: true,
  })
  @ValidateVerificationMethodId()
  verificationMethodId: string;
  
  @ApiProperty({
    name: 'options',
    description: 'optional parameter',
    type: DidSignOption,
    required: false,
  })
  @IsOptional()
  @Type(() => DidSignOption)
  @ValidateNested({ each: true })
  options?: DidSignOption;
}
