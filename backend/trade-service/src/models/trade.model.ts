/**
 * Trade Mongoose Model
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import {
  Trade,
  TradeLeg,
  PnL,
  Taxes,
  TradeStatus,
  DEFAULT_PNL,
  DEFAULT_TAXES,
} from '../../../shared/dist/types';

// ============= Trade Document Interface =============

export interface TradeDocument extends Document {
  userId: Types.ObjectId;
  brokerId?: Types.ObjectId;
  brokerTradeId?: string;
  symbol: string;
  exchange: string;
  segment: string;
  instrumentType: string;
  tradeType: string;
  position: string;
  entry: {
    price: number;
    quantity: number;
    timestamp: Date;
    orderType: string;
    brokerage: number;
  };
  exit?: {
    price: number;
    quantity: number;
    timestamp: Date;
    orderType: string;
    brokerage: number;
  };
  status: TradeStatus;
  pnl: {
    gross: number;
    net: number;
    charges: number;
    brokerage: number;
    taxes: Taxes;
    percentageGain: number;
    isProfit: boolean;
  };
  stopLoss?: number;
  target?: number;
  riskRewardRatio?: number;
  entryTime?: string;
  exitTime?: string;
  timeFrame?: string;
  strategy?: string;
  psychology?: string;
  mistake?: string;
  tags: string[];
  notes?: string;
  holdingPeriod?: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  calculatePnL(): typeof DEFAULT_PNL;
}

export interface TradeModel extends Model<TradeDocument> {
  findByUser(userId: string, options?: { status?: TradeStatus; limit?: number; skip?: number }): Promise<TradeDocument[]>;
  findBySymbol(userId: string, symbol: string): Promise<TradeDocument[]>;
  getOpenTrades(userId: string): Promise<TradeDocument[]>;
  getTradeSummary(userId: string, dateRange?: { from: Date; to: Date }): Promise<any>;
}

// ============= Trade Leg Schema =============

const tradeLegSchema = new Schema(
  {
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    timestamp: { type: Date, required: true, default: Date.now },
    orderType: { 
      type: String, 
      enum: ['market', 'limit', 'stop_loss', 'trailing_stop'],
      default: 'market'
    },
    brokerage: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ============= Taxes Schema =============

const taxesSchema = new Schema(
  {
    stt: { type: Number, default: 0, min: 0 },
    stampDuty: { type: Number, default: 0, min: 0 },
    gst: { type: Number, default: 0, min: 0 },
    sebiTurnover: { type: Number, default: 0, min: 0 },
    exchangeTxn: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ============= P&L Schema =============

const pnlSchema = new Schema(
  {
    gross: { type: Number, required: false },
    net: { type: Number, required: false },
    charges: { type: Number, required: false },
    brokerage: { type: Number, required: false },
    taxes: { type: taxesSchema, default: () => ({ ...DEFAULT_TAXES }) },
    percentageGain: { type: Number, required: false },
    isProfit: { type: Boolean, default: false },
  },
  { _id: false, minimize: false }
);

// ============= Trade Schema =============

const tradeSchema = new Schema<TradeDocument, TradeModel>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true,
    },
    brokerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'BrokerAccount',
    },
    brokerTradeId: { type: String },
    
    // Instrument Details
    symbol: { 
      type: String, 
      required: true, 
      uppercase: true,
      trim: true,
      index: true,
    },
    exchange: { 
      type: String, 
      enum: ['NSE', 'BSE', 'MCX', 'NFO'],
      required: true,
    },
    segment: { 
      type: String, 
      enum: ['equity', 'futures', 'options', 'commodity'],
      default: 'equity',
    },
    instrumentType: { 
      type: String, 
      enum: ['stock', 'future', 'call', 'put', 'commodity'],
      default: 'stock',
    },
    
    // Trade Details
    tradeType: { 
      type: String, 
      enum: ['intraday', 'delivery', 'swing'],
      required: true,
    },
    position: { 
      type: String, 
      enum: ['long', 'short'],
      required: true,
    },
    
    // Entry & Exit
    entry: { type: tradeLegSchema, required: true },
    exit: { type: tradeLegSchema },
    
    // Status
    status: { 
      type: String, 
      enum: ['open', 'closed', 'partial', 'cancelled'],
      default: 'open',
      index: true,
    },
    
    // P&L
    pnl: { type: pnlSchema },
    
    // Risk Management
    stopLoss: { type: Number },
    target: { type: Number },
    riskRewardRatio: { type: Number },
    
    // Time fields (HH:mm format for intraday display)
    entryTime: { type: String, maxlength: 10 },
    exitTime: { type: String, maxlength: 10 },
    timeFrame: { type: String, maxlength: 20 },
    
    // Metadata
    strategy: { type: String, maxlength: 100 },
    psychology: { type: String, maxlength: 200 },
    mistake: { type: String, maxlength: 200 },
    tags: [{ type: String, maxlength: 50 }],
    notes: { type: String, maxlength: 2000 },
    
    // Calculated Fields
    holdingPeriod: { type: Number }, // in minutes
    
    // Soft Delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ============= Indexes =============

tradeSchema.index({ userId: 1, createdAt: -1 });
tradeSchema.index({ userId: 1, status: 1 });
tradeSchema.index({ userId: 1, symbol: 1 });
tradeSchema.index({ userId: 1, 'entry.timestamp': -1 });
tradeSchema.index({ userId: 1, tradeType: 1, status: 1 });
tradeSchema.index({ brokerTradeId: 1 }, { sparse: true });

// ============= Instance Methods =============

tradeSchema.methods.calculatePnL = function(): PnL {
  if (!this.exit || this.status === 'open') {
    return { ...DEFAULT_PNL };
  }
  
  const entryValue = this.entry.price * this.entry.quantity;
  const exitValue = this.exit.price * this.exit.quantity;
  
  let gross: number;
  if (this.position === 'long') {
    gross = exitValue - entryValue;
  } else {
    gross = entryValue - exitValue;
  }
  
  const brokerage = (this.entry.brokerage || 0) + (this.exit.brokerage || 0);
  
  const taxes = this.pnl?.taxes || { ...DEFAULT_TAXES };
  const totalTaxes = Object.values(taxes).reduce((sum: number, val) => sum + (val as number || 0), 0);
  
  const charges = brokerage + totalTaxes;
  const net = gross - charges;
  
  const percentageGain = entryValue > 0 ? (net / entryValue) * 100 : 0;
  
  return {
    gross: Math.round(gross * 100) / 100,
    net: Math.round(net * 100) / 100,
    charges: Math.round(charges * 100) / 100,
    brokerage: Math.round(brokerage * 100) / 100,
    taxes,
    percentageGain: Math.round(percentageGain * 100) / 100,
    isProfit: net > 0,
  } as any;
};

// ============= Pre-save Hook =============

tradeSchema.pre('save', function(next) {
  // Calculate P&L if trade is closed
  if (this.exit && this.status === 'closed') {
    const calculatedPnl = this.calculatePnL();
    console.log('Calculated PnL:', JSON.stringify(calculatedPnl, null, 2));
    
    // Update ALL P&L fields including net and charges
    this.pnl.gross = calculatedPnl.gross;
    this.pnl.net = calculatedPnl.net;
    this.pnl.charges = calculatedPnl.charges;
    this.pnl.brokerage = calculatedPnl.brokerage || 0;
    this.pnl.percentageGain = calculatedPnl.percentageGain;
    this.pnl.isProfit = calculatedPnl.isProfit;
    if (calculatedPnl.taxes) {
      this.pnl.taxes = calculatedPnl.taxes;
    }
    
    console.log('After assignment - this.pnl:', JSON.stringify(this.pnl, null, 2));
  }
  
  // Calculate holding period
  if (this.exit?.timestamp && this.entry.timestamp) {
    const entryTime = new Date(this.entry.timestamp).getTime();
    const exitTime = new Date(this.exit.timestamp).getTime();
    this.holdingPeriod = Math.round((exitTime - entryTime) / (1000 * 60)); // minutes
  }
  
  // Calculate risk-reward ratio
  if (this.stopLoss && this.target && this.entry) {
    const entryPrice = this.entry.price;
    const risk = Math.abs(entryPrice - this.stopLoss);
    const reward = Math.abs(this.target - entryPrice);
    this.riskRewardRatio = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  }
  
  next();
});

// ============= Static Methods =============

tradeSchema.statics.findByUser = async function(
  userId: string,
  options: { status?: TradeStatus; limit?: number; skip?: number } = {}
): Promise<TradeDocument[]> {
  const query: any = { userId, isDeleted: false };
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

tradeSchema.statics.findBySymbol = async function(
  userId: string,
  symbol: string
): Promise<TradeDocument[]> {
  return this.find({ 
    userId, 
    symbol: symbol.toUpperCase(), 
    isDeleted: false 
  }).sort({ createdAt: -1 });
};

tradeSchema.statics.getOpenTrades = async function(userId: string): Promise<TradeDocument[]> {
  return this.find({ 
    userId, 
    status: 'open', 
    isDeleted: false 
  }).sort({ 'entry.timestamp': -1 });
};

tradeSchema.statics.getTradeSummary = async function(
  userId: string,
  dateRange?: { from: Date; to: Date }
): Promise<any> {
  const match: any = { userId: new Types.ObjectId(userId), isDeleted: false };
  
  if (dateRange) {
    match['entry.timestamp'] = {
      $gte: dateRange.from,
      $lte: dateRange.to,
    };
  }
  
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalTrades: { $sum: 1 },
        openTrades: { 
          $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } 
        },
        closedTrades: { 
          $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } 
        },
        totalGrossPnL: { $sum: '$pnl.gross' },
        // Use gross as net (charges are 0 anyway)
        totalNetPnL: { $sum: '$pnl.gross' },
        totalCharges: { $sum: 0 },
        winningTrades: { 
          $sum: { $cond: [{ $gt: ['$pnl.gross', 0] }, 1, 0] } 
        },
        losingTrades: { 
          $sum: { $cond: [{ $lt: ['$pnl.gross', 0] }, 1, 0] } 
        },
        avgHoldingPeriod: { $avg: '$holdingPeriod' },
      }
    }
  ]);
  
  return result[0] || {
    totalTrades: 0,
    openTrades: 0,
    closedTrades: 0,
    totalGrossPnL: 0,
    totalNetPnL: 0,
    totalCharges: 0,
    winningTrades: 0,
    losingTrades: 0,
    avgHoldingPeriod: 0,
  };
};

export const TradeModel = mongoose.model<TradeDocument, TradeModel>('Trade', tradeSchema);
