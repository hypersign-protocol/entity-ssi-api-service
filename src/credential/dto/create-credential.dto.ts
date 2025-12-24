import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  ValidateIf,
  ArrayNotEmpty,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';
import { IsDid } from 'src/utils/customDecorator/did.decorator';
import { IsSchemaId } from 'src/utils/customDecorator/schemaId.deceorator';
import { IsVcId } from 'src/utils/customDecorator/vc.decorator';
import { subjectDID } from 'src/utils/customDecorator/SubjectDid.decorator';

export class ResolveCredentialMetadata {
  @ApiProperty({
    name: 'credentialId',
    description: 'credentialId of credential',
    example: 'vc:hid:testnet:z6MkqexphEhpi9jKZi8XLYiwCEsSWMdUt6YzjCfqdxKecJXM',
  })
  @IsString()
  credentialId: string;

  @ApiProperty({
    name: 'type',
    description: 'schema type of credential',
    example: '{ schemaId, schemaType }',
  })
  @IsObject()
  @IsOptional()
  type?: object;

  @ApiProperty({
    name: 'issuerDid',
    description: 'issuerDid  of credential',
    example: 'did:hid:testnet:asdasd',
  })
  @IsString()
  issuerDid: string;

  @ApiProperty({
    name: 'persist',
    description:
      'return credentialDocument if persist is set to true at the time of issuing credential',
    example: true,
  })
  persist: boolean;

  @ApiProperty({
    name: 'registerCredentialStatus',
    description: 'if crendetialstatus was sent to blockchain',
    example: true,
  })
  registerCredentialStatus: boolean;

  @ApiProperty({
    name: 'transactionStatus',
    description: 'transactionStatus of credential',
    required: false,
  })
  @IsOptional()
  @IsObject()
  transactionStatus: object;
}
export enum Namespace {
  testnet = 'testnet',
  mainnet = '',
}
export class CreateCredentialDto {
  @ApiProperty({
    name: 'schemaId',
    description: 'schemaId for credential Schema',
    required: false,
  })
  @IsOptional()
  @IsString()
  schemaId?: string;
  @ApiProperty({
    name: 'subjectDid',
    description: 'holder did of the credential',
  })
  @IsString()
  @IsNotEmpty()
  @subjectDID()
  subjectDid: string;
  @ApiProperty({
    name: 'issuerDid',
    description: 'issuerDid of the credential',
  })
  @IsString()
  @IsNotEmpty()
  @IsDid()
  issuerDid: string;

  @ApiHideProperty()
  @IsOptional()
  subjectDidDocSigned?: JSON;

  @ApiProperty({
    type: String,
    isArray: true,
    name: 'schemaContext',
    required: false,
    example: ['https://schema.org'],
  })
  @ValidateIf((o) => o.schemaId === undefined)
  @IsArray()
  @ArrayNotEmpty()
  schemaContext?: Array<string>;
  @ApiProperty({
    type: String,
    isArray: true,
    required: false,
    example: ['StudentCredential'],

    name: 'type',
  })
  @ValidateIf((o) => o.schemaId === undefined)
  @IsArray()
  type?: Array<string>;

  @ApiProperty({
    name: 'expirationDate',
    description: 'Date in ISOString format',
    example: '2027-12-10T18:30:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  expirationDate: string;

  @ApiProperty({
    name: 'fields',
    description: 'Credential Data fields',
    example: {
      name: 'Random name',
    },
  })
  @IsNotEmptyObject()
  fields: object;

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
    description: 'Verification Method id for did updation',
    example: 'did:hid:testnet:........#key-${idx}',
  })
  @ValidateVerificationMethodId()
  verificationMethodId: string;

  @ApiProperty({
    name: 'persist',
    description: 'Persist in edv',
    example: true,
  })
  @IsBoolean()
  persist: boolean;
  @ApiProperty({
    name: 'registerCredentialStatus',
    description: 'Parameter to indicate whether to register credential status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  registerCredentialStatus?: boolean;
}

export class CredentialSubject {
  @ApiProperty({
    description: 'id',
    example: 'did:hid:testnet:...............',
  })
  @IsString()
  @IsDid()
  id: string;
}
export class CredentialSchema {
  @ApiProperty({
    description: 'id',
    example: 'sch:hid:testnet:...............',
  })
  @IsString()
  @IsNotEmpty()
  @IsSchemaId()
  id: string;
  @ApiProperty({
    name: 'type',
    description: 'type of schema',
    example: 'JsonSchemaValidator2018',
  })
  @IsString()
  type: string;
}
class CredentialStatus {
  @ApiProperty({
    description: 'id',
    example:
      'https://api.jagrat.hypersign.id/hypersign-protocol/hidnode/ssi/credential/vc:hid:testnet:...............',
  })
  @IsString()
  id: string;
  @ApiProperty({
    name: 'type',
    description: 'type of credential',
    example: 'CredentialStatusList2017',
  })
  @IsString()
  type: string;
}

export class CredentialProof {
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
  created: string;

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
    example: 'z5LairjrBYkc5FtP.......................EXFHm37aDvcMtCvnYfmvQ',
  })
  @IsString()
  proofValue: string;
}

export class CredStatus {
  @ApiProperty({
    name: '@context',
    description: 'context',
    example: [
      'https://raw.githubusercontent.com/hypersign-protocol/hypersign-contexts/main/CredentialStatus.jsonld',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
  })
  '@context': Array<string>;
  @ApiProperty({
    name: 'id',
    description: 'Credential id',
    example: 'vc:hid:testnet:................',
  })
  @IsString()
  @IsVcId()
  id: string;
  @ApiProperty({
    name: 'issuer',
    description: 'did of the one who issue the credential',
    example: 'did:hid:testnet:..............',
  })
  @IsString()
  @IsDid()
  issuer: string;
  @ApiProperty({
    name: 'issuanceDate',
    description: 'Date on which credential hasa issued',
    example: '2023-01-25T16:59:21Z',
  })
  @IsString()
  issuanceDate: string;

  @ApiProperty({
    name: 'remarks',
    description: 'Reason of current status',
    example: 'Credential is active',
  })
  @IsString()
  @IsNotEmpty()
  remarks: string;

  @ApiProperty({
    name: 'credentialMerkleRootHash',
    description: 'Merkle root hash of the credential',
    example:
      'c20c512a0e5a12616faa0911dde385fb57fac2f5aad6173a6b1010fngrgtlhkjtrrjowlrjttryju',
  })
  @IsString()
  @IsNotEmpty()
  credentialMerkleRootHash: string;

  @ApiProperty({
    name: 'proof',
    description: 'Proof of credential',
    type: CredentialProof,
  })
  proof: CredentialProof;
}
export class CredDoc {
  @ApiProperty({
    description: 'Context',
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
  @IsArray()
  @ArrayNotEmpty()
  '@context': Array<string>;
  @ApiProperty({
    description: 'id',
    example: 'vc:hid:testnet:......',
  })
  @IsString()
  @IsVcId()
  id: string;
  @ApiProperty({
    description: 'type',
    example: ['VerifiableCredential', 'nameschema'],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  type: Array<string>;
  @ApiProperty({
    description: 'Expiry date of credential',
    example: '2027-12-10T18:30:00Z',
  })
  @IsNotEmpty()
  @IsString()
  expirationDate: Date;
  @ApiProperty({
    description: 'Credential issuance date',
    example: '2027-12-10T18:30:00Z',
  })
  @IsNotEmpty()
  @IsString()
  issuanceDate: Date;

  @ApiProperty({
    description: 'issuer did',
    example: 'did:hid:testnet:..........',
  })
  @IsString()
  @IsDid()
  issuer: string;

  @ApiProperty({
    name: 'credentialSubject',
    description: 'Field value based on schema',
    type: CredentialSubject,
  })
  @IsNotEmptyObject()
  @Type(() => CredentialSubject)
  @ValidateNested({ each: true })
  credentialSubject: CredentialSubject;

  @ApiProperty({
    name: 'credentialSchema',
    description: 'Schema detail based on which credential has issued',
    type: CredentialSchema,
  })
  @IsOptional()
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => CredentialSchema)
  credentialSchema?: CredentialSchema;

  @ApiProperty({
    name: 'credentialStatus',
    description: 'Information of credential status',
    type: CredentialStatus,
  })
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => CredentialStatus)
  credentialStatus: CredentialStatus;

  @ApiProperty({
    name: 'proof',
    description: 'Proof of credential',
    type: CredentialProof,
  })
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => CredentialProof)
  proof: CredentialProof;
}
export class CreateCredentialResponse {
  @ApiProperty({
    name: 'credentialDocument',
    description: 'Credential doc',
    type: CredDoc,
  })
  @ValidateNested({ each: true })
  @Type(() => CredDoc)
  credentialDocument: CredDoc;

  @ApiProperty({
    name: 'credentialStatus',
    description: 'Status detail of credential',
    type: CredStatus,
  })
  credentialStatus: CredStatus;

  @ApiProperty({
    name: 'metadata',
    description: 'metadata for this credential',
  })
  @IsOptional()
  metadata?: ResolveCredentialMetadata;
}

export class ResolvedCredentialStatus extends CredStatus {
  @ApiProperty({
    name: 'revoked',
    description: 'Set to true if credential is revoked',
    example: false,
  })
  revoked: boolean;
  @ApiProperty({
    name: 'suspended',
    description: 'Set to true if credential is suspended',
    example: false,
  })
  suspended: boolean;
  @ApiProperty({
    name: 'proof',
    description: 'proof of credential',
    type: CredentialProof,
  })
  @Type(() => CredentialProof)
  @ValidateNested({ each: true })
  proof: CredentialProof;
}
export class ResolveCredential {
  @ApiProperty({
    name: 'credentialDocument',
    description: 'credential document ',
    required: false,
    type: CredDoc,
  })
  @Type(() => CredDoc)
  @ValidateNested({ each: true })
  credentialDocument: CredDoc;
  @ApiProperty({
    name: 'credentialStatus',
    description: 'status of the credential',
    type: ResolvedCredentialStatus,
  })
  @Type(() => ResolvedCredentialStatus)
  @ValidateNested({ each: true })
  credentialStatus: ResolvedCredentialStatus;
  @ApiProperty({
    name: 'metadata',
    description: 'metadata for this credential',
  })
  @IsOptional()
  metadata?: ResolveCredentialMetadata;
}
