export interface MyError {
  code: string;
  message: string;
  userMessage: string;
  status: number;
  path: string;
  timestamp: string;
  traceId: string;
  data?: Record<string, unknown>;
}

export interface ErrorResponse {
  error: MyError;
}
