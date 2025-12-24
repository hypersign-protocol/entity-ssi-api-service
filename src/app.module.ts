import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EdvModule } from './edv/edv.module';
import { AllExceptionsFilter } from './utils/utils';
import { APP_FILTER } from '@nestjs/core';
import { DidModule } from './did/did.module';
import { SchemaModule } from './schema/schema.module';
import { CredentialModule } from './credential/credential.module';
import { PresentationModule } from './presentation/presentation.module';
import { TxSendModuleModule } from './tx-send-module/tx-send-module.module';
import { StatusModule } from './status/status.module';
import { CreditManagerModule } from './credit-manager/credit-manager.module';
import { LogModule } from './log/log.module';
import { AppLoggerMiddleware } from './utils/interceptor/http-interceptor';
import { UsageModule } from './usage/usage.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '',
      isGlobal: true,
    }),
    EdvModule,
    DidModule,
    SchemaModule,
    CredentialModule,
    PresentationModule,
    TxSendModuleModule,
    StatusModule,
    CreditManagerModule,
    LogModule,
    UsageModule,
  ],
  controllers: [],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
