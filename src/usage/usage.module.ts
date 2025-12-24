import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { UsageController } from './controllers/usage.controller';
import { UsageService } from './services/usage.service';
import { LogModule } from 'src/log/log.module';
import { WhitelistSSICorsMiddleware } from 'src/utils/middleware/cors.middleware';

@Module({
  imports: [LogModule],
  controllers: [UsageController],
  providers: [UsageService],
})
export class UsageModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(WhitelistSSICorsMiddleware).forRoutes(UsageController);
  }
}
