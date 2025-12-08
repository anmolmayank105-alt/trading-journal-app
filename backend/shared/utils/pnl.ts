/**
 * P&L Calculation Utilities
 * Based on Part 5 LLD - Utility Modules (pnl)
 */

import { Taxes, PnL, DEFAULT_PNL } from '../types';

// ============= Tax Rates (India) =============

export const TAX_RATES = {
  // Securities Transaction Tax (STT)
  STT_DELIVERY_BUY: 0.001, // 0.1%
  STT_DELIVERY_SELL: 0.001, // 0.1%
  STT_INTRADAY: 0.00025, // 0.025% on sell side only
  STT_FUTURES: 0.0001, // 0.01% on sell side only
  STT_OPTIONS_BUY: 0, // No STT on buy
  STT_OPTIONS_SELL: 0.0005, // 0.05% on sell (on premium)
  
  // Stamp Duty (varies by state, using standard)
  STAMP_DUTY_BUY: 0.00015, // 0.015% on buy side
  STAMP_DUTY_SELL: 0, // No stamp duty on sell
  
  // GST on brokerage
  GST: 0.18, // 18%
  
  // SEBI Turnover Fee
  SEBI_TURNOVER: 0.000001, // ₹1 per crore (0.0001%)
  
  // Exchange Transaction Charges
  NSE_EQUITY: 0.0000345, // 0.00345%
  BSE_EQUITY: 0.0000375, // 0.00375%
  NSE_FUTURES: 0.0000190, // 0.0019%
  NSE_OPTIONS: 0.0005300, // 0.053% (on premium)
} as const;

// ============= Brokerage Rates =============

export const BROKERAGE_RATES = {
  ZERODHA: {
    DELIVERY: 0, // Free
    INTRADAY: 0.0003, // 0.03% or ₹20 per order, whichever is lower
    INTRADAY_MAX: 20,
    FUTURES: 0.0003, // 0.03% or ₹20 per order
    FUTURES_MAX: 20,
    OPTIONS_FLAT: 20, // Flat ₹20 per order
  },
  UPSTOX: {
    DELIVERY: 0, // Free (varies by plan)
    INTRADAY: 0.0003, // 0.03% or ₹20 per order
    INTRADAY_MAX: 20,
    FUTURES: 0.0003,
    FUTURES_MAX: 20,
    OPTIONS_FLAT: 20,
  },
  DEFAULT: {
    DELIVERY: 0.001, // 0.1%
    INTRADAY: 0.0003,
    INTRADAY_MAX: 20,
  },
} as const;

// ============= P&L Calculation Interface =============

export interface PnLCalculationInput {
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  position: 'long' | 'short';
  tradeType: 'intraday' | 'delivery' | 'swing';
  segment: 'equity' | 'futures' | 'options' | 'commodity';
  exchange?: 'NSE' | 'BSE' | 'MCX' | 'NFO';
  broker?: 'zerodha' | 'upstox' | 'default';
  entryBrokerage?: number;
  exitBrokerage?: number;
  entryTaxes?: Partial<Taxes>;
  exitTaxes?: Partial<Taxes>;
}

export interface PnLResult extends PnL {
  investment: number;
  entryValue: number;
  exitValue: number;
  entryCharges: Charges;
  exitCharges: Charges;
  totalCharges: Charges;
  breakEvenPrice: number;
  returnOnInvestment: number;
}

export interface Charges {
  brokerage: number;
  stt: number;
  stampDuty: number;
  gst: number;
  sebiTurnover: number;
  exchangeTxn: number;
  total: number;
}

// ============= Core Calculation Functions =============

export function calculateGrossPnL(
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  position: 'long' | 'short'
): number {
  const multiplier = position === 'long' ? 1 : -1;
  return multiplier * (exitPrice - entryPrice) * quantity;
}

export function calculateBrokerage(
  tradeValue: number,
  tradeType: 'intraday' | 'delivery' | 'swing',
  segment: 'equity' | 'futures' | 'options' | 'commodity',
  broker: 'zerodha' | 'upstox' | 'default' = 'default'
): number {
  const rates = BROKERAGE_RATES[broker.toUpperCase() as keyof typeof BROKERAGE_RATES] || BROKERAGE_RATES.DEFAULT;
  
  if (segment === 'options') {
    return 'OPTIONS_FLAT' in rates ? rates.OPTIONS_FLAT : 20;
  }
  
  if (tradeType === 'delivery') {
    return tradeValue * (rates.DELIVERY || 0);
  }
  
  if (segment === 'futures' && 'FUTURES' in rates) {
    const brokeragePercent = tradeValue * rates.FUTURES;
    return Math.min(brokeragePercent, rates.FUTURES_MAX);
  }
  
  // Intraday/Swing equity
  const brokeragePercent = tradeValue * rates.INTRADAY;
  return Math.min(brokeragePercent, rates.INTRADAY_MAX);
}

export function calculateSTT(
  tradeValue: number,
  side: 'buy' | 'sell',
  tradeType: 'intraday' | 'delivery' | 'swing',
  segment: 'equity' | 'futures' | 'options' | 'commodity'
): number {
  if (segment === 'commodity') return 0;
  
  if (segment === 'options') {
    return side === 'sell' ? tradeValue * TAX_RATES.STT_OPTIONS_SELL : 0;
  }
  
  if (segment === 'futures') {
    return side === 'sell' ? tradeValue * TAX_RATES.STT_FUTURES : 0;
  }
  
  // Equity
  if (tradeType === 'delivery') {
    return tradeValue * TAX_RATES.STT_DELIVERY_SELL;
  }
  
  // Intraday - STT only on sell side
  return side === 'sell' ? tradeValue * TAX_RATES.STT_INTRADAY : 0;
}

export function calculateStampDuty(
  tradeValue: number,
  side: 'buy' | 'sell'
): number {
  return side === 'buy' ? tradeValue * TAX_RATES.STAMP_DUTY_BUY : 0;
}

export function calculateGST(brokerage: number): number {
  return brokerage * TAX_RATES.GST;
}

export function calculateSebiTurnover(tradeValue: number): number {
  return tradeValue * TAX_RATES.SEBI_TURNOVER;
}

export function calculateExchangeTxn(
  tradeValue: number,
  exchange: 'NSE' | 'BSE' | 'MCX' | 'NFO',
  segment: 'equity' | 'futures' | 'options' | 'commodity'
): number {
  if (segment === 'options') {
    return tradeValue * TAX_RATES.NSE_OPTIONS;
  }
  
  if (segment === 'futures') {
    return tradeValue * TAX_RATES.NSE_FUTURES;
  }
  
  // Equity
  return exchange === 'BSE' 
    ? tradeValue * TAX_RATES.BSE_EQUITY 
    : tradeValue * TAX_RATES.NSE_EQUITY;
}

export function calculateCharges(
  tradeValue: number,
  side: 'buy' | 'sell',
  tradeType: 'intraday' | 'delivery' | 'swing',
  segment: 'equity' | 'futures' | 'options' | 'commodity',
  exchange: 'NSE' | 'BSE' | 'MCX' | 'NFO' = 'NSE',
  broker: 'zerodha' | 'upstox' | 'default' = 'default',
  customBrokerage?: number
): Charges {
  const brokerage = customBrokerage ?? calculateBrokerage(tradeValue, tradeType, segment, broker);
  const stt = calculateSTT(tradeValue, side, tradeType, segment);
  const stampDuty = calculateStampDuty(tradeValue, side);
  const gst = calculateGST(brokerage);
  const sebiTurnover = calculateSebiTurnover(tradeValue);
  const exchangeTxn = calculateExchangeTxn(tradeValue, exchange, segment);
  
  return {
    brokerage: Math.round(brokerage * 100) / 100,
    stt: Math.round(stt * 100) / 100,
    stampDuty: Math.round(stampDuty * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    sebiTurnover: Math.round(sebiTurnover * 100) / 100,
    exchangeTxn: Math.round(exchangeTxn * 100) / 100,
    total: Math.round((brokerage + stt + stampDuty + gst + sebiTurnover + exchangeTxn) * 100) / 100,
  };
}

// ============= Complete P&L Calculation =============

export function calculatePnL(input: PnLCalculationInput): PnLResult {
  const {
    entryPrice,
    exitPrice,
    quantity,
    position,
    tradeType,
    segment,
    exchange = 'NSE',
    broker = 'default',
    entryBrokerage,
    exitBrokerage,
  } = input;
  
  const entryValue = entryPrice * quantity;
  const exitValue = exitPrice * quantity;
  const investment = entryValue;
  
  // Calculate gross P&L
  const grossPnL = calculateGrossPnL(entryPrice, exitPrice, quantity, position);
  
  // Calculate entry charges
  const entryCharges = calculateCharges(
    entryValue,
    'buy',
    tradeType,
    segment,
    exchange,
    broker,
    entryBrokerage
  );
  
  // Calculate exit charges
  const exitCharges = calculateCharges(
    exitValue,
    'sell',
    tradeType,
    segment,
    exchange,
    broker,
    exitBrokerage
  );
  
  // Total charges
  const totalCharges: Charges = {
    brokerage: entryCharges.brokerage + exitCharges.brokerage,
    stt: entryCharges.stt + exitCharges.stt,
    stampDuty: entryCharges.stampDuty + exitCharges.stampDuty,
    gst: entryCharges.gst + exitCharges.gst,
    sebiTurnover: entryCharges.sebiTurnover + exitCharges.sebiTurnover,
    exchangeTxn: entryCharges.exchangeTxn + exitCharges.exchangeTxn,
    total: entryCharges.total + exitCharges.total,
  };
  
  // Net P&L
  const netPnL = grossPnL - totalCharges.total;
  
  // Percentage
  const percentage = investment > 0 ? (netPnL / investment) * 100 : 0;
  
  // Return on Investment
  const returnOnInvestment = investment > 0 ? (netPnL / investment) * 100 : 0;
  
  // Break-even price
  const chargesPerShare = totalCharges.total / quantity;
  const breakEvenPrice = position === 'long'
    ? entryPrice + chargesPerShare
    : entryPrice - chargesPerShare;
  
  return {
    gross: Math.round(grossPnL * 100) / 100,
    net: Math.round(netPnL * 100) / 100,
    percentageGain: Math.round(percentage * 100) / 100,
    charges: Math.round(totalCharges.total * 100) / 100,
    brokerage: Math.round(totalCharges.brokerage * 100) / 100,
    taxes: {
      stt: totalCharges.stt,
      stampDuty: totalCharges.stampDuty,
      gst: totalCharges.gst,
      sebiTurnover: totalCharges.sebiTurnover,
      exchangeTxn: totalCharges.exchangeTxn,
    },
    isProfit: netPnL > 0,
    investment: Math.round(investment * 100) / 100,
    entryValue: Math.round(entryValue * 100) / 100,
    exitValue: Math.round(exitValue * 100) / 100,
    entryCharges,
    exitCharges,
    totalCharges,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    returnOnInvestment: Math.round(returnOnInvestment * 100) / 100,
  };
}

// ============= Unrealized P&L =============

export function calculateUnrealizedPnL(
  entryPrice: number,
  currentPrice: number,
  quantity: number,
  position: 'long' | 'short'
): { unrealizedPnL: number; unrealizedPercent: number } {
  const multiplier = position === 'long' ? 1 : -1;
  const unrealizedPnL = multiplier * (currentPrice - entryPrice) * quantity;
  const investment = entryPrice * quantity;
  const unrealizedPercent = investment > 0 ? (unrealizedPnL / investment) * 100 : 0;
  
  return {
    unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
    unrealizedPercent: Math.round(unrealizedPercent * 100) / 100,
  };
}

// ============= Risk/Reward Calculation =============

export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLoss: number,
  target: number,
  position: 'long' | 'short'
): number {
  if (position === 'long') {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(target - entryPrice);
    return risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  } else {
    const risk = Math.abs(stopLoss - entryPrice);
    const reward = Math.abs(entryPrice - target);
    return risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;
  }
}

// ============= Position Sizing =============

export function calculatePositionSize(
  capital: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number
): { quantity: number; riskAmount: number } {
  const riskAmount = capital * (riskPercent / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const quantity = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  
  return {
    quantity,
    riskAmount: Math.round(riskAmount * 100) / 100,
  };
}

// ============= Aggregate P&L =============

export function aggregatePnL(trades: PnL[]): PnL {
  const aggregated = trades.reduce(
    (acc, trade) => ({
      gross: acc.gross + trade.gross,
      net: acc.net + trade.net,
      charges: acc.charges + trade.charges,
      brokerage: acc.brokerage + (trade.brokerage || 0),
      taxes: acc.taxes,
      percentageGain: 0,
      isProfit: false,
    }),
    { ...DEFAULT_PNL }
  );
  
  // Calculate aggregate percentage and profit status
  aggregated.isProfit = aggregated.net > 0;
  
  return aggregated;
}

// ============= Taxes from Charges =============

export function chargesToTaxes(charges: Charges): Taxes {
  return {
    stt: charges.stt,
    stampDuty: charges.stampDuty,
    gst: charges.gst,
    sebiTurnover: charges.sebiTurnover,
    exchangeTxn: charges.exchangeTxn,
  };
}
