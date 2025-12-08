/**
 * ⚡ Performance Monitoring Utilities
 * Track and log performance metrics for optimization
 */

import React from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private history: PerformanceMetric[] = [];
  private enabled: boolean = process.env.NODE_ENV === 'development';

  /**
   * Start timing an operation
   */
  start(label: string): void {
    if (!this.enabled) return;
    this.metrics.set(label, performance.now());
  }

  /**
   * End timing and log result
   */
  end(label: string): number | null {
    if (!this.enabled) return null;
    
    const startTime = this.metrics.get(label);
    if (!startTime) {
      console.warn(`⚠️ No start time found for: ${label}`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.metrics.delete(label);

    // Store in history
    this.history.push({
      name: label,
      duration,
      timestamp: Date.now(),
    });

    // Keep only last 100 metrics
    if (this.history.length > 100) {
      this.history.shift();
    }

    // Log performance
    const color = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴';
    console.log(`${color} ${label}: ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Get average duration for a metric
   */
  getAverage(label: string): number {
    const metrics = this.history.filter(m => m.name === label);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  /**
   * Get all metrics for reporting
   */
  getReport(): Record<string, { avg: number; count: number; min: number; max: number }> {
    const report: Record<string, { avg: number; count: number; min: number; max: number }> = {};

    // Group by label
    const grouped = this.history.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.duration);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate stats
    Object.entries(grouped).forEach(([name, durations]) => {
      report[name] = {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        count: durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
      };
    });

    return report;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.history = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring function performance
 */
export function measurePerformance(label?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const metricLabel = label || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      perfMonitor.start(metricLabel);
      try {
        const result = await originalMethod.apply(this, args);
        perfMonitor.end(metricLabel);
        return result;
      } catch (error) {
        perfMonitor.end(metricLabel);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * HOC for measuring React component render time
 */
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const name = componentName || Component.displayName || Component.name || 'Component';
  
  return (props: P) => {
    React.useEffect(() => {
      perfMonitor.end(`${name} render`);
    });

    perfMonitor.start(`${name} render`);
    return <Component {...props} />;
  };
}

/**
 * Hook for measuring component lifecycle performance
 */
export function usePerformanceMonitor(componentName: string) {
  const mountTime = React.useRef<number>(0);
  
  React.useEffect(() => {
    mountTime.current = performance.now();
    perfMonitor.start(`${componentName} mount`);
    
    return () => {
      perfMonitor.end(`${componentName} mount`);
      const lifetime = performance.now() - mountTime.current;
      console.log(`⏱️ ${componentName} lifetime: ${lifetime.toFixed(2)}ms`);
    };
  }, [componentName]);
}

/**
 * Utility to measure async operations
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  perfMonitor.start(label);
  try {
    const result = await fn();
    perfMonitor.end(label);
    return result;
  } catch (error) {
    perfMonitor.end(label);
    throw error;
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).__perfMonitor = perfMonitor;
}
