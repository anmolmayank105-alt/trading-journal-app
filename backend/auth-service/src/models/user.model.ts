/**
 * User Mongoose Model
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  User,
  UserPreferences,
  Subscription,
  DEFAULT_USER_PREFERENCES,
} from '@stock-tracker/shared/types';
import { hashPassword, verifyPassword } from '@stock-tracker/shared/utils';

// ============= User Document Interface =============

export interface UserDocument extends Omit<User, '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeObject(): Omit<User, 'passwordHash'>;
}

// ============= User Model Interface =============

export interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
}

// ============= Subscription Schema =============

const subscriptionSchema = new Schema<Subscription>(
  {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'trial'],
      default: 'active',
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    trialEndsAt: { type: Date },
    cancelledAt: { type: Date },
    features: [String],
  },
  { _id: false }
);

// ============= Notification Preferences Schema =============

const notificationPreferencesSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    priceAlerts: { type: Boolean, default: true },
    tradeAlerts: { type: Boolean, default: true },
    syncAlerts: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: true },
  },
  { _id: false }
);

// ============= User Preferences Schema =============

const userPreferencesSchema = new Schema<UserPreferences>(
  {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    language: { type: String, default: 'en' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    notifications: { type: notificationPreferencesSchema, default: () => ({}) },
    defaultBroker: { type: Schema.Types.ObjectId, ref: 'BrokerAccount' },
    defaultExchange: { type: String },
    dashboardLayout: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

// ============= Broker Account Reference Schema =============

const brokerAccountRefSchema = new Schema(
  {
    brokerId: { type: Schema.Types.ObjectId, ref: 'BrokerAccount', required: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

// ============= User Schema =============

const userSchema = new Schema<UserDocument, UserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must not exceed 30 characters'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Don't include in queries by default
    },
    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
    phone: { type: String, trim: true },
    avatar: { type: String },
    roles: {
      type: [String],
      enum: ['user', 'admin', 'premium', 'analyst'],
      default: ['user'],
    },
    verified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    preferences: {
      type: userPreferencesSchema,
      default: () => ({ ...DEFAULT_USER_PREFERENCES }),
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({
        plan: 'free',
        status: 'active',
        startDate: new Date(),
      }),
    },
    brokerAccounts: [brokerAccountRefSchema],
    lastLoginAt: { type: Date },
    lastLoginIP: { type: String },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.verificationToken;
        delete ret.verificationExpires;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      },
    },
  }
);

// ============= Indexes =============

userSchema.index({ isActive: 1, isDeleted: 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ lastLoginAt: -1 });
userSchema.index({ createdAt: -1 });

// ============= Pre-save Hooks =============

userSchema.pre('save', async function (next) {
  // Only hash password if it's been modified
  if (!this.isModified('passwordHash')) {
    return next();
  }
  
  try {
    // Password is already plain text when setting, hash it
    this.passwordHash = await hashPassword(this.passwordHash);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// ============= Instance Methods =============

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // Need to explicitly select passwordHash since it's excluded by default
  const user = await (this.constructor as UserModel)
    .findById(this._id)
    .select('+passwordHash');
  
  if (!user) return false;
  return verifyPassword(candidatePassword, user.passwordHash);
};

userSchema.methods.toSafeObject = function (): Omit<User, 'passwordHash'> {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.verificationToken;
  delete obj.verificationExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// ============= Static Methods =============

userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase(), isDeleted: false });
};

userSchema.statics.findByUsername = function (username: string) {
  return this.findOne({ username, isDeleted: false });
};

// ============= Virtual Fields =============

userSchema.virtual('fullName').get(function () {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.username;
});

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// ============= Export Model =============

export const UserModel = mongoose.model<UserDocument, UserModel>('User', userSchema);
