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
      !payload['sessionId']
    ) {
      throw new UnauthorizedException('Invalid authorization token');
    }
    const sessionDetail = await redisClient.get(payload.sessionId);
    if (!sessionDetail) {
      throw new UnauthorizedException(['Token is expired or invalid']);
    }
    const sessionDetailJson = JSON.parse(sessionDetail);
    if (
      !sessionDetailJson ||
      Object.keys(sessionDetailJson).length === 0 ||
      sessionDetailJson['purpose'] !== 'CreditRecharge' ||
      !sessionDetailJson['amount'] ||
      !sessionDetailJson['validityPeriod'] ||
      !sessionDetailJson['serviceId']
    ) {
      throw new UnauthorizedException("Invalid token. Can't process credit");
    }
    const creditDetail: CreateCreditManagerDto = {
      totalCredits: sessionDetailJson['amount'],
      validityDuration: sessionDetailJson['validityPeriod'],
      validityDurationUnit:
        sessionDetailJson['validityPeriodUnit'] || ValidityPeriodUnit.DAYS,
      serviceId: sessionDetailJson['serviceId'],
      creditDenom: sessionDetailJson['amountDenom'] || 'uHID',
    };
    request['creditDetail'] = creditDetail;
    return true;
  }
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
