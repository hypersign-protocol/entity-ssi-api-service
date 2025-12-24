import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Slip10RawIndex } from '@cosmjs/crypto';
import { Exclude } from 'class-transformer';
import { IsDid } from 'src/utils/customDecorator/did.decorator';

export type DidDocument = Did & Document;
export type DidDocumentMetaData = DidMetaData & Document;
export enum RegistrationStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  UNREGISTRED = 'UNREGISTRED',
}
@Schema({
  timestamps: true,
})
export class Did {
  @ApiHideProperty()
  @IsOptional()
  @Prop()
  @Exclude()
  slipPathKeys?: Array<Slip10RawIndex>;

  @ApiHideProperty()
  @IsOptional()
  @Prop()
  @Exclude()
  hdPathIndex?: number;

  @ApiHideProperty()
  @Exclude()
  @Prop()
  @IsString()
  appId: string;

  @ApiProperty({
    description: 'Did of user',
    example: 'did:hid:testnet:1234',
  })
  @Prop({ unique: true, index: true })
  @IsString()
  @IsDid()
  did: string;

  @ApiProperty({
    description: 'Txn hash during registration',
    example: 'EDAB2D76772B8401CF82FF7EE0B4CBAA4A330EC16064B27505AABD8A5BA8B05B',
    name: 'transactionHash',
  })
  @Prop()
  transactionHash: string;

  @ApiProperty({
    name: 'registrationStatus',
  })
  @Prop()
  @IsEnum(RegistrationStatus)
  registrationStatus: RegistrationStatus;

  @Prop({ unique: true, required: false })
  @IsString()
  kmsId: string;

  @ApiProperty({
    name: 'name',
  })
  @IsOptional()
  @Prop()
  name?: string;
}

@Schema()
export class DidMetaData {
  @IsOptional()
  @Prop()
  slipPathKeys?: Array<Slip10RawIndex>;

  @IsOptional()
  @Prop()
  hdPathIndex?: number;

  @ApiProperty({
    description: 'Id of to which particular did is issued',
    example: 'aa4ded21-437e-4215-8792-601ce9ba3de5',
  })
  @Prop()
  appId: string;
  @ApiProperty({
    description: 'Did of user',
    example: 'did:hid:testnet:1234',
  })
  @Prop()
  did: string;
}

const DidSchema = SchemaFactory.createForClass(Did);
const DidMetaDataSchema = SchemaFactory.createForClass(DidMetaData);
DidSchema.index({ did: 1 }, { unique: true });
DidSchema.index({ appId: 1, hdPathIndex: 1, did: 1 }, { unique: true });
DidMetaDataSchema.index({ appId: 1 }, { unique: true });
DidMetaDataSchema.index({ appId: 1, hdPathIndex: 1, did: 1 }, { unique: true });

export { DidMetaDataSchema, DidSchema };
