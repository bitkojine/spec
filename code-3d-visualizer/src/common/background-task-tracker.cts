/**
 * @file background-task-tracker.cts
 * @description Centralized tracking for asynchronous tasks to ensure compliance with concurrency/01-async-safety.md.
 */

import { logger } from './logger.cjs';

export interface TrackedTask {
    id: string;
    description: string;
    startTime: number;
}

/**
 * Manages the lifecycle of asynchronous background tasks.
 * Provides observability into running tasks and ensures all failures are logged.
 */
export class BackgroundTaskTracker {
    private activeTasks: Map<string, TrackedTask> = new Map();
    private nextId: number = 1;

    /**
     * Registers and tracks an asynchronous task.
     * 
     * @param description - Human-readable description of the task.
     * @param task - The asynchronous operation to track.
     * @returns The result of the task.
     */
    public async track<T>(description: string, task: Promise<T>): Promise<T> {
        const id = `task-${this.nextId++}`;
        const trackedTask: TrackedTask = {
            id,
            description,
            startTime: Date.now()
        };

        this.activeTasks.set(id, trackedTask);
        logger.debug("Task started", { id, description });

        try {
            const result = await task;
            logger.debug("Task completed", { id, description, duration: Date.now() - trackedTask.startTime });
            return result;
        } catch (error: unknown) {
            logger.error("Task failed", {
                id,
                description,
                duration: Date.now() - trackedTask.startTime,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        } finally {
            this.activeTasks.delete(id);
        }
    }

    /**
     * Returns a list of currently running tasks.
     */
    public getActiveTasks(): TrackedTask[] {
        return Array.from(this.activeTasks.values());
    }

    /**
     * Managed setTimeout that is tracked by the system.
     */
    public setTimeout(handler: () => void, ms: number): { cancel: () => void } {
        const id = `timer-${this.nextId++}`;
        const description = `Timeout (${ms}ms)`;
        const startTime = Date.now();

        this.activeTasks.set(id, { id, description, startTime });
        logger.debug("Timer started", { id, ms });

        // eslint-disable-next-line no-restricted-globals -- Disabling because this is the centralized tracker specifically designed to manage setTimeout.
        const timer = setTimeout(() => {
            this.activeTasks.delete(id);
            logger.debug("Timer fired", { id, description, duration: Date.now() - startTime });
            handler();
        }, ms);

        return {
            cancel: () => {
                clearTimeout(timer);
                if (this.activeTasks.has(id)) {
                    this.activeTasks.delete(id);
                    logger.debug("Timer cancelled", { id, description, duration: Date.now() - startTime });
                }
            }
        };
    }
}

export const taskTracker = new BackgroundTaskTracker();
