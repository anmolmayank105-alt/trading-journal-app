/**
 * Cryptography Utilities
 * Based on Part 6 LLD - Token Encryption (AES-256-GCM with HKDF)
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

// ============= Constants =============

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const BCRYPT_ROUNDS = 12;
const HKDF_INFO = 'stock-tracker-token-encryption';

// ============= Encrypted Token Structure =============

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string;
  version: number;
}

// ============= Key Derivation =============

/**
 * Derive encryption key from master key using HKDF
 */
export function deriveKey(masterKey: string, salt: Buffer): Buffer {
  const derived = crypto.hkdfSync(
    'sha256',
    Buffer.from(masterKey),
    salt,
    Buffer.from(HKDF_INFO),
    KEY_LENGTH
  );
  return Buffer.from(derived);
}

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Generate a cryptographically secure random IV
 */
export function generateIV(): Buffer {
  return crypto.randomBytes(IV_LENGTH);
}

// ============= Encryption =============

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(plaintext: string, masterKey: string): EncryptedData {
  const salt = generateSalt();
  const iv = generateIV();
  const key = deriveKey(masterKey, salt);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  const tag = cipher.getAuthTag();
  
  return {
    ciphertext,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    salt: salt.toString('base64'),
    version: 1,
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encrypted: EncryptedData, masterKey: string): string {
  const salt = Buffer.from(encrypted.salt, 'base64');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const key = deriveKey(masterKey, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  
  decipher.setAuthTag(tag);
  
  let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}

/**
 * Encrypt to string (for storage)
 */
export function encryptToString(plaintext: string, masterKey: string): string {
  const encrypted = encrypt(plaintext, masterKey);
  return JSON.stringify(encrypted);
}

/**
 * Decrypt from string
 */
export function decryptFromString(encryptedString: string, masterKey: string): string {
  const encrypted = JSON.parse(encryptedString) as EncryptedData;
  return decrypt(encrypted, masterKey);
}

// ============= Password Hashing =============

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash password synchronously (for migration scripts)
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Verify password synchronously
 */
export function verifyPasswordSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// ============= Token Generation =============

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a URL-safe token
 */
export function generateUrlSafeToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate a numeric OTP
 */
export function generateOTP(length: number = 6): string {
  const max = Math.pow(10, length);
  const otp = crypto.randomInt(0, max);
  return otp.toString().padStart(length, '0');
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
  return `sess_${generateUrlSafeToken(24)}`;
}

/**
 * Generate a correlation ID
 */
export function generateCorrelationId(): string {
  return `req_${Date.now().toString(36)}_${generateToken(8)}`;
}

// ============= Hashing =============

/**
 * Create SHA-256 hash
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create SHA-512 hash
 */
export function sha512(data: string): string {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Create HMAC-SHA256
 */
export function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Create MD5 hash (for non-cryptographic purposes like cache keys)
 */
export function md5(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

// ============= Comparison =============

/**
 * Timing-safe comparison for tokens
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ============= Masking =============

/**
 * Mask sensitive data (show only last N characters)
 */
export function maskString(str: string, visibleChars: number = 4): string {
  if (str.length <= visibleChars) {
    return '*'.repeat(str.length);
  }
  return '*'.repeat(str.length - visibleChars) + str.slice(-visibleChars);
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return maskString(email);
  
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '*'.repeat(local.length);
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '*'.repeat(cleaned.length);
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

// ============= Token Encryption for Broker Tokens =============

export interface BrokerTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

/**
 * Encrypt broker tokens for storage
 */
export function encryptBrokerTokens(tokens: BrokerTokenData, masterKey: string): string {
  const data = JSON.stringify({
    ...tokens,
    expiresAt: tokens.expiresAt.toISOString(),
  });
  return encryptToString(data, masterKey);
}

/**
 * Decrypt broker tokens from storage
 */
export function decryptBrokerTokens(encrypted: string, masterKey: string): BrokerTokenData {
  const decrypted = decryptFromString(encrypted, masterKey);
  const data = JSON.parse(decrypted);
  return {
    ...data,
    expiresAt: new Date(data.expiresAt),
  };
}
