import {
  CREDIT_REQUEST_STATE,
  CreditBillingMode,
  CreditSettlementMode,
  CreditType,
} from '@hypersign-protocol/credit-middleware';
import { getBlockchainCreditContext } from './credit-transaction-context';

describe('getBlockchainCreditContext', () => {
  it('returns the enforced deferred blockchain reservation', () => {
    const request = {
      user: {
        appId: 'app-1',
        subdomain: 'tenant-1',
        creditTransaction: { reservationId: 'untrusted' },
      },
      [CREDIT_REQUEST_STATE]: {
        route: {
          method: 'POST',
          path: '/api/v1/did/register',
          operation: 'POST /api/v1/did/register',
        },
        actions: [
          {
            billingMode: CreditBillingMode.ENFORCE,
            charge: {
              id: 'blockchain',
              creditType: CreditType.BLOCKCHAIN_TXN_CREDIT,
              amount: 50,
              settlementMode: CreditSettlementMode.DEFERRED,
            },
            reservation: {
              reservationId: 'reservation-1',
              subject: {
                appId: 'app-1',
                tenantId: 'tenant-1',
                appType: 'SSI_API',
                creditType: CreditType.BLOCKCHAIN_TXN_CREDIT,
              },
            },
          },
        ],
      },
    } as any;

    expect(getBlockchainCreditContext(request)).toEqual({
      schemaVersion: 1,
      transactionJobId: 'reservation-1',
      reservationId: 'reservation-1',
      serviceType: 'SSI_API',
      appId: 'app-1',
      tenantId: 'tenant-1',
      operation: 'POST /api/v1/did/register',
    });
  });

  it('does not read caller-provided settlement metadata', () => {
    const result = getBlockchainCreditContext({
      user: {
        appId: 'app-1',
        creditTransaction: { reservationId: 'untrusted' },
      },
    });

    expect(result).toBeUndefined();
  });
});
