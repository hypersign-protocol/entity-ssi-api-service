import { Injectable, Logger } from '@nestjs/common';
import { CREDIT_COSTS } from 'src/utils/utils';

@Injectable()
export class AttestationCreditService {
  async calculateCost(type) {
    Logger.log(
      'Inside calculateCost to calculate credit',
      'AttestationCreditService',
    );
    const hidCost = CREDIT_COSTS.ATTESTATION[type] || 50;
    const creditCost = hidCost / 10;
    return { hidCost, creditCost };
  }
}
