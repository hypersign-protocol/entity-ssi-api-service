import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { CREDIT_REDIS_CLIENT } from '@hypersign-protocol/credit-middleware';
import Redis from 'ioredis';

export const CREDIT_REDIS_URL = 'CREDIT_REDIS_URL';

@Injectable()
class CreditRedisShutdown implements OnApplicationShutdown {
  constructor(
    @Inject(CREDIT_REDIS_CLIENT) private readonly operationRedis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.operationRedis.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: CREDIT_REDIS_URL,
      useFactory: (): string => {
        if (process.env.REDIS_URL) return process.env.REDIS_URL;
        const host =
          process.env.REDIS_HOST ??
          'redis-stack-service.hypermine-development.svc.cluster.local';
        const port = Number(process.env.REDIS_PORT) || 6379;
        return `redis://${host}:${port}`;
      },
    },
    {
      provide: CREDIT_REDIS_CLIENT,
      inject: [CREDIT_REDIS_URL],
      useFactory: async (url: string): Promise<Redis> => {
        const redis = new Redis(url, { maxRetriesPerRequest: 2 });
        await redis.ping();
        return redis;
      },
    },
    CreditRedisShutdown,
  ],
  exports: [CREDIT_REDIS_CLIENT],
})
export class CreditInfrastructureModule {}
