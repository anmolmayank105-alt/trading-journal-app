/**
 * Custom Error Classes
 * Based on Part 5 LLD - Error Handling Layer
 */

import { ERROR_CODES, ErrorCode, HTTP_STATUS, HttpStatus } from '../types';

// ============= Base Application Error =============

export abstract class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: HttpStatus;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: HttpStatus,
    isOperational = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

// ============= Authentication Errors =============

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED, true, details);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.INVALID_TOKEN, HTTP_STATUS.UNAUTHORIZED, true, details);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED, true, details);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED, true, details);
  }
}

export class AccountLockedError extends AppError {
  constructor(message = 'Account is locked', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.ACCOUNT_LOCKED, HTTP_STATUS.FORBIDDEN, true, details);
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message = 'Email is not verified', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.EMAIL_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN, true, details);
  }
}

// ============= Authorization Errors =============

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.FORBIDDEN, HTTP_STATUS.FORBIDDEN, true, details);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(message = 'Insufficient permissions', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.INSUFFICIENT_PERMISSIONS, HTTP_STATUS.FORBIDDEN, true, details);
  }
}

export class SubscriptionRequiredError extends AppError {
  constructor(message = 'Subscription required', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.SUBSCRIPTION_REQUIRED, HTTP_STATUS.FORBIDDEN, true, details);
  }
}

// ============= Validation Errors =============

export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string; value?: unknown }>;

  constructor(
    errors: Array<{ field: string; message: string; value?: unknown }>,
    message = 'Validation failed'
  ) {
    super(message, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, true, { errors });
    this.errors = errors;
  }

  static fromZodError(zodError: { issues: Array<{ path: (string | number)[]; message: string }> }): ValidationError {
    const errors = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return new ValidationError(errors);
  }
}

export class InvalidInputError extends AppError {
  constructor(message = 'Invalid input', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.INVALID_INPUT, HTTP_STATUS.BAD_REQUEST, true, details);
  }
}

// ============= Resource Errors =============

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND, true, { resource, id });
  }
}

export class AlreadyExistsError extends AppError {
  constructor(resource = 'Resource', field?: string, value?: string) {
    const message = field
      ? `${resource} with ${field} '${value}' already exists`
      : `${resource} already exists`;
    super(message, ERROR_CODES.ALREADY_EXISTS, HTTP_STATUS.CONFLICT, true, { resource, field, value });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.CONFLICT, HTTP_STATUS.CONFLICT, true, details);
  }
}

// ============= Rate Limiting Errors =============

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number, message = 'Rate limit exceeded') {
    super(message, ERROR_CODES.RATE_LIMIT_EXCEEDED, HTTP_STATUS.TOO_MANY_REQUESTS, true, { retryAfter });
    this.retryAfter = retryAfter;
  }
}

// ============= Server Errors =============

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service = 'Service', details?: Record<string, unknown>) {
    super(`${service} is temporarily unavailable`, ERROR_CODES.SERVICE_UNAVAILABLE, HTTP_STATUS.SERVICE_UNAVAILABLE, true, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database error', details?: Record<string, unknown>) {
    super(message, ERROR_CODES.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message = 'External service error', details?: Record<string, unknown>) {
    super(`${service}: ${message}`, ERROR_CODES.EXTERNAL_SERVICE_ERROR, HTTP_STATUS.BAD_GATEWAY, true, details);
  }
}

// ============= Business Logic Errors =============

export class TradeAlreadyClosedError extends AppError {
  constructor(tradeId: string) {
    super(`Trade ${tradeId} is already closed`, ERROR_CODES.TRADE_ALREADY_CLOSED, HTTP_STATUS.CONFLICT, true, { tradeId });
  }
}

export class InsufficientQuantityError extends AppError {
  constructor(available: number, requested: number) {
    super(
      `Insufficient quantity: available ${available}, requested ${requested}`,
      ERROR_CODES.INSUFFICIENT_QUANTITY,
      HTTP_STATUS.BAD_REQUEST,
      true,
      { available, requested }
    );
  }
}

export class InvalidTradeStateError extends AppError {
  constructor(currentState: string, expectedState: string) {
    super(
      `Invalid trade state: current '${currentState}', expected '${expectedState}'`,
      ERROR_CODES.INVALID_TRADE_STATE,
      HTTP_STATUS.CONFLICT,
      true,
      { currentState, expectedState }
    );
  }
}

export class BrokerSyncInProgressError extends AppError {
  constructor(brokerAccountId: string) {
    super(
      `Sync already in progress for broker account ${brokerAccountId}`,
      ERROR_CODES.BROKER_SYNC_IN_PROGRESS,
      HTTP_STATUS.CONFLICT,
      true,
      { brokerAccountId }
    );
  }
}

export class BrokerTokenExpiredError extends AppError {
  constructor(broker: string) {
    super(
      `${broker} token has expired. Please reconnect your account.`,
      ERROR_CODES.BROKER_TOKEN_EXPIRED,
      HTTP_STATUS.UNAUTHORIZED,
      true,
      { broker }
    );
  }
}

// ============= Error Type Guard =============

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

// ============= Error Factory =============

export function createError(code: ErrorCode, message: string, details?: Record<string, unknown>): AppError {
  switch (code) {
    case ERROR_CODES.UNAUTHORIZED:
      return new UnauthorizedError(message, details);
    case ERROR_CODES.INVALID_TOKEN:
      return new InvalidTokenError(message, details);
    case ERROR_CODES.TOKEN_EXPIRED:
      return new TokenExpiredError(message, details);
    case ERROR_CODES.INVALID_CREDENTIALS:
      return new InvalidCredentialsError(message, details);
    case ERROR_CODES.FORBIDDEN:
      return new ForbiddenError(message, details);
    case ERROR_CODES.NOT_FOUND:
      return new NotFoundError(message);
    case ERROR_CODES.ALREADY_EXISTS:
      return new AlreadyExistsError(message);
    case ERROR_CODES.VALIDATION_ERROR:
      return new ValidationError([], message);
    default:
      return new InternalServerError(message, details);
  }
}
