export interface ApiResponse<T = unknown> {
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface DatabaseInfo {
  name: string;
  path: string;
  createdAt: string;
}
