import { Injectable, Logger } from '@nestjs/common';
import { CREDIT_COSTS } from 'src/utils/utils';

@Injectable()
export class StorageCreditService {
  async calculateCost(type) {
    Logger.log(
      'Inside calculateCost to calculate credit',
      'StorageCreditService',
    );
    return CREDIT_COSTS.STORAGE[type];
  }
}
