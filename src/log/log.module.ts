import { Module } from '@nestjs/common';
import { logProviders } from './schema/log.provider';
import { LogService } from './services/log.service';
import { LogRepository } from './repository/log.repository';
import { databaseProviders } from 'src/mongoose/tenant-mongoose-connections';
import { CreditManagerModule } from 'src/credit-manager/credit-manager.module';

@Module({
  imports: [CreditManagerModule],
  controllers: [],
  providers: [LogService, LogRepository, ...logProviders, ...databaseProviders],
  exports: [LogRepository, LogService],
})
export class LogModule {}
