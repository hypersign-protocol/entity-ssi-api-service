import { Connection } from 'mongoose';
import { LogSchema } from './log.schema';
export const logProviders = [
  {
    provide: 'LOG_MODEL',
    useFactory: (connection: Connection) => connection.model('Log', LogSchema),
    inject: ['APPDATABASECONNECTIONS'],
  },
];
