import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { QueueMonitorController } from './controllers/queue-monitor.controller';
import { QueueMonitorService } from './services/queue-monitor.service';
import { WhitelistSSICorsMiddleware } from 'src/utils/middleware/cors.middleware';

@Module({
  imports: [],
  controllers: [QueueMonitorController],
  providers: [QueueMonitorService],
})
export class QueueMonitorModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WhitelistSSICorsMiddleware)
      .forRoutes(QueueMonitorController);
  }
}
