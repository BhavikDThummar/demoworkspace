import { ApiResponseCode, State } from '../constants/response.constants';

export interface SuccessEnvelope<T = unknown> {
  statusCode: ApiResponseCode;
  status: State;
  data: T;
  message: string | null;
}

export interface ErrorEnvelope {
  statusCode: number;
  status: State;
  message: string;
  error?: string;
  details?: unknown;
}
