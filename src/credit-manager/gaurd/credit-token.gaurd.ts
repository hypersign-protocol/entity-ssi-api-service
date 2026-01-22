import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  UseFilters,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AllExceptionsFilter } from 'src/utils/utils';
import {
  CreateCreditManagerDto,
  ValidityPeriodUnit,
} from '../dto/create-credit-manager.dto';
import { redisClient } from 'src/utils/redis.provider';

@UseFilters(AllExceptionsFilter)
@Injectable()
@ApiBearerAuth('JWT')
export class CreditAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    Logger.log('Inside CreditAuthGuard, canActivate()', 'CreditAuthGuard');
    const request: Request = context.switchToHttp().getRequest();
    const accessToken = this.extractTokenFromHeader(request);
    if (!accessToken) {
      throw new UnauthorizedException([
        'Please pass the authorization token in the header',
      ]);
    }
    const payload = await this.jwtService.verifyAsync(accessToken, {
      secret: this.configService.get('JWT_SECRET'),
    });
    if (
      !payload ||
      Object.keys(payload).length === 0 ||
      payload['purpose'] !== 'CreditRecharge' ||
      !payload['amount'] ||
      !payload['validityPeriod'] ||
      !payload['serviceId']
    ) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    const creditDetail: CreateCreditManagerDto = {
      totalCredits: payload['amount'],
      validityDuration: payload['validityPeriod'],
      validityDurationUnit:
        payload['validityPeriodUnit'] || ValidityPeriodUnit.DAYS,
      serviceId: payload['serviceId'],
      creditDenom: payload['amountDenom'] || 'uHID',
    };
    request['creditDetail'] = creditDetail;
    return true;

  }
  private extractTokenFromHeader(request: Request): string | undefined {
    const credit_token = request.headers[
      'x-api-credit-token'
    ] as string;
    return credit_token;
  }
}
