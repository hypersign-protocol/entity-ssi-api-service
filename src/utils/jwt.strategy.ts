import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }
  async validate(req: Request, payload) {
    type App = {
      appId: string;
      userId: string;
      kmsId: string;
      whitelistedCors: Array<string>;
      subdomain: string;
      edvId: string;
      accessList: string[];
      grantType: string;
      env: string;
      appName: string;
    };
    const sessionDetail = req['user'];
    const appDetail: App = {
      appId: payload?.appId,
      userId: payload?.userId,
      kmsId: sessionDetail?.kmsId,
      whitelistedCors: sessionDetail?.whitelistedCors,
      subdomain: payload?.subdomain,
      edvId: sessionDetail?.edvId,
      accessList: sessionDetail?.accessList || [],
      env: sessionDetail.env,
      appName: sessionDetail.appName,
      grantType: sessionDetail?.grantType
    };
    return appDetail;
  }
}
