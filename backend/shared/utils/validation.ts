/**
 * Validation Utilities with Zod
 * Based on Part 5 LLD - DTOs and Validation Schemas
 */

import { z, ZodError, ZodSchema, ZodIssue } from 'zod';
import { ValidationError } from './errors';

// ============= Common Validation Patterns =============

export const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  username: /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  objectId: /^[a-f\d]{24}$/i,
  symbol: /^[A-Z0-9&\s-]{1,30}$/,  // Allow spaces for indices with strike prices
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

// ============= Common Zod Schemas =============

export const zodSchemas = {
  // Primitives
  objectId: z.string().regex(patterns.objectId, 'Invalid ObjectId format'),
  email: z.string().email('Invalid email format').toLowerCase().trim(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(patterns.username, 'Username must start with a letter and contain only letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      patterns.password,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  phone: z.string().regex(patterns.phone, 'Invalid phone number format').optional(),
  symbol: z.string().regex(patterns.symbol, 'Invalid symbol format').toUpperCase(),
  
  // Enums
  exchange: z.enum(['NSE', 'BSE', 'MCX', 'NFO']),
  segment: z.enum(['equity', 'futures', 'options', 'commodity']),
  tradeType: z.enum(['intraday', 'delivery', 'swing']),
  position: z.enum(['long', 'short']),
  tradeStatus: z.enum(['open', 'closed', 'partial', 'cancelled']),
  orderType: z.enum(['market', 'limit', 'stop_loss', 'trailing_stop']),
  broker: z.enum(['zerodha', 'upstox', 'angel', 'groww', 'fyers']),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all_time']),
  
  // Numbers
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().nonnegative('Must be a non-negative number'),
  percentage: z.number().min(0).max(100),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  price: z.number().positive('Price must be positive'),
  
  // Dates
  dateString: z.string().datetime({ message: 'Invalid date format' }),
  date: z.coerce.date(),
  
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Arrays
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  symbols: z.array(z.string().regex(patterns.symbol)).min(1).max(50),
};

// ============= Schema Factories =============

export function createPaginationSchema(allowedSortFields: string[] = ['createdAt']) {
  return z.object({
    page: zodSchemas.page,
    limit: zodSchemas.limit,
    sortBy: z.enum(allowedSortFields as [string, ...string[]]).optional(),
    sortOrder: zodSchemas.sortOrder,
  });
}

export function createDateRangeSchema() {
  return z.object({
    from: zodSchemas.date,
    to: zodSchemas.date,
  }).refine(
    (data) => data.from <= data.to,
    { message: 'From date must be before or equal to To date', path: ['from'] }
  );
}

// ============= Trade Schemas =============

export const taxesSchema = z.object({
  stt: zodSchemas.nonNegativeNumber.optional().default(0),
  stampDuty: zodSchemas.nonNegativeNumber.optional().default(0),
  gst: zodSchemas.nonNegativeNumber.optional().default(0),
  sebiTurnover: zodSchemas.nonNegativeNumber.optional().default(0),
  exchangeTxn: zodSchemas.nonNegativeNumber.optional().default(0),
});

export const createTradeSchema = z.object({
  symbol: zodSchemas.symbol,
  exchange: zodSchemas.exchange,
  segment: zodSchemas.segment.optional().default('equity'),
  instrumentType: z.enum(['stock', 'future', 'call', 'put', 'commodity']).optional().default('stock'),
  tradeType: zodSchemas.tradeType,
  position: zodSchemas.position,
  entryPrice: zodSchemas.price,
  quantity: zodSchemas.quantity,
  entryTimestamp: zodSchemas.date.optional(),
  orderType: zodSchemas.orderType.optional().default('market'),
  brokerage: zodSchemas.nonNegativeNumber.optional().default(0),
  taxes: taxesSchema.optional(),
  stopLoss: zodSchemas.positiveNumber.optional(),
  target: zodSchemas.positiveNumber.optional(),
  strategy: z.string().max(100).optional(),
  psychology: z.string().max(200).optional(),
  mistake: z.string().max(200).optional(),
  tags: zodSchemas.tags,
  notes: z.string().max(1000).optional(),
  brokerId: zodSchemas.objectId.optional(),
});

export const exitTradeSchema = z.object({
  exitPrice: zodSchemas.price,
  exitQuantity: zodSchemas.quantity.optional(),
  exitTimestamp: zodSchemas.date.optional(),
  orderType: zodSchemas.orderType.optional().default('market'),
  brokerage: zodSchemas.nonNegativeNumber.optional().default(0),
  taxes: taxesSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const updateTradeSchema = createTradeSchema.partial().extend({
  exitPrice: zodSchemas.price.optional(),
  exitTimestamp: zodSchemas.date.optional(),
  entryDate: zodSchemas.date.optional(),
  exitTime: zodSchemas.date.optional(),
});

export const tradeQuerySchema = z.object({
  status: z.union([zodSchemas.tradeStatus, z.array(zodSchemas.tradeStatus)]).optional(),
  symbol: z.union([zodSchemas.symbol, z.array(zodSchemas.symbol)]).optional(),
  exchange: z.union([zodSchemas.exchange, z.array(zodSchemas.exchange)]).optional(),
  segment: z.union([zodSchemas.segment, z.array(zodSchemas.segment)]).optional(),
  tradeType: z.union([zodSchemas.tradeType, z.array(zodSchemas.tradeType)]).optional(),
  position: zodSchemas.position.optional(),
  strategy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  from: zodSchemas.date.optional(),
  to: zodSchemas.date.optional(),
  minPnL: z.number().optional(),
  maxPnL: z.number().optional(),
  brokerId: zodSchemas.objectId.optional(),
  search: z.string().optional(),
  ...createPaginationSchema(['createdAt', 'updatedAt', 'entry.timestamp', 'exit.timestamp', 'pnl.net']).shape,
});

// ============= Auth Schemas =============

export const registerSchema = z.object({
  email: zodSchemas.email,
  username: zodSchemas.username,
  password: zodSchemas.password,
  confirmPassword: z.string(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms and conditions' }) }),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export const loginSchema = z.object({
  email: zodSchemas.email,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: zodSchemas.password,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

export const forgotPasswordSchema = z.object({
  email: zodSchemas.email,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: zodSchemas.password,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

// ============= Validation Functions =============

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    throw ValidationError.fromZodError(result.error);
  }
  
  return result.data;
}

export function validatePartial<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown
): Partial<z.infer<z.ZodObject<T>>> {
  const partialSchema = schema.partial();
  return validate(partialSchema, data);
}

export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ZodIssue[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error.issues };
}

export function formatZodErrors(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

// ============= Custom Validators =============

export function isValidObjectId(value: string): boolean {
  return patterns.objectId.test(value);
}

export function isValidEmail(value: string): boolean {
  return patterns.email.test(value);
}

export function isValidPassword(value: string): boolean {
  return patterns.password.test(value);
}

export function isValidSymbol(value: string): boolean {
  return patterns.symbol.test(value);
}

// ============= Sanitization =============

export function sanitizeString(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

export function sanitizeObject<T extends object>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as object);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// ============= Export All Schemas =============

export const schemas = {
  register: registerSchema,
  login: loginSchema,
  changePassword: changePasswordSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  createTrade: createTradeSchema,
  updateTrade: updateTradeSchema,
  exitTrade: exitTradeSchema,
  tradeQuery: tradeQuerySchema,
  taxes: taxesSchema,
  pagination: createPaginationSchema(),
  dateRange: createDateRangeSchema(),
};

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateTradeInput = z.infer<typeof createTradeSchema>;
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;
export type ExitTradeInput = z.infer<typeof exitTradeSchema>;
export type TradeQueryInput = z.infer<typeof tradeQuerySchema>;
