/**
 * API Types - Request/Response and Middleware Types
 */

import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from './user.types';

// ============= Extended Request =============

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
  sessionId?: string;
  correlationId?: string;
  startTime?: number;
}

// ============= Route Handler Types =============

export type AsyncHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type RouteHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

// ============= API Response =============

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    validationErrors?: ValidationError[];
    stack?: string;
  };
}

export type ApiResponseType<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============= Validation =============

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============= Rate Limiting =============

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// ============= Request Context =============

export interface RequestContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  method: string;
  path: string;
  startTime: number;
}

// ============= Middleware Config =============

export interface CorsConfig {
  origin: string | string[] | boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface HelmetConfig {
  contentSecurityPolicy: boolean | object;
  crossOriginEmbedderPolicy: boolean;
  crossOriginOpenerPolicy: boolean;
  crossOriginResourcePolicy: boolean;
  dnsPrefetchControl: boolean;
  expectCt: boolean;
  frameguard: boolean | object;
  hidePoweredBy: boolean;
  hsts: boolean | object;
  ieNoOpen: boolean;
  noSniff: boolean;
  originAgentCluster: boolean;
  permittedCrossDomainPolicies: boolean;
  referrerPolicy: boolean | object;
  xssFilter: boolean;
}

// ============= File Upload =============

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface FileUploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  maxFiles: number;
}

// ============= Logging =============

export interface RequestLog {
  correlationId: string;
  method: string;
  path: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}

export interface ResponseLog {
  correlationId: string;
  statusCode: number;
  duration: number;
  contentLength?: number;
  error?: string;
  timestamp: Date;
}

// ============= Health Check =============

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  timestamp: Date;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    latency?: number;
    message?: string;
  }[];
}

// ============= API Versioning =============

export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
} as const;

export type ApiVersion = typeof API_VERSIONS[keyof typeof API_VERSIONS];

// ============= Error Codes =============

export const ERROR_CODES = {
  // Authentication (1xxx)
  UNAUTHORIZED: 'AUTH_001',
  INVALID_TOKEN: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  INVALID_CREDENTIALS: 'AUTH_004',
  ACCOUNT_LOCKED: 'AUTH_005',
  EMAIL_NOT_VERIFIED: 'AUTH_006',
  REFRESH_TOKEN_EXPIRED: 'AUTH_007',
  SESSION_EXPIRED: 'AUTH_008',
  
  // Authorization (2xxx)
  FORBIDDEN: 'AUTHZ_001',
  INSUFFICIENT_PERMISSIONS: 'AUTHZ_002',
  SUBSCRIPTION_REQUIRED: 'AUTHZ_003',
  
  // Validation (3xxx)
  VALIDATION_ERROR: 'VAL_001',
  INVALID_INPUT: 'VAL_002',
  MISSING_REQUIRED_FIELD: 'VAL_003',
  INVALID_FORMAT: 'VAL_004',
  
  // Resource (4xxx)
  NOT_FOUND: 'RES_001',
  ALREADY_EXISTS: 'RES_002',
  CONFLICT: 'RES_003',
  GONE: 'RES_004',
  
  // Rate Limiting (5xxx)
  RATE_LIMIT_EXCEEDED: 'RATE_001',
  TOO_MANY_REQUESTS: 'RATE_002',
  
  // Server (6xxx)
  INTERNAL_ERROR: 'SRV_001',
  SERVICE_UNAVAILABLE: 'SRV_002',
  DATABASE_ERROR: 'SRV_003',
  EXTERNAL_SERVICE_ERROR: 'SRV_004',
  
  // Business Logic (7xxx)
  TRADE_ALREADY_CLOSED: 'BIZ_001',
  INSUFFICIENT_QUANTITY: 'BIZ_002',
  INVALID_TRADE_STATE: 'BIZ_003',
  BROKER_SYNC_IN_PROGRESS: 'BIZ_004',
  BROKER_TOKEN_EXPIRED: 'BIZ_005',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// ============= HTTP Status Codes =============

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
