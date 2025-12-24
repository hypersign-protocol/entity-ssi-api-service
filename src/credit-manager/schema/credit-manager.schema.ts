import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
export type CreditManagerType = CreditManager & Document;
export enum Status {
  'ACTIVE' = 'Active',
  'INACTIVE' = 'Inactive',
}
export class Credit {
  @Prop({ required: true, type: Number })
  amount: number;
  @Prop({ required: true, type: String, default: 'uHID' })
  denom?: string;
}
@Schema({ timestamps: true })
export class CreditManager {
  @Prop({ required: true, type: Number })
  totalCredits: number;
  @Prop({ required: false, type: String, default: 'uHID' })
  creditDenom?: string;
  @Prop({ required: true, type: Number, default: 0 })
  used?: number;
  @Prop({ required: true, type: Number })
  validityDuration: number; // storing in days
  @Prop({ reuired: false, type: Date })
  expiresAt?: Date;
  @Prop({
    required: true,
    enum: Status,
    type: String,
    default: Status.INACTIVE,
  })
  status?: Status;
  @Prop({ required: true, type: String })
  serviceId: string;
  @Prop({ type: Credit, required: false })
  credit?: Credit;
  @Prop({ required: false, type: [] })
  creditScope?: Array<string>;
}
export const CreditManagerSchema = SchemaFactory.createForClass(CreditManager);
CreditManagerSchema.index({ status: 1 });
