import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateVerificationMethodId } from 'src/utils/customDecorator/vmId.decorator';
import { IsDid } from 'src/utils/customDecorator/did.decorator';
import { Namespace } from 'src/did/dto/create-did.dto';

export enum DataType {
  string = 'string',
  number = 'number',
  integer = 'integer',
  boolean = 'boolean',
  date = 'date',
}

export class Fields {
  @ApiProperty({
    name: 'name',
    description: 'Name of the field',
    example: 'name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiProperty({
    name: 'format',
    description: 'format',
    example: '',
  })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiProperty({
    name: 'type',
    description: 'type of properties',
    example: 'string',
  })
  @IsNotEmpty()
  @IsEnum(DataType)
  type: DataType;
  @ApiProperty({
    name: 'isRequired',
    description: 'State wheter field is required',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired: boolean;
}
export class SchemaBody {
  @ApiProperty({
    description: 'Name of the schema',
    example: 'Railway ticket schema',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Issuer Did',
    example: 'did:hid:namespace:................',
  })
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsDid()
  author: string;

  @IsOptional()
  @ApiProperty({
    description: 'description for the schema',
    example: 'Railway ticket schema"',
  })
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'additionalProperties',
    example: false,
  })
  @IsBoolean()
  additionalProperties: boolean;

  @ApiProperty({
    description: 'Schema configuration',
    type: Fields,
    isArray: true,
    required: true,
  })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => Array<Fields>)
  fields: Array<Fields>;
}

export class CreateSchemaDto {
  @ApiProperty({
    name: 'schema',
    description: 'Schema body',
    type: SchemaBody,
  })
  @IsNotEmptyObject()
  @ValidateNested({ each: true })
  @Type(() => SchemaBody)
  schema: SchemaBody;

  @ApiProperty({
    name: 'namespace',
    description: 'Namespace to be added in did.',
    example: 'testnet',
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(Namespace)
  namespace: string;
  
  @ApiProperty({
    description: 'Verification Method id for did updation',
    example: 'did:hid:testnet:........#key-${idx}',
  })
  @ValidateVerificationMethodId()
  verificationMethodId: string;
}

export class createSchemaResponse {
  @ApiProperty({
    name: 'schemaId',
    description: 'Schema id',
    example: 'sch:hid:namespce:.....................',
  })
  schemaId: string;
  @ApiProperty({
    name: 'transactionHash',
    description: 'transaction hash for schema',
    example: 'KAGSLKAGDLKJGA..................',
  })
  transactionHash: string;
}
