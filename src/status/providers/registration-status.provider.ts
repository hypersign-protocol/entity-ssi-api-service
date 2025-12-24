import { Connection } from 'mongoose';
import { RegistrationStatusSchema } from '../schema/status.schema';

export const statusProviders = [
  {
    provide: 'STATUS_MODEL',
    useFactory: (connection: Connection) =>
      connection.model('RegistrationStatus', RegistrationStatusSchema),
    inject: ['APPDATABASECONNECTIONS'],
  },
];
