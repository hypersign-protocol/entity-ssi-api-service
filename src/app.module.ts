import {
  MiddlewareConsumer,
  Module,
  NestModule,
  UnauthorizedException,
} from '@nestjs/common';
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
import { ScheduleModule } from '@nestjs/schedule';
import {
  CreditAppType,
  CreditEnvironment,
  CreditModule,
  CreditType,
} from '@hypersign-protocol/credit-middleware';
import { RedisModule } from './redis.module';
import { CreditRecoveryScheduler } from './credit-recovery.scheduler';
// import { QueueMonitorModule } from './queue-monitor/queue-monitor.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: '',
      isGlobal: true,
    }),
    RedisModule,
    CreditModule.forRootAsync({
      imports: [RedisModule],
      useFactory: () => ({
        requestContextResolver: (unknownRequest: unknown) => {
          const request = unknownRequest as {
            user?: { appId?: string; subdomain?: string; env?: string };
            requestId?: string;
          };
          const appId = request.user?.appId?.trim();
          const environment = request.user?.env?.trim();
          if (!appId) {
            throw new UnauthorizedException('Trusted SSI appId is required');
          }
          if (
            environment !== CreditEnvironment.PROD &&
            environment !== CreditEnvironment.DEV
          ) {
            throw new UnauthorizedException(
              'Trusted SSI environment must be prod or dev',
            );
          }
          return {
            subject: {
              tenantId: request.user?.subdomain?.trim() || undefined,
              appId,
              appType: CreditAppType.SSI_API,
              creditType: CreditType.API_CREDIT,
            },
            requestId: request.requestId,
            environment:
              environment === CreditEnvironment.PROD
                ? CreditEnvironment.PROD
                : CreditEnvironment.DEV,
          };
        },
      }),
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
    // QueueMonitorModule,
  ],
  controllers: [],
  providers: [
    CreditRecoveryScheduler,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
