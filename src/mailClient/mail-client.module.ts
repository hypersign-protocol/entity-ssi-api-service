import { Module } from '@nestjs/common';
import { MailClientService } from './service/mail-client.service';
import { MailClientController } from './controller/mail-client.controller';
import { BullModule } from '@nestjs/bullmq';
import * as dotenv from 'dotenv';
import { QueueFactory } from './service/queue.factory';
dotenv.config();

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host:
          process.env.REDIS_HOST ||
          'redis-stack-service.hypermine-development.svc.cluster.local',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
  ],
  providers: [MailClientService, QueueFactory],
  controllers: [MailClientController],
  exports: [MailClientService],
})
export class MailClientModule {}
