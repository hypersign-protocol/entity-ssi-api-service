import { Document } from 'mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

export type RegistrationStatusDocument = RegistrationStatus & Document;

@Schema({
  timestamps: true,
})
export class RegistrationStatus {
  @Prop()
  txnHash: string;

  @Prop({ required: false })
  status?: number;

  @Prop()
  id: string;

  @Prop()
  type: string;

  @Prop({ required: false, type: Object })
  message?: object;
}

const RegistrationStatusSchema =
  SchemaFactory.createForClass(RegistrationStatus);
RegistrationStatusSchema.index(
  {
    txnHash: 1,
    id: 1,
  },
  { unique: true },
);

export { RegistrationStatusSchema };
