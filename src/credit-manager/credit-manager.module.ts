import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CreditManagerController } from './controllers/credit-manager.controller';
import { creditSchemaProviders } from './schema/credit.provider';
import { CreditService } from './services/credit-manager.service';
import { CreditManagerRepository } from './repository/credit-manager.repository';
import { JwtService } from '@nestjs/jwt';
import { databaseProviders } from 'src/mongoose/tenant-mongoose-connections';
import { CreditManagerService } from './managers/credit-manager.service';
import { ApiCreditService } from './services/api-credit.service';
import { StorageCreditService } from './services/storage-credit.service';
import { AttestationCreditService } from './services/attestation-credit.service';
import { WhitelistSSICorsMiddleware } from 'src/utils/middleware/cors.middleware';

@Module({
  imports: [],
  controllers: [CreditManagerController],
  providers: [
    CreditService,
    ...databaseProviders,
    ...creditSchemaProviders,
    CreditManagerRepository,
    JwtService,
    CreditManagerService,
    ApiCreditService,
    StorageCreditService,
    AttestationCreditService,
  ],
  exports: [CreditService, CreditManagerRepository, CreditManagerService],
})
export class CreditManagerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WhitelistSSICorsMiddleware)
      .forRoutes(CreditManagerController);
  }
}
