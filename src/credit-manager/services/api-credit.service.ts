import { Injectable, Logger } from '@nestjs/common';
import { CREDIT_COSTS } from 'src/utils/utils';

@Injectable()
export class ApiCreditService {
  async calculateCost(type) {
    Logger.log(
      'Inside calculateCost to calculate credit',
      'AttestationCreditService',
    );
    return CREDIT_COSTS.API[type];
  }
}
