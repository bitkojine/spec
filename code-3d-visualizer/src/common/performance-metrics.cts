/**
 * @file performance-metrics.cts
 * @description Utility for standardized performance tracking across the application.
 */

import { logger } from './logger.cjs';

export interface PerformancePayload {
    operation: string;
    duration: number; // milliseconds
    memoryDelta?: number; // bytes (optional, node-only)
    context?: Record<string, unknown>;
}

/**
 * Helper to measure the duration and resource impact of operations.
 */
interface PerformanceMemory {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

export class PerformanceMetrics {
    private startTime?: number;
    private startMemory?: number;

    private getMemory(): number | undefined {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage().heapUsed;
        }
        if (typeof performance !== 'undefined' && 'memory' in performance) {
            return (performance as unknown as { memory: PerformanceMemory }).memory.usedJSHeapSize;
        }
        return undefined;
    }

    /**
     * Starts a measurement.
     */
    public start(): void {
        this.startTime = performance.now();
        this.startMemory = this.getMemory();
    }

    /**
     * Ends a measurement and logs the results.
     * 
     * @param operation - Name of the operation being measured.
     * @param context - Additional metadata for the log.
     */
    public end(operation: string, context?: Record<string, unknown>): void {
        const duration = performance.now() - (this.startTime ?? performance.now());
        const payload: Record<string, unknown> = {
            operation,
            duration,
            context
        };

        if (this.startMemory !== undefined) {
            const currentMemory = this.getMemory();
            if (currentMemory !== undefined) {
                payload.memoryDelta = currentMemory - this.startMemory;
            }
        }

        logger.info(`Performance: ${operation} completed in ${duration.toFixed(2)}ms`, { perf: payload });
    }

    /**
     * Wraps an asynchronous task with performance measurement.
     * 
     * @param operation - Name of the operation.
     * @param task - The async operation to perform.
     * @param context - Optional context.
     */
    public static async measure<T>(operation: string, task: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
        const pm = new PerformanceMetrics();
        pm.start();
        try {
            return await task();
        } finally {
            pm.end(operation, context);
        }
    }
}
