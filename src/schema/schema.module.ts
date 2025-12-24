import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { SchemaService } from './services/schema.service';
import { SchemaController } from './controllers/schema.controller';
import { SchemaSSIService } from './services/schema.ssi.service';
import { HidWalletService } from 'src/hid-wallet/services/hid-wallet.service';
import { DidService } from 'src/did/services/did.service';
import { DidModule } from 'src/did/did.module';
import { SchemaRepository } from './repository/schema.repository';
import { WhitelistSSICorsMiddleware } from 'src/utils/middleware/cors.middleware';
import { TrimMiddleware } from 'src/utils/middleware/trim.middleware';
import { schemaProviders } from './providers/schema.provider';
import { databaseProviders } from '../mongoose/tenant-mongoose-connections';
import { TxSendModuleModule } from 'src/tx-send-module/tx-send-module.module';
import { StatusService } from 'src/status/status.service';
import { StatusModule } from 'src/status/status.module';
import { TxnStatusRepository } from 'src/status/repository/status.repository';
import { statusProviders } from 'src/status/providers/registration-status.provider';
import { CreditManagerModule } from 'src/credit-manager/credit-manager.module';
import { AppLoggerMiddleware } from 'src/utils/interceptor/http-interceptor';
import { LogModule } from 'src/log/log.module';

@Module({
  imports: [
    DidModule,
    TxSendModuleModule,
    StatusModule,
    CreditManagerModule,
    LogModule,
  ],
  controllers: [SchemaController],
  providers: [
    SchemaService,
    SchemaSSIService,
    DidService,
    HidWalletService,
    SchemaRepository,
    StatusService,
    TxnStatusRepository,
    ...databaseProviders,
    ...schemaProviders,
    ...statusProviders,
  ],
  exports: [SchemaModule],
})
export class SchemaModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    //// Appy middleware on all routes
    consumer.apply(WhitelistSSICorsMiddleware).forRoutes(SchemaController);
    //apply middleware on all routes except mentioned in exclude()
    consumer
      .apply(TrimMiddleware)
      .exclude(
        { path: 'schema', method: RequestMethod.GET },
        { path: 'schema/:schemaId', method: RequestMethod.GET },
      )
      .forRoutes(SchemaController);
    consumer.apply(AppLoggerMiddleware).forRoutes(SchemaController);
  }
}
