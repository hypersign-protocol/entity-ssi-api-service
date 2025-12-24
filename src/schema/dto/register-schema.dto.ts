import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNotEmptyObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsDid } from 'src/utils/customDecorator/did.decorator';
import { IsSchemaId } from 'src/utils/customDecorator/schemaId.deceorator';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';

export class SchemaInfo {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'schema',
    description: 'schema url',
    type: String,
    example: 'http://json-schema.org/draft-07/schema',
  })
  schema: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'description',
    description: 'Schema description',
    type: String,
    example: 'University Schema',
  })
  description: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'type',
    description: 'Data type',
    type: String,
    example: 'object',
  })
  type: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'properties',
    description: 'Properties of schema in stringified way',
    type: String,
    example: 'string',
  })
  properties: string;
  @IsArray()
  @ApiProperty({
    name: 'required',
    description: 'list of properties that are required in schema',
    type: Array,
    isArray: true,
    example: [],
  })
  required: Array<string>;
  @IsBoolean()
  @ApiProperty({
    name: 'additionalProperties',
    description: 'If extra property is allowed or not',
    type: Boolean,
    example: false,
  })
  additionalProperties: boolean;
}
export class SchemaDoc {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'type',
    description: '',
    type: String,
    example:
      'https://w3c-ccg.github.io/vc-json-schemas/v1/schema/1.0/schema.json',
  })
  type: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'modelVersion',
    description: 'version number of schema',
    type: String,
    example: '1.0',
  })
  modelVersion: string;
  @IsNotEmpty()
  @IsString()
  @IsSchemaId()
  @ApiProperty({
    name: 'id',
    description: 'Id of the schema',
    type: String,
    example: 'sch:hid:testnet:z57BBNT...............E3S:1.0',
  })
  id: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'name',
    description: 'Name of the schema',
    type: String,
    example: 'University Schema',
  })
  name: string;
  @IsNotEmpty()
  @IsString()
  @IsDid()
  @ApiProperty({
    name: 'author',
    description: 'issuer Did',
    type: String,
    example: 'did:hid:testnet:zAtZ.............................',
  })
  author: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'authored',
    description: 'Time at which schema is generated',
    type: String,
    example: '2023-01-07T07:24:06Z',
  })
  authored: string;
  @ApiProperty({
    name: 'schema',
    description: 'schema',
    type: SchemaInfo,
  })
  @Type(() => SchemaInfo)
  @ValidateNested({ each: true })
  schema: SchemaInfo | undefined;
  proof: SchemaProof | undefined;
}
export class SchemaProof {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'type',
    description: 'Type used for signature',
    type: String,
    example: 'Ed25519Signature2020',
  })
  type: string;
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'created',
    description: 'Schema generation time',
    type: String,
    example: '2023-08-04T07:01:24Z',
  })
  created: string;
  
  @ApiProperty({
    name: 'verificationMethod',
    description: 'Verification methodId',
    type: String,
    example: '2023-08-04T07:01:24Z',
  })
  @ValidateVerificationMethodId()
  verificationMethod: string;
  
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'proofPurpose',
    description: 'Purpose of the proof',
    type: String,
    example: 'assertion',
  })
  proofPurpose: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    name: 'proofValue',
    description: 'Proof value of the schema',
    type: String,
    example: 'assertion',
  })
  proofValue: string;
}
export class RegisterSchemaDto {
  @ApiProperty({
    name: 'schemaDocument',
    description: 'schema document without proof to be register on the chain',
    type: SchemaDoc,
    required: true,
  })
  @IsNotEmptyObject()
  @Type(() => SchemaDoc)
  @ValidateNested({ each: true })
  schemaDocument: SchemaDoc;

  @ApiProperty({
    name: 'schemaProof',
    description: 'Proof of schema document',
    type: SchemaProof,
    required: true,
  })
  @IsNotEmptyObject()
  @Type(() => SchemaProof)
  @ValidateNested({ each: true })
  schemaProof: SchemaProof;
}
