import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { API_RESPONSE_CODE, STATE } from '../constants/response.constants';
import { ErrorEnvelope } from '../interfaces/response.interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        error = responseObj.error as string;
        details = responseObj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    // Map HTTP status to API_RESPONSE_CODE
    let statusCode: number = API_RESPONSE_CODE.ERROR;
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        statusCode = API_RESPONSE_CODE.BAD_REQUEST;
        break;
      case HttpStatus.UNAUTHORIZED:
        statusCode = API_RESPONSE_CODE.UNAUTHORIZED;
        break;
      case HttpStatus.FORBIDDEN:
        statusCode = API_RESPONSE_CODE.ACCESS_DENIED;
        break;
      case HttpStatus.NOT_FOUND:
        statusCode = API_RESPONSE_CODE.PAGE_NOT_FOUND;
        break;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        statusCode = API_RESPONSE_CODE.INTERNAL_SERVER_ERROR;
        break;
      default:
        statusCode = API_RESPONSE_CODE.ERROR;
    }

    const errorResponse: ErrorEnvelope = {
      statusCode,
      status: STATE.FAILED,
      message,
      error,
      details,
    };

    response.status(status).json(errorResponse);
  }
}
