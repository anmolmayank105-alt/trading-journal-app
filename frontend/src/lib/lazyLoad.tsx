import dynamic from 'next/dynamic';
import React, { ComponentType } from 'react';

/**
 * ⚡ OPTIMIZATION: Helper for lazy loading heavy components
 * Reduces initial bundle size by code splitting
 */

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

// Card skeleton loader
const CardSkeleton = () => (
  <div className="card">
    <div className="h-64 bg-slate-800/50 rounded-xl animate-pulse" />
  </div>
);

// Grid skeleton loader
const GridSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Lazy load a component with custom loading state
 */
export function lazyLoad<P extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingComponent?: ComponentType
): ComponentType<P> {
  return dynamic(importFn, {
    ssr: false,
    loading: loadingComponent || LoadingSpinner,
  }) as ComponentType<P>;
}

/**
 * Lazy load charts with proper skeleton
 */
export function lazyLoadChart<P extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<P> }>
): ComponentType<P> {
  return dynamic(importFn, {
    ssr: false,
    loading: CardSkeleton,
  }) as ComponentType<P>;
}

/**
 * Lazy load with grid skeleton
 */
export function lazyLoadWithGrid<P extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  gridCount = 3
): ComponentType<P> {
  return dynamic(importFn, {
    ssr: false,
    loading: () => <GridSkeleton count={gridCount} />,
  }) as ComponentType<P>;
}
