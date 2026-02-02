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
export class PerformanceMetrics {
    private startTime: number = 0;
    private startMemory?: number;

    /**
     * Starts a measurement.
     */
    public start(): void {
        this.startTime = performance.now();
        // process.memoryUsage is only available in Node.js environments (Extension Host)
        if (typeof process !== 'undefined' && process.memoryUsage) {
            this.startMemory = process.memoryUsage().heapUsed;
        }
    }

    /**
     * Ends a measurement and logs the results.
     * 
     * @param operation - Name of the operation being measured.
     * @param context - Additional metadata for the log.
     */
    public end(operation: string, context?: Record<string, unknown>): void {
        const duration = performance.now() - this.startTime;
        const payload: PerformancePayload = {
            operation,
            duration,
            context
        };

        if (this.startMemory !== undefined && typeof process !== 'undefined' && process.memoryUsage) {
            payload.memoryDelta = process.memoryUsage().heapUsed - this.startMemory;
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
