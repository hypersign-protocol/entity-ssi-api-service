import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CreditService } from '../services/credit-manager.service';
import { RMethods } from 'src/utils/utils';
import { ApiCreditService } from '../services/api-credit.service';
import { AttestationCreditService } from '../services/attestation-credit.service';
import { StorageCreditService } from '../services/storage-credit.service';
import { getApiDetail } from '../utils';
@Injectable()
export class CreditManagerService {
  constructor(
    private readonly creditService: CreditService,
    private readonly apiCreditService: ApiCreditService,
    private readonly storageService: StorageCreditService,
    private readonly attestationCreditService: AttestationCreditService,
  ) {}

  async hasValidCredit(
    req,
  ): Promise<{ attestationCost; creditAmountRequired; hasSufficientFund }> {
    const appId = req.user.appId;
    const { storageType, attestationType, method } = await getApiDetail(req);
    const apiCost = method
      ? await this.apiCreditService.calculateCost(method)
      : 0;
    const storageCost = storageType
      ? await this.storageService.calculateCost(storageType)
      : 0;
    const attestationCost = attestationType
      ? await this.attestationCreditService.calculateCost(attestationType)
      : { hidCost: 0, creditCost: 0 };
    const { hidCost, creditCost } = attestationCost;
    const creditAmountRequired = apiCost + storageCost + creditCost;

    // Fetch user's active plan
    const activeCredit = await this.creditService.getActiveCredit(
      String(hidCost),
    );

    if (
      !activeCredit ||
      activeCredit.used >= activeCredit.totalCredits ||
      (activeCredit.expiresAt &&
        new Date(activeCredit.expiresAt) <= new Date()) ||
      activeCredit.totalCredits - activeCredit.used < creditAmountRequired
    ) {
      const availableCredit = await this.creditService.getNextAvailableCredit(
        String(attestationCost),
      );
      if (!availableCredit) {
        throw new BadRequestException([
          'No credits found or credit exhausted. Please contact the admin',
        ]);
      }
    }
    return { attestationCost, creditAmountRequired, hasSufficientFund: true };
  }
  async getCreditDetailFromPath(apiMethod, apiPath) {
    const { storageType, attestationType, method } = await getApiDetail({
      method: apiMethod,
      url: apiPath,
    });
    const apiCost = method
      ? await this.apiCreditService.calculateCost(method)
      : 0;
    const storageCost = storageType
      ? await this.storageService.calculateCost(storageType)
      : 0;
    const attestationCost = attestationType
      ? await this.attestationCreditService.calculateCost(attestationType)
      : { hidCost: 0, creditCost: 0 };
    const { hidCost, creditCost } = attestationCost;
    const creditAmountRequired = apiCost + storageCost + creditCost;
    return { hidCost, creditAmountRequired };
  }
}
