import {
  BadRequestException,
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

import { NextFunction, Request, Response } from 'express';
import { redisClient } from '../redis.provider';
@Injectable()
export class WhitelistSSICorsMiddleware implements NestMiddleware {
  async use(req: Request, _res: Response, next: NextFunction) {
    Logger.log(
      'WhitelistSSICorsMiddleware: start',
      'WhitelistSSICorsMiddleware',
    );

    const origin = req.get('origin');
    const authHeader = req.get('authorization');
    const apiToken = req.get('x-api-credit-token');
    let session: any;
    if (authHeader?.startsWith('Bearer ')) {
      session = await this.resolveFromAuthJwt(authHeader);
    } else if (apiToken) {
      session = this.resolveFromApiToken(apiToken);
    } else {
      throw new UnauthorizedException(['Unauthorized', 'Please pass access token']);
    }
    // const subdomainHeader = req.get('x-subdomain');

    // Logger.debug({ origin, subdomainHeader }, 'Middleware');

    // ------------------------------------------------------------------
    // 1️⃣ Authorization header validation
    // ------------------------------------------------------------------
    const {
      subdomain,
      whitelistedCors,
      edvId,
    } = session;
    if (!subdomain || !Array.isArray(whitelistedCors)) {
      throw new UnauthorizedException(['Invalid session data']);
    }

    // ------------------------------------------------------------------
    // 4️⃣ Subdomain validation (proxy-safe)
    // ------------------------------------------------------------------
    // if (subdomainHeader && subdomainHeader !== subdomain) {
    //   throw new UnauthorizedException(['Subdomain mismatch']);
    // }

    // ------------------------------------------------------------------
    // 5️⃣ CORS origin validation
    // ------------------------------------------------------------------
    if (
      origin &&
      !whitelistedCors.includes('*') &&
      !whitelistedCors.includes(origin)
    ) {
      throw new UnauthorizedException(['Origin mismatch']);
    }

    // ------------------------------------------------------------------
    // 6️⃣ Attach user context
    // ------------------------------------------------------------------
    req.user = {
      ...session
    };

    Logger.log(
      'WhitelistSSICorsMiddleware: passed',
      'WhitelistSSICorsMiddleware',
    );

    next();
  }

  private async resolveFromAuthJwt(authHeader: string) {
    const [, token] = authHeader.split(' ');
    // ------------------------------------------------------------------
    // 2️⃣ Verify JWT
    // ------------------------------------------------------------------
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (err) {
      Logger.error(err, 'JWT verification failed');
      throw new UnauthorizedException(['Invalid or expired token']);
    }

    if (decoded.grantType !== 'access_service_ssi') {
      throw new BadRequestException(['Invalid grant type']);
    }

    if (!decoded.sessionId) {
      throw new UnauthorizedException(['Missing sessionId']);
    }

    // ------------------------------------------------------------------
    // 3️⃣ Fetch session from Redis
    // ------------------------------------------------------------------

    const sessionRaw = await redisClient.get(decoded.sessionId);
    if (!sessionRaw) {
      throw new UnauthorizedException(['Token expired']);
    }

    try {
      return JSON.parse(sessionRaw);
    } catch {
      throw new UnauthorizedException(['Corrupted session data']);
    }
  }
  private resolveFromApiToken(token: string) {
    // ------------------------------------------------------------------
    // 2️⃣ Verify JWT
    // ------------------------------------------------------------------

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch (err) {
      Logger.error(err, 'JWT verification failed');
      throw new UnauthorizedException(['Invalid or expired token']);
    }
    return decoded;
  }
}
