import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreditRecoveryService } from '@hypersign-protocol/credit-middleware';

@Injectable()
export class CreditRecoveryScheduler {
  constructor(private readonly creditRecovery: CreditRecoveryService) {}

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'credit-recovery',
  })
  async recoverExpiredCredits(): Promise<void> {
    await this.creditRecovery.runOnce();
  }
}
