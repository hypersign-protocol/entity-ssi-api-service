import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { CreditManagerService } from '../managers/credit-manager.service';
import { CreditService } from '../services/credit-manager.service';

@Injectable()
export class ReduceCreditGuard implements CanActivate {
  private readonly exemptedOrigin = 'https://entity.dashboard.hypersign.id';
  // private readonly exemptedOrigin = 'http://localhost:9001';

  constructor(
    private readonly creditManagerService: CreditManagerService,
    private readonly creditService: CreditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();
    if (!req.app) return false;

    //Check if the user has a valid plan with enough balance
    const creditDetails = await this.creditManagerService.hasValidCredit(req);
    const activeCredit = await this.creditService.getActiveCredit(
      String(creditDetails.attestationCost.hidCost),
    );
    if (!creditDetails['hasSufficientFund']) {
      Logger.error(
        'User does not have a valid plan or enough credits',
        'ReduceCreditGuard',
      );
      res.status(403).json({ error: 'Insufficient credits or no active plan' });
      return false;
    }
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        Logger.log(
          'Request successful. Deducting credits now...',
          'ReduceCreditGuard',
        );
        const origin = req.headers.origin || req.headers.referer || '';
        if (req.method === 'GET' && origin?.startsWith(this.exemptedOrigin)) {
          Logger.log(
            `Skipping credit deduction for ${req.method} request from ${origin}`,
            'ReduceCreditGuard',
          );
          return;
        }
        try {
          let remainingCreditsNeeded = creditDetails.creditAmountRequired;
          let remainingHIDNeeded = Number(
            creditDetails.attestationCost.hidCost,
          );
          const availableCredits =
            activeCredit.totalCredits - activeCredit.used;
          const availableHID =
            Number(activeCredit.credit.amount) - activeCredit.credit.used;
          if (
            availableCredits < remainingCreditsNeeded ||
            availableHID < remainingHIDNeeded
          ) {
            const deductedCredits = Math.min(
              remainingCreditsNeeded,
              availableCredits,
            );
            const deductedHID = Math.min(remainingHIDNeeded, availableHID);
            remainingCreditsNeeded -= deductedCredits;
            remainingHIDNeeded -= deductedHID;

            if (remainingCreditsNeeded > 0) {
              const inactiveCreditPlan =
                await this.creditService.getNextAvailableCredit(
                  `${remainingHIDNeeded}`,
                );
              if (inactiveCreditPlan) {
                Logger.log(
                  `Activating new credit plan: ${inactiveCreditPlan._id}`,
                  'ReduceCreditGuard',
                );
                await this.creditService.activateCredit(inactiveCreditPlan._id);
                await this.creditService.updateCreditDetail(
                  { _id: activeCredit._id },
                  {
                    $inc: {
                      used: deductedCredits,
                      [`credit.used`]: deductedHID,
                    },
                    status: 'Inactive',
                  },
                );
                Logger.log(
                  `Deducted ${deductedCredits} credits and ${deductedHID} HID from active plan`,
                  'ReduceCreditGuard',
                );
                await this.creditService.updateCreditDetail(
                  { _id: inactiveCreditPlan._id },
                  {
                    $inc: {
                      used: remainingCreditsNeeded,
                      [`credit.used`]: remainingHIDNeeded,
                    },
                  },
                );
                Logger.log(
                  `Deducted remaining ${remainingCreditsNeeded} credits from new plan`,
                  'ReduceCreditGuard',
                );
                remainingCreditsNeeded = 0;
              } else {
                Logger.error(
                  'No inactive credit plan available to activate.',
                  'ReduceCreditGuard',
                );
              }
            }
          } else {
            await this.creditService.updateCreditDetail(
              { _id: activeCredit._id },
              {
                $inc: {
                  used: creditDetails.creditAmountRequired,
                  [`credit.used`]: Number(
                    creditDetails.attestationCost.hidCost,
                  ),
                },
              },
            );
          }
          Logger.log('Credits deducted successfully', 'ReduceCreditGuard');
        } catch (error) {
          Logger.error(
            'Error deducting credits: ' + error.message,
            'ReduceCreditGuard',
          );
        }
      } else {
        Logger.warn(
          'Request failed. Skipping credit deduction.',
          'ReduceCreditGuard',
        );
      }
    });

    return true;
  }
}
