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
    // const subdomainHeader = req.get('x-subdomain');

    // Logger.debug({ origin, subdomainHeader }, 'Middleware');

    // ------------------------------------------------------------------
    // 1️⃣ Authorization header validation
    // ------------------------------------------------------------------
    if (!authHeader) {
      throw new UnauthorizedException([
        'Unauthorized',
        'Please pass access token',
      ]);
    }

    const [, token] = authHeader.split(' ');
    if (!token) {
      throw new UnauthorizedException(['Invalid Authorization format']);
    }

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
      throw new BadRequestException(['Invalid grant type for SSI service']);
    }

    if (!decoded.sessionId || !decoded.subdomain) {
      throw new UnauthorizedException(['Invalid authorization token payload']);
    }

    // ------------------------------------------------------------------
    // 3️⃣ Fetch session from Redis
    // ------------------------------------------------------------------
    const sessionRaw = await redisClient.get(decoded.sessionId);
    if (!sessionRaw) {
      throw new UnauthorizedException(['Token expired']);
    }

    let session;
    try {
      session = JSON.parse(sessionRaw);
    } catch {
      throw new UnauthorizedException(['Corrupted session data']);
    }

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
}
