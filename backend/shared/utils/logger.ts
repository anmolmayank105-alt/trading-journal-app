/**
 * Logger Utility
 * Based on Part 5 LLD - Logging Architecture (Pino structured logging)
 */

import pino, { Logger, LoggerOptions } from 'pino';

// ============= Log Levels =============

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// ============= Log Context =============

export interface LogContext {
  correlationId?: string;
  userId?: string;
  service?: string;
  method?: string;
  path?: string;
  duration?: number;
  [key: string]: unknown;
}

// ============= Logger Configuration =============

export interface LoggerConfig {
  level: LogLevel;
  service: string;
  environment: string;
  prettyPrint?: boolean;
  redactPaths?: string[];
}

const DEFAULT_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'passwordHash',
  'accessToken',
  'refreshToken',
  'token',
  'secret',
  'apiKey',
  'creditCard',
];

// ============= Create Logger =============

export function createLogger(config: Partial<LoggerConfig> = {}): Logger {
  const {
    level = (process.env.LOG_LEVEL as LogLevel) || 'info',
    service = process.env.SERVICE_NAME || 'stock-tracker',
    environment = process.env.NODE_ENV || 'development',
    prettyPrint = environment === 'development',
    redactPaths = DEFAULT_REDACT_PATHS,
  } = config;

  const options: LoggerOptions = {
    level,
    base: {
      service,
      env: environment,
      pid: process.pid,
    },
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
        service: bindings.service,
        env: bindings.env,
      }),
    },
  };

  if (prettyPrint) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  return pino(options);
}

// ============= Default Logger Instance =============

export const logger = createLogger();

// ============= Child Logger Factory =============

export function createChildLogger(context: LogContext): Logger {
  return logger.child(context);
}

// ============= Request Logger =============

export function createRequestLogger(
  correlationId: string,
  userId?: string,
  method?: string,
  path?: string
): Logger {
  return logger.child({
    correlationId,
    userId,
    method,
    path,
  });
}

// ============= Audit Logger =============

export interface AuditLogEntry {
  action: string;
  userId: string;
  resource: string;
  resourceId?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export function logAudit(entry: AuditLogEntry): void {
  logger.info({
    type: 'audit',
    ...entry,
  });
}

// ============= Performance Logger =============

export interface PerformanceLogEntry {
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export function logPerformance(entry: PerformanceLogEntry): void {
  const level = entry.duration > 1000 ? 'warn' : 'debug';
  logger[level]({
    type: 'performance',
    ...entry,
  });
}

// ============= Error Logger =============

export function logError(error: Error, context?: LogContext): void {
  logger.error({
    type: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
}

// ============= Metrics Logger =============

export interface MetricEntry {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
}

export function logMetric(entry: MetricEntry): void {
  logger.info({
    type: 'metric',
    ...entry,
    timestamp: new Date().toISOString(),
  });
}

// ============= Timer Utility =============

export class Timer {
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.duration;
  }

  get duration(): number {
    const end = this.endTime ?? performance.now();
    return Math.round(end - this.startTime);
  }

  log(operation: string, metadata?: Record<string, unknown>): void {
    logPerformance({
      operation,
      duration: this.stop(),
      success: true,
      metadata,
    });
  }
}

export function startTimer(): Timer {
  return new Timer();
}
