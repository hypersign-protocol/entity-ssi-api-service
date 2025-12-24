import { Connection } from 'mongoose';
import { CreditManagerSchema } from './credit-manager.schema';
export const creditSchemaProviders = [
  {
    provide: 'CREDIT_STORE_MODEL',
    useFactory: (creditConnection: Connection) =>
      creditConnection.model('Credit', CreditManagerSchema),
    inject: ['APPDATABASECONNECTIONS'],
  },
];
