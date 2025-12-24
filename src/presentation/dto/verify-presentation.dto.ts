import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsDid } from 'src/utils/customDecorator/did.decorator';
import { IsVcId } from 'src/utils/customDecorator/vc.decorator';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';
import { Presentation } from './create-presentation-request.dto';
export class VerifyPresentationDto {
  @ApiProperty({
    name: 'presentation',
    description: 'list of credentials',
    type: Presentation,
  })
  @IsObject()
  @IsNotEmptyObject()
  @Type(() => Presentation)
  @ValidateNested({ each: true })
  presentation: Presentation;
  @ApiProperty({
    name: 'holderVerificationMethodId',
    description:
      'The verificationMethodId used by the holder for signing the presentation.',
    example: 'did:hid:testnet:........#key-${idx}',
    required: false,
  })
  @IsOptional()
  @ValidateVerificationMethodId()
  holderVerificationMethodId?: string;

  @ApiProperty({
    name: 'issuerVerificationMethodId',
    description:
      'The verificationMethodId used by the issuer for signing the credential.',
    example: 'did:hid:testnet:........#key-${idx}',
    required: false,
  })
  @IsOptional()
  @ValidateVerificationMethodId()
  issuerVerificationMethodId?: string;
}

class PResultProof {
  @ApiProperty({
    name: '@context',
    description: 'context',
    example: [
      'https://www.w3.org/2018/credentials/v1',
      {
        '@context': {
          '@protected': true,
          '@version': 1.1,
          id: '@id',
          type: '@type',
          RailwayTicketSchema: {
            '@context': {
              '@propagate': true,
              '@protected': true,
              xsd: 'http://www.w3.org/2001/XMLSchema#',
              name: {
                '@id': 'https://hypersign-schema.org/name',
                '@type': 'xsd:string',
              },
            },
            '@id': 'https://hypersign-schema.org',
          },
        },
      },
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
  })
  '@context': Array<string>;
  @ApiProperty({
    name: 'type',
    description: 'type using which credential has signed',
    example: 'Ed25519Signature2020',
  })
  @IsString()
  type: string;
  @ApiProperty({
    name: 'created',
    description: 'Date on which credential has issued',
    example: '2023-02-25T17:01:02Z',
  })
  @IsString()
  created: Date;
  @ApiProperty({
    name: 'verificationMethod',
    description: 'Verification id using which credential has signed',
    example: 'did:hid:testnet:...............#key-${id}',
  })
  @ValidateVerificationMethodId()
  verificationMethod: string;

  @ApiProperty({
    name: 'proofPurpose',
    description: '',
    example: 'assertionMethod',
  })
  @IsString()
  proofPurpose: string;
  @ApiProperty({
    name: 'proofValue',
    description: '',
    example:
      'z5LairjrBYkc5FtPWeDVuLdQUzpMTBULcp3Q5YDnrLh63UuBuY6BpdiQYhTEcKBFW76TEXFHm37aDvcMtCvnYfmvQ',
  })
  @IsString()
  proofValue: string;
}
class VerificationMethod {
  @ApiProperty({
    description: 'Verification Method id',
    example: 'did:hid:testnet:................#key-${id}',
  })
  @IsString()
  id: string;
  @ApiProperty({
    description: 'Verification Method type',
    example: 'Ed25519VerificationKey2020',
  })
  @IsString()
  type: string;
  @ApiProperty({
    description: 'Verification Method controller',
    example: 'did:hid:method:..............',
  })
  @IsString()
  controller: string;
  @ApiProperty({
    description: 'publicKeyMultibase',
    example: 'z28ScfSszr2zi..................8nCwx4DBF6nAUHu4p',
  })
  @IsString()
  publicKeyMultibase: string;
}
class Controller {
  @ApiProperty({
    name: '@context',
    description: 'context',
    example: 'https://w3id.org/security/v2',
  })
  @IsString()
  @IsNotEmpty()
  '@context': string;
  @ApiProperty({
    name: 'id',
    description: 'did in controller',
    example: 'did:hid:testnet:.........',
  })
  @IsString()
  @IsDid()
  'id': string;
  @ApiProperty({
    name: 'assertionMethod',
    description: 'verification method id for assertion',
    example: 'did:hid:testnet:........#key-${id}',
    isArray: true,
  })
  @IsString()
  @ValidateVerificationMethodId()
  'assertionMethod': Array<string>;
}
class PurposeResult {
  @ApiProperty({
    name: 'valid',
    description: '',
    example: true,
  })
  @IsBoolean()
  valid: boolean;
  @ApiProperty({
    name: 'controller',
    description: ' controller',
    type: Controller,
  })
  @ValidateNested({ each: true })
  @Type(() => Controller)
  controller: Controller;
}
class Result {
  @ApiProperty({
    name: 'proof',
    description: 'proof of credential',
    type: PResultProof,
  })
  @ValidateNested({ each: true })
  @Type(() => PResultProof)
  proof: PResultProof;
  @ApiProperty({
    name: 'verified',
    description: 'verification result',
    example: true,
  })
  @IsBoolean()
  verified: true;
  @ApiProperty({
    name: 'verificationMethod',
    description: 'verificationMethod',
    type: VerificationMethod,
  })
  @ValidateNested({ each: true })
  @Type(() => VerificationMethod)
  verificationMethod: VerificationMethod;
  @ApiProperty({
    name: 'purposeResult',
    description: 'result of th purpose',
    type: PurposeResult,
  })
  @ValidateNested({ each: true })
  @Type(() => PurposeResult)
  purposeResult: PurposeResult;
}
class StatusResult {
  @ApiProperty({
    name: 'verified',
    description: 'verification result',
    example: true,
  })
  @IsBoolean()
  verified: true;
}
class CredentialResults {
  @ApiProperty({
    name: 'verified',
    description: 'verification result',
    example: true,
  })
  @IsBoolean()
  verified: true;
  @ApiProperty({
    name: 'results',
    description: ' result description',
    type: Result,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Result)
  results: Result;
  @ApiProperty({
    name: 'statusResult',
    description: ' result of status',
    type: StatusResult,
  })
  @ValidateNested({ each: true })
  @Type(() => StatusResult)
  statusResult: StatusResult;
  @ApiProperty({
    name: 'credentialId',
    description: 'credential id',
    example: 'vc:hid:testnet:......',
  })
  @IsNotEmpty()
  @IsString()
  @IsVcId()
  credentialId: string;
}

class PresentationResultProof {
  @ApiProperty({
    name: '@context',
    description: 'context',
    example: [
      'https://www.w3.org/2018/credentials/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
  })
  '@context': Array<string>;
  @ApiProperty({
    name: 'type',
    description: 'type using which credential has signed',
    example: 'Ed25519Signature2020',
  })
  @IsString()
  type: string;
  @ApiProperty({
    name: 'created',
    description: 'Date on which credential has issued',
    example: '2023-02-25T17:01:02Z',
  })
  @IsString()
  created: Date;
  
  @ApiProperty({
    name: 'verificationMethod',
    description: 'Verification id using which credential has signed',
    example: 'did:hid:testnet:...............#key-${id}',
  })
  @ValidateVerificationMethodId()
  verificationMethod: string;

  @ApiProperty({
    name: 'proofPurpose',
    description: '',
    example: 'assertionMethod',
  })
  @IsString()
  proofPurpose: string;
  @ApiProperty({
    name: 'challenge',
    description: 'random challenge',
    example: 'skfdhldklgjh-gaghkdhgaskda-aisgkjheyi',
  })
  @IsString()
  challenge: string;
  @ApiProperty({
    name: 'proofValue',
    description: '',
    example:
      'z5LairjrBYkc5FtPWeDVuLdQUzpMTBULcp3Q5YDnrLh63UuBuY6BpdiQYhTEcKBFW76TEXFHm37aDvcMtCvnYfmvQ',
  })
  @IsString()
  proofValue: string;
}
class AuthController {
  @ApiProperty({
    name: '@context',
    description: 'context',
    example: 'https://w3id.org/security/v2',
  })
  @IsString()
  @IsNotEmpty()
  '@context': string;
  @ApiProperty({
    name: 'id',
    description: 'did in controller',
    example: 'did:hid:testnet:.........',
  })
  @IsString()
  @IsDid()
  'id': string;

  @ApiProperty({
    name: 'authentication',
    description: 'verification method id for authentication',
    example: ['did:hid:testnet:........#key-${id}'],
    isArray: true,
  })
  @ValidateVerificationMethodId()
  'authentication': Array<string>;
}
class AuthenticationPurposeResult {
  @ApiProperty({
    name: 'valid',
    description: '',
    example: true,
  })
  @IsBoolean()
  valid: boolean;
  @ApiProperty({
    name: 'controller',
    description: ' controller',
    type: AuthController,
  })
  @ValidateNested({ each: true })
  @Type(() => AuthController)
  controller: AuthController;
}
class PresentationResults {
  @ApiProperty({
    name: 'proof',
    description: 'result of presentation verification',
    type: PresentationResultProof,
  })
  @ValidateNested({ each: true })
  @Type(() => PresentationResultProof)
  proof: PresentationResultProof;
  @ApiProperty({
    name: 'verified',
    description: 'result of presentation verification',
    example: true,
  })
  @IsBoolean()
  verified: boolean;

  @ApiProperty({
    name: 'verificationMethod',
    description: 'verificationMethod',
    type: VerificationMethod,
  })
  @ValidateNested({ each: true })
  @Type(() => VerificationMethod)
  verificationMethod: VerificationMethod;
  @ApiProperty({
    name: 'purposeResult',
    description: 'result of th purpose',
    type: AuthenticationPurposeResult,
  })
  @ValidateNested({ each: true })
  @Type(() => AuthenticationPurposeResult)
  purposeResult: AuthenticationPurposeResult;
}

class PresentationResult {
  @ApiProperty({
    name: 'verified',
    description: 'result of verification',
    example: true,
  })
  @IsBoolean()
  verified: boolean;
  @ApiProperty({
    name: 'results',
    description: 'verification result of presentation',
    type: PresentationResults,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @Type(() => PresentationResults)
  results: PresentationResults;
}

export class VerifyPresentationResponse {
  @ApiProperty({
    name: 'presentationResult',
    description: 'verification result of presentation',
    type: PresentationResult,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @Type(() => PresentationResult)
  presentationResult: PresentationResult;
  @ApiProperty({
    name: 'verified',
    description: 'result of presentation verification',
    example: true,
  })
  @IsBoolean()
  verified: boolean;
  @ApiProperty({
    name: 'credentialResults',
    description: 'verification result of credential',
    type: CredentialResults,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @Type(() => CredentialResults)
  credentialResults: CredentialResults;
}
