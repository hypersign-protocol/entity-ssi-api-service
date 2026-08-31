import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import {
  CreditCatalogMismatchException,
  InsufficientCreditsException,
} from '@hypersign-protocol/credit-middleware';
import { AllExceptionsFilter } from './utils';

describe('AllExceptionsFilter', () => {
  it.each([
    new InsufficientCreditsException(),
    new CreditCatalogMismatchException('POST /missing'),
    new BadRequestException(['invalid request']),
  ])('preserves the status and response of %s', (exception) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/v1/did/register' }),
      }),
    } as unknown as ArgumentsHost;

    new AllExceptionsFilter().catch(exception, host);

    expect(status).toHaveBeenCalledWith(exception.getStatus());
    expect(json).toHaveBeenCalledWith(exception.getResponse());
  });
});
