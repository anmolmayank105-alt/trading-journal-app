/**
 * Pagination Utilities
 * Based on Part 5 LLD - Utility Modules (pagination)
 */

import { PaginationParams, PaginatedResult, SortOptions } from '../types';

// ============= Constants =============

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const DEFAULT_SORT_FIELD = 'createdAt';
export const DEFAULT_SORT_ORDER = 'desc';

// ============= Pagination Options =============

export interface ParsedPaginationOptions {
  page: number;
  limit: number;
  skip: number;
  sort: SortOptions;
  sortObject: Record<string, 1 | -1>;
}

// ============= Parse Pagination =============

export function parsePaginationParams(params: PaginationParams): ParsedPaginationOptions {
  const page = Math.max(1, params.page || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  
  const sortBy = params.sortBy || DEFAULT_SORT_FIELD;
  const sortOrder = params.sortOrder || DEFAULT_SORT_ORDER;
  
  return {
    page,
    limit,
    skip,
    sort: { field: sortBy, order: sortOrder },
    sortObject: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
  };
}

// ============= Create Paginated Result =============

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ============= Empty Paginated Result =============

export function emptyPaginatedResult<T>(): PaginatedResult<T> {
  return {
    data: [],
    pagination: {
      page: 1,
      limit: DEFAULT_LIMIT,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
  };
}

// ============= Pagination Links =============

export interface PaginationLinks {
  self: string;
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

export function generatePaginationLinks(
  baseUrl: string,
  page: number,
  limit: number,
  totalPages: number
): PaginationLinks {
  const buildUrl = (p: number) => {
    const url = new URL(baseUrl);
    url.searchParams.set('page', p.toString());
    url.searchParams.set('limit', limit.toString());
    return url.toString();
  };
  
  return {
    self: buildUrl(page),
    first: buildUrl(1),
    last: buildUrl(totalPages),
    prev: page > 1 ? buildUrl(page - 1) : null,
    next: page < totalPages ? buildUrl(page + 1) : null,
  };
}

// ============= Cursor Pagination =============

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginatedResult<T> {
  data: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
}

export function encodeCursor(value: string | number | Date): string {
  const strValue = value instanceof Date ? value.toISOString() : String(value);
  return Buffer.from(strValue).toString('base64url');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

export function createCursorPaginatedResult<T extends { _id?: unknown }>(
  data: T[],
  hasMore: boolean,
  getCursor: (item: T) => string
): CursorPaginatedResult<T> {
  return {
    data,
    pageInfo: {
      hasNextPage: hasMore,
      hasPreviousPage: false, // Would need to be calculated based on direction
      startCursor: data.length > 0 ? getCursor(data[0]) : null,
      endCursor: data.length > 0 ? getCursor(data[data.length - 1]) : null,
    },
  };
}

// ============= Offset Calculation =============

export function calculateOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

export function calculatePage(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}

// ============= MongoDB Aggregation Helpers =============

export function paginationPipeline(options: ParsedPaginationOptions) {
  return [
    { $skip: options.skip },
    { $limit: options.limit },
  ];
}

export function sortPipeline(options: ParsedPaginationOptions) {
  return [{ $sort: options.sortObject }];
}

export function countPipeline() {
  return [{ $count: 'total' }];
}

// ============= Faceted Pagination =============

export function facetedPaginationPipeline(options: ParsedPaginationOptions) {
  return [
    {
      $facet: {
        data: [
          { $sort: options.sortObject },
          { $skip: options.skip },
          { $limit: options.limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
    {
      $project: {
        data: 1,
        total: { $arrayElemAt: ['$total.count', 0] },
      },
    },
  ];
}

// ============= Parse Query Parameters =============

export function parseQueryParams(query: Record<string, unknown>): PaginationParams {
  return {
    page: query.page ? parseInt(String(query.page), 10) : undefined,
    limit: query.limit ? parseInt(String(query.limit), 10) : undefined,
    sortBy: query.sortBy ? String(query.sortBy) : undefined,
    sortOrder: query.sortOrder === 'asc' || query.sortOrder === 'desc' 
      ? query.sortOrder 
      : undefined,
  };
}
