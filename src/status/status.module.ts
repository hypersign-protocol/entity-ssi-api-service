import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { databaseProviders } from 'src/mongoose/tenant-mongoose-connections';
import { TxnStatusRepository } from './repository/status.repository';
import { statusProviders } from './providers/registration-status.provider';
import { WhitelistSSICorsMiddleware } from 'src/utils/middleware/cors.middleware';
import { TrimMiddleware } from 'src/utils/middleware/trim.middleware';

@Module({
  imports: [],
  controllers: [StatusController],
  providers: [
    StatusService,
    TxnStatusRepository,
    ...databaseProviders,
    ...statusProviders,
  ],
  exports: [],
})
export class StatusModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WhitelistSSICorsMiddleware).forRoutes(StatusController);
    consumer.apply(TrimMiddleware).forRoutes(StatusController);
  }
}
