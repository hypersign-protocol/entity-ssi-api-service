import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type LogDoc = Log & Document;
@Schema({ timestamps: true })
export class Log {
  @Prop()
  method: string;
  @Prop()
  path: string;
  @Prop()
  statusCode: number;
  @Prop()
  contentLength: string;
  @Prop()
  userAgent: string;
  @Prop()
  ip: string;
  @Prop()
  appId: string;
  @Prop({
    isRequired: false,
  })
  did: string;
  @Prop({
    isRequired: false,
  })
  dataRequest: string;
  @Prop({
    isRequired: false,
  })
  ref_id: string;
}

export const LogSchema = SchemaFactory.createForClass(Log);
