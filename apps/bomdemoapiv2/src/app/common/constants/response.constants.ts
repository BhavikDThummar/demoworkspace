export const API_RESPONSE_CODE = {
  SUCCESS: 200,
  ERROR: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAGE_NOT_FOUND: 404,
  ACCESS_DENIED: 403,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const STATE = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  EMPTY: 'EMPTY',
} as const;

export type ApiResponseCode = typeof API_RESPONSE_CODE[keyof typeof API_RESPONSE_CODE];
export type State = typeof STATE[keyof typeof STATE];
