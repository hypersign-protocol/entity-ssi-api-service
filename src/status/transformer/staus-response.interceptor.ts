import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RegistrationStatus } from '../schema/status.schema';
export interface Response {
  totalCount: number;
  data: Array<RegistrationStatus>;
}
@Injectable()
export class RegistrationStatusInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response> {
    return next.handle().pipe(
      map((data) => {
        const modifiedResponse = {
          totalCount:
            data[0]['totalCount'].length > 0
              ? data[0]['totalCount'][0].total
              : 0,
          data: this.mapData(data[0]['data']),
        };
        return modifiedResponse;
      }),
    );
  }
  mapData(data) {
    return data.map((data) => {
      try {
        data.message = JSON.parse(data.message);
      } catch (e) {}
      return data;
    });
  }
}
