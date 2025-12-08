/**
 * Watchlist Model
 * User's saved watchlists
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchlistItem {
  symbol: string;
  exchange: string;
  segment: string;
  addedAt: Date;
}

export interface IWatchlist extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  items: IWatchlistItem[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WatchlistItemSchema = new Schema<IWatchlistItem>(
  {
    symbol: { type: String, required: true },
    exchange: { type: String, required: true },
    segment: { type: String, default: 'equity' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WatchlistSchema = new Schema<IWatchlist>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    items: {
      type: [WatchlistItemSchema],
      default: [],
      validate: {
        validator: function(v: IWatchlistItem[]) {
          return v.length <= 50; // Max 50 items per watchlist
        },
        message: 'Watchlist can have maximum 50 items',
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index
WatchlistSchema.index({ userId: 1, name: 1 }, { unique: true });

export const WatchlistModel = mongoose.model<IWatchlist>('Watchlist', WatchlistSchema);
