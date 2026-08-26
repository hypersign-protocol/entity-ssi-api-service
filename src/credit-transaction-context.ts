import {
  CreditBillingMode,
  CreditSettlementMode,
  CreditType,
  getCreditRequestState,
} from '@hypersign-protocol/credit-middleware';

export interface DeferredBlockchainCreditContext {
  schemaVersion: 1;
  transactionJobId: string;
  reservationId: string;
  serviceType: string;
  appId: string;
  tenantId?: string;
  operation: string;
}

/**
 * Returns only the deferred blockchain reservation created for this HTTP
 * request. The authenticated req.user object is deliberately left untouched.
 */
export function getBlockchainCreditContext(
  request: unknown,
): DeferredBlockchainCreditContext | undefined {
  const state = getCreditRequestState(request);
  const action = state?.actions.find(
    (candidate) =>
      candidate.billingMode === CreditBillingMode.ENFORCE &&
      candidate.charge.creditType === CreditType.BLOCKCHAIN_TXN_CREDIT &&
      candidate.charge.settlementMode === CreditSettlementMode.DEFERRED,
  );

  if (!action || action.billingMode !== CreditBillingMode.ENFORCE) {
    return undefined;
  }

  const { reservation } = action;
  return {
    schemaVersion: 1,
    transactionJobId: reservation.reservationId,
    reservationId: reservation.reservationId,
    serviceType: reservation.subject.appType || 'SSI_API',
    appId: reservation.subject.appId,
    ...(reservation.subject.tenantId
      ? { tenantId: reservation.subject.tenantId }
      : {}),
    operation: state.route.operation,
  };
}
