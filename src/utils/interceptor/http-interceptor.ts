import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Request, Response, NextFunction } from 'express';
import { CreateLogDto } from 'src/log/dto/create-log.dto';
import { LogService } from 'src/log/services/log.service';

@Injectable()
export class AppLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly logStore: LogService,
  ) {}
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, path } = request;
    const userAgent = request.get('user-agent') || '';

    response.on('close', () => {
      let { url: path } = request;
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const app = request['app'];
      const { appId } = app as any;
      if (path.includes('credential/issue')) {
        const reqBody = request.body;
        const persist = reqBody?.persist ?? true;
        const registerCredentialStatus =
          reqBody?.registerCredentialStatus ?? true;
        path = `${path}?persist=${persist}&registerCredentialStatus=${registerCredentialStatus}`;
      }
      const logData: CreateLogDto = {
        method,
        path,
        statusCode,
        contentLength,
        userAgent,
        appId,
      };

      if (
        request?.body?.QueryRequest &&
        (statusCode === 201 || statusCode === 200)
      ) {
        logData.dataRequest = btoa(JSON.stringify(request?.body?.QueryRequest));
      }
      this.logStore.createLog(logData);
    });

    next();
  }
}
