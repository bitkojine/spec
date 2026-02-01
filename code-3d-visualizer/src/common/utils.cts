/**
 * @file utils.cts
 * @description Common utility functions for the Code 3D Visualizer.
 */

/**
 * A managed delay that supports cancellation via AbortSignal.
 * Complies with concurrency/01-async-safety.md by avoiding unmanaged timers.
 * 
 * @param ms - Milliseconds to delay.
 * @param signal - Optional AbortSignal to cancel the delay.
 * @returns A promise that resolves after the delay or rejects on cancellation.
 */
export function managedDelay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            return reject(new Error("Operation cancelled"));
        }

        // eslint-disable-next-line no-restricted-globals
        const timer = setTimeout(() => {
            resolve();
            cleanup();
        }, ms);

        const onAbort = () => {
            clearTimeout(timer);
            reject(new Error("Operation cancelled"));
            cleanup();
        };

        const cleanup = () => {
            signal?.removeEventListener('abort', onAbort);
        };

        signal?.addEventListener('abort', onAbort);
    });
}
