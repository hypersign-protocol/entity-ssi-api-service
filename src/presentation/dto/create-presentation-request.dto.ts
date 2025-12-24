import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
  IsArray,
  ArrayNotEmpty,
  IsOptional,
} from 'class-validator';
import { CredDoc } from 'src/credential/dto/create-credential.dto';
import { IsDid } from 'src/utils/customDecorator/did.decorator';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';
import { PresentationTemplate } from '../schemas/presentation-template.schema';

export class CreatePresentationRequestDto {
  @ApiProperty({
    name: 'challenge',
    description: 'Challenge can be used to match the response to a request ',
    example: 'skfdhldklgjh-gaghkdhgaskda-aisgkjheyi',
  })
  @IsString()
  @IsNotEmpty()
  challenge: string;

  // verifier DID reference for documentation
  @ApiProperty({
    name: 'did',
    description: 'did of the verifier',
    example: 'did:hid:<namespace>:...............',
  })
  @IsString()
  @IsNotEmpty()
  @IsDid()
  did: string;

  @ApiProperty({
    name: 'templateId',
    description:
      'templateId of the presentation templete to form presentation request',
    example: '6392854982......',
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    name: 'expiresTime',
    description: 'expiresTime  for the presentation request (unix timestamp)',
    example: 1231423,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(Number(new Date()))
  expiresTime: number;

  @ApiProperty({
    name: 'callbackUrl',
    description: 'callbackUrl that will receive verifiable presentation',
    example: 'https://example.com/verify/callback',
  })
  @IsUrl()
  @IsNotEmpty()
  callbackUrl: string;
}

export class CreatePresentationResponse {
  @ApiProperty({
    name: 'id',
    description: 'id of presentation request template',
    example: 'f....8-84ae-4..2-a..3-efab....d4db',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
  @ApiProperty({
    name: 'from',
    description: 'did of the holder',
    example: 'did:hid:testnet:...............',
  })
  @IsString()
  @IsNotEmpty()
  @IsDid()
  from: string;
  @ApiProperty({
    name: 'created_time',
    description: 'Time of request creation',
    example: 1675167388737,
  })
  @IsNumber()
  @IsNotEmpty()
  created_time: number;
  @ApiProperty({
    name: 'expires_time',
    description: 'Time at which challenge become invalid',
    example: 1675177277551,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(Number(new Date()))
  expires_time: number;
  @ApiProperty({
    name: 'reply_url',
    description: 'Url that will receive verifiable presentation',
    example: 'https://example.com/verify/callback',
  })
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  reply_url: string;
  @ApiProperty({
    name: 'reply_to',
    description: 'list of dids to whome presentationis to be given',
    example: ['did:hid:testnet:.................'],
  })
  @IsArray()
  reply_to: Array<CreatePresentationRequestDto['did']>;
  @ApiProperty({
    name: 'body',
    description: 'Presentatioin template detail',
    type: PresentationTemplate,
  })
  @IsObject()
  @Type(() => PresentationTemplate)
  @ValidateNested()
  body: PresentationTemplate;
}

export class CreatePresentationDto {
  @ApiProperty({
    name: 'credentialDocuments',
    description: 'list of credentials',
    type: CredDoc,
    isArray: true,
  })
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => Array<CredDoc>)
  credentialDocuments: Array<CredDoc>;

  @ApiProperty({
    name: 'holderDid',
    description: 'list of credentials',
    example: 'did:hid:testnet:............',
  })
  @IsString()
  @IsNotEmpty()
  @IsDid()
  holderDid: string;

  @ApiProperty({
    name: 'challenge',
    description: 'Challenge can be used to match the response to a request ',
    example: 'skfdhldklgjh-gaghkdhgaskda-aisgkjheyi',
  })
  @IsString()
  @IsNotEmpty()
  challenge: string;
  @ApiProperty({
    name: 'domain',
    description: 'domain that will receive verifiable presentation',
    example: 'example.com',
  })
  @IsNotEmpty()
  @IsUrl()
  domain: string;
  @ApiProperty({
    name: 'verificationMethodId',
    description:
      'verificationMethodId of the holder that will be used to sign the presentation.',
    example: 'did:hid:testnet:........#key-${idx}',
    required: false,
  })
  @IsOptional()
  @ValidateVerificationMethodId()
  verificationMethodId: string;
}

class PresentationProof {
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
    example: '2023-01-25T17:01:02Z',
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
    example: 'authentication',
  })
  @IsString()
  proofPurpose: string;
  @ApiProperty({
    name: 'challenge',
    description: 'challenge used for generating presentation',
    example: 'skfdhldklgjh-gaghkdhgaskda-aisgkjheyi',
  })
  @IsString()
  challenge: string;
  @ApiProperty({
    name: 'proofValue',
    description: 'Proof value',
    example:
      'z5LairjrBYkc5FtPWeDVuLdQUzpMTBULcp3Q5YDnrLh63UuBuY6BpdiQYhTEcKBFW76TEXFHm37aDvcMtCvnYfmvQ',
  })
  @IsString()
  proofValue: string;
}
export class Presentation {
  @ApiProperty({
    name: '@context',
    description: 'Context of the credential',
    example: ['https://www.w3.org/2018/credentials/v1'],
  })
  @IsArray()
  '@context': Array<string>;
  @ApiProperty({
    name: 'type',
    description: 'Type of presentation geenrated',
    example: ['VerifiablePresentation'],
  })
  @IsArray()
  type: Array<string>;
  @ApiProperty({
    name: 'verifiableCredential',
    description:
      'Array of credentials that has passed to generate presentation',
    type: CredDoc,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredDoc)
  verifiableCredential: CredDoc[];

  @ApiProperty({
    name: 'id',
    description: 'Vp id',
    example: 'vp:hid:testnet:..........................',
  })
  @IsString()
  @IsNotEmpty()
  id: string;
  @ApiProperty({
    name: 'holder',
    description: 'did of the holder of credential',
    example: 'did:hid:testnet:..............',
  })
  @IsString()
  @IsNotEmpty()
  @IsDid()
  holder: string;
  @ApiProperty({
    name: 'proof',
    description: 'proof of presentation',
    type: PresentationProof,
  })
  @ValidateNested({ each: true })
  @Type(() => PresentationProof)
  proof: PresentationProof;
}
export class PresentationResponse {
  @ApiProperty({
    name: 'presentation',
    description: 'Detail of presentaion that has created',
    type: Presentation,
  })
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => Presentation)
  presentation: Presentation;
}
