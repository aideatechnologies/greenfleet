export enum ErrorCode {
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CONFLICT = "CONFLICT",
  INTERNAL = "INTERNAL",
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: ErrorCode };
