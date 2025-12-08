/**
 * Date Utilities
 * Based on Part 5 LLD - Utility Modules (dates)
 */

import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

// Initialize plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(weekOfYear);
dayjs.extend(quarterOfYear);
dayjs.extend(customParseFormat);
dayjs.extend(duration);
dayjs.extend(relativeTime);

// ============= Constants =============

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DEFAULT_TIME_FORMAT = 'HH:mm:ss';
export const ISO_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

// Market timings (IST)
export const MARKET_OPEN_TIME = '09:15';
export const MARKET_CLOSE_TIME = '15:30';
export const PRE_MARKET_OPEN = '09:00';
export const POST_MARKET_CLOSE = '16:00';

// ============= Core Functions =============

export function now(): Dayjs {
  return dayjs().tz(DEFAULT_TIMEZONE);
}

export function toDate(input: string | Date | Dayjs | number): Dayjs {
  return dayjs(input).tz(DEFAULT_TIMEZONE);
}

export function toUTC(input: string | Date | Dayjs): Dayjs {
  return dayjs(input).utc();
}

export function fromUTC(input: string | Date | Dayjs): Dayjs {
  return dayjs.utc(input).tz(DEFAULT_TIMEZONE);
}

export function parseDate(dateString: string, format: string = DEFAULT_DATE_FORMAT): Dayjs {
  return dayjs(dateString, format, true).tz(DEFAULT_TIMEZONE);
}

export function formatDate(date: Date | Dayjs | string, format: string = DEFAULT_DATE_FORMAT): string {
  return toDate(date).format(format);
}

export function formatDateTime(date: Date | Dayjs | string): string {
  return toDate(date).format(DEFAULT_DATETIME_FORMAT);
}

export function formatTime(date: Date | Dayjs | string): string {
  return toDate(date).format(DEFAULT_TIME_FORMAT);
}

export function toISO(date: Date | Dayjs | string): string {
  return toDate(date).toISOString();
}

// ============= Date Calculations =============

export function startOfDay(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).startOf('day');
}

export function endOfDay(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).endOf('day');
}

export function startOfWeek(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).startOf('week');
}

export function endOfWeek(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).endOf('week');
}

export function startOfMonth(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).startOf('month');
}

export function endOfMonth(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).endOf('month');
}

export function startOfQuarter(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).startOf('quarter');
}

export function endOfQuarter(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).endOf('quarter');
}

export function startOfYear(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).startOf('year');
}

export function endOfYear(date: Date | Dayjs | string = now()): Dayjs {
  return toDate(date).endOf('year');
}

export function addDays(date: Date | Dayjs | string, days: number): Dayjs {
  return toDate(date).add(days, 'day');
}

export function subtractDays(date: Date | Dayjs | string, days: number): Dayjs {
  return toDate(date).subtract(days, 'day');
}

export function addMonths(date: Date | Dayjs | string, months: number): Dayjs {
  return toDate(date).add(months, 'month');
}

export function subtractMonths(date: Date | Dayjs | string, months: number): Dayjs {
  return toDate(date).subtract(months, 'month');
}

// ============= Comparisons =============

export function isBefore(date1: Date | Dayjs, date2: Date | Dayjs): boolean {
  return toDate(date1).isBefore(toDate(date2));
}

export function isAfter(date1: Date | Dayjs, date2: Date | Dayjs): boolean {
  return toDate(date1).isAfter(toDate(date2));
}

export function isSame(date1: Date | Dayjs, date2: Date | Dayjs, unit: dayjs.OpUnitType = 'day'): boolean {
  return toDate(date1).isSame(toDate(date2), unit);
}

export function isBetweenDates(
  date: Date | Dayjs,
  start: Date | Dayjs,
  end: Date | Dayjs,
  inclusivity: '()' | '[]' | '[)' | '(]' = '[]'
): boolean {
  return toDate(date).isBetween(toDate(start), toDate(end), null, inclusivity);
}

// ============= Duration & Difference =============

export function diffInMinutes(date1: Date | Dayjs, date2: Date | Dayjs): number {
  return Math.abs(toDate(date1).diff(toDate(date2), 'minute'));
}

export function diffInHours(date1: Date | Dayjs, date2: Date | Dayjs): number {
  return Math.abs(toDate(date1).diff(toDate(date2), 'hour'));
}

export function diffInDays(date1: Date | Dayjs, date2: Date | Dayjs): number {
  return Math.abs(toDate(date1).diff(toDate(date2), 'day'));
}

export function diffInMonths(date1: Date | Dayjs, date2: Date | Dayjs): number {
  return Math.abs(toDate(date1).diff(toDate(date2), 'month'));
}

export function durationToMinutes(start: Date | Dayjs, end: Date | Dayjs): number {
  return toDate(end).diff(toDate(start), 'minute');
}

export function formatDuration(minutes: number): string {
  const d = dayjs.duration(minutes, 'minutes');
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    return `${d.hours()}h ${d.minutes()}m`;
  } else {
    return `${d.days()}d ${d.hours()}h`;
  }
}

export function fromNow(date: Date | Dayjs | string): string {
  return toDate(date).fromNow();
}

// ============= Market Hours =============

export function isMarketOpen(date: Date | Dayjs = now()): boolean {
  const d = toDate(date);
  const day = d.day();
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  const time = d.format('HH:mm');
  return time >= MARKET_OPEN_TIME && time <= MARKET_CLOSE_TIME;
}

export function isPreMarket(date: Date | Dayjs = now()): boolean {
  const d = toDate(date);
  const day = d.day();
  
  if (day === 0 || day === 6) return false;
  
  const time = d.format('HH:mm');
  return time >= PRE_MARKET_OPEN && time < MARKET_OPEN_TIME;
}

export function isPostMarket(date: Date | Dayjs = now()): boolean {
  const d = toDate(date);
  const day = d.day();
  
  if (day === 0 || day === 6) return false;
  
  const time = d.format('HH:mm');
  return time > MARKET_CLOSE_TIME && time <= POST_MARKET_CLOSE;
}

export function getNextMarketOpen(from: Date | Dayjs = now()): Dayjs {
  let d = toDate(from);
  
  // If it's before market open today, return today's open
  if (d.format('HH:mm') < MARKET_OPEN_TIME && d.day() !== 0 && d.day() !== 6) {
    return d.set('hour', 9).set('minute', 15).set('second', 0);
  }
  
  // Move to next day
  d = d.add(1, 'day');
  
  // Skip weekends
  while (d.day() === 0 || d.day() === 6) {
    d = d.add(1, 'day');
  }
  
  return d.set('hour', 9).set('minute', 15).set('second', 0);
}

export function getNextMarketClose(from: Date | Dayjs = now()): Dayjs {
  let d = toDate(from);
  
  // If market is open, return today's close
  if (isMarketOpen(d)) {
    return d.set('hour', 15).set('minute', 30).set('second', 0);
  }
  
  // Otherwise, return next trading day's close
  d = getNextMarketOpen(d);
  return d.set('hour', 15).set('minute', 30).set('second', 0);
}

export function isWeekend(date: Date | Dayjs = now()): boolean {
  const day = toDate(date).day();
  return day === 0 || day === 6;
}

export function isWeekday(date: Date | Dayjs = now()): boolean {
  return !isWeekend(date);
}

// ============= Period Helpers =============

export interface DateRange {
  start: Dayjs;
  end: Dayjs;
}

export function getDateRangeForPeriod(period: string, referenceDate: Date | Dayjs = now()): DateRange {
  const ref = toDate(referenceDate);
  
  switch (period) {
    case 'today':
      return { start: startOfDay(ref), end: endOfDay(ref) };
    case 'yesterday':
      return { start: startOfDay(subtractDays(ref, 1)), end: endOfDay(subtractDays(ref, 1)) };
    case 'this_week':
      return { start: startOfWeek(ref), end: endOfWeek(ref) };
    case 'last_week':
      return { start: startOfWeek(subtractDays(ref, 7)), end: endOfWeek(subtractDays(ref, 7)) };
    case 'this_month':
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    case 'last_month':
      return { start: startOfMonth(subtractMonths(ref, 1)), end: endOfMonth(subtractMonths(ref, 1)) };
    case 'this_quarter':
      return { start: startOfQuarter(ref), end: endOfQuarter(ref) };
    case 'this_year':
      return { start: startOfYear(ref), end: endOfYear(ref) };
    case 'last_7_days':
      return { start: startOfDay(subtractDays(ref, 6)), end: endOfDay(ref) };
    case 'last_30_days':
      return { start: startOfDay(subtractDays(ref, 29)), end: endOfDay(ref) };
    case 'last_90_days':
      return { start: startOfDay(subtractDays(ref, 89)), end: endOfDay(ref) };
    case 'last_365_days':
      return { start: startOfDay(subtractDays(ref, 364)), end: endOfDay(ref) };
    default:
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
  }
}

// ============= Financial Year =============

export function getFinancialYear(date: Date | Dayjs = now()): { start: Dayjs; end: Dayjs } {
  const d = toDate(date);
  const month = d.month(); // 0-indexed
  const year = d.year();
  
  if (month < 3) { // Jan, Feb, Mar
    return {
      start: dayjs(`${year - 1}-04-01`).tz(DEFAULT_TIMEZONE),
      end: dayjs(`${year}-03-31`).tz(DEFAULT_TIMEZONE).endOf('day'),
    };
  } else {
    return {
      start: dayjs(`${year}-04-01`).tz(DEFAULT_TIMEZONE),
      end: dayjs(`${year + 1}-03-31`).tz(DEFAULT_TIMEZONE).endOf('day'),
    };
  }
}

export function getFinancialYearLabel(date: Date | Dayjs = now()): string {
  const fy = getFinancialYear(date);
  return `FY ${fy.start.year()}-${fy.end.year().toString().slice(-2)}`;
}

// ============= Trading Days =============

export function getTradingDaysBetween(start: Date | Dayjs, end: Date | Dayjs): number {
  let count = 0;
  let current = toDate(start);
  const endDate = toDate(end);
  
  while (current.isSameOrBefore(endDate, 'day')) {
    if (isWeekday(current)) {
      count++;
    }
    current = current.add(1, 'day');
  }
  
  return count;
}

export function addTradingDays(date: Date | Dayjs, days: number): Dayjs {
  let d = toDate(date);
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;
  
  while (remaining > 0) {
    d = d.add(direction, 'day');
    if (isWeekday(d)) {
      remaining--;
    }
  }
  
  return d;
}
