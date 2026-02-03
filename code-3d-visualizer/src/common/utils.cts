/**
 * @file utils.cts
 * @description Common utility functions for the Code 3D Visualizer.
 */

import { taskTracker } from './background-task-tracker.cjs';
import { VisualizerError } from './errors.cjs';

/**
 * A managed delay that supports cancellation via AbortSignal.
 * Complies with concurrency/01-async-safety.md by using a managed task tracker.
 * 
 * @param ms - Milliseconds to delay.
 * @param signal - Optional AbortSignal to cancel the delay.
 * @returns A promise that resolves after the delay or rejects on cancellation.
 */
export function managedDelay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            return reject(new VisualizerError("CANCELLATION_REQUESTED", "Operation cancelled", "RETRYABLE"));
        }

        const timer = taskTracker.setTimeout(() => {
            resolve();
            cleanup();
        }, ms);

        const onAbort = () => {
            timer.cancel();
            reject(new VisualizerError("CANCELLATION_REQUESTED", "Operation cancelled", "RETRYABLE"));
            cleanup();
        };

        const cleanup = () => {
            signal?.removeEventListener('abort', onAbort);
        };

        signal?.addEventListener('abort', onAbort);
    });
}
