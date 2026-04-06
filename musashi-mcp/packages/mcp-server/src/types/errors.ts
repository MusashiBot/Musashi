/**
 * Base error class for all Musashi MCP errors
 */
export class MusashiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'MusashiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends MusashiError {
  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Authentication error
 */
export class AuthError extends MusashiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

/**
 * API client error (external API failed)
 */
export class APIClientError extends MusashiError {
  constructor(
    message: string,
    public readonly source: 'polymarket' | 'kalshi',
    public readonly originalError?: Error
  ) {
    super(message, 'API_CLIENT_ERROR', 502, { source, originalError: originalError?.message });
    this.name = 'APIClientError';
  }
}

/**
 * Validation error (invalid input)
 */
export class ValidationError extends MusashiError {
  constructor(
    message: string,
    public readonly validationErrors: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR', 400, { validationErrors });
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends MusashiError {
  constructor(
    message: string,
    public readonly resourceType: string,
    public readonly resourceId: string
  ) {
    super(message, 'NOT_FOUND', 404, { resourceType, resourceId });
    this.name = 'NotFoundError';
  }
}

/**
 * Cache error
 */
export class CacheError extends MusashiError {
  constructor(message: string, public readonly operation: string) {
    super(message, 'CACHE_ERROR', 500, { operation });
    this.name = 'CacheError';
  }
}

/**
 * Convert unknown errors to MusashiError
 */
export function toMusashiError(error: unknown): MusashiError {
  if (error instanceof MusashiError) {
    return error;
  }

  if (error instanceof Error) {
    return new MusashiError(
      error.message,
      'INTERNAL_ERROR',
      500,
      { originalError: error.stack }
    );
  }

  return new MusashiError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500,
    { error }
  );
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: MusashiError): boolean {
  return (
    error instanceof APIClientError ||
    error instanceof RateLimitError ||
    (error.statusCode >= 500 && error.statusCode < 600)
  );
}
