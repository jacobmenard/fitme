export type FieldErrors = Record<string, string>;

/** One error shape for every failure: network, timeout, validation, auth, server. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number, // 0 = network/timeout
    public readonly code: string | null = null,
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

const FALLBACK: Record<number, string> = {
  401: 'Your session has ended. Please log in again.',
  403: "You don't have access to this.",
  404: 'Not found.',
  409: 'This action is not available right now.',
  413: 'That photo is too large. Please choose a smaller one.',
  429: 'Too many requests. Please wait a moment and try again.',
};

/** Turn a Laravel JSON error body into an ApiError. Never trusts the body's shape. */
export function toApiError(status: number, body: unknown): ApiError {
  const obj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};

  const fieldErrors: FieldErrors = {};
  if (typeof obj.errors === 'object' && obj.errors !== null) {
    for (const [field, messages] of Object.entries(obj.errors as Record<string, unknown>)) {
      if (Array.isArray(messages) && typeof messages[0] === 'string') {
        fieldErrors[field] = messages[0];
      }
    }
  }

  const serverMessage = typeof obj.message === 'string' && status < 500 ? obj.message : null;
  const message =
    serverMessage ?? FALLBACK[status] ?? 'Something went wrong on our side. Please try again.';
  const code = typeof obj.code === 'string' ? obj.code : null;

  return new ApiError(message, status, code, fieldErrors);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}
