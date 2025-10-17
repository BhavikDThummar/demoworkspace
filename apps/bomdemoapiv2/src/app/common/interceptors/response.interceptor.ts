import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_RESPONSE_CODE, STATE } from '../constants/response.constants';
import { SuccessEnvelope } from '../interfaces/response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped in the envelope format, return as is
        if (data && typeof data === 'object' && 'statusCode' in data && 'status' in data) {
          return data as SuccessEnvelope<T>;
        }

        // Wrap the response in the standard envelope
        const responseObj: SuccessEnvelope<T> = {
          statusCode: API_RESPONSE_CODE.SUCCESS,
          status: STATE.SUCCESS,
          data: data?.data || data,
          message: data?.message || null,
        };

        return responseObj;
      }),
    );
  }
}
