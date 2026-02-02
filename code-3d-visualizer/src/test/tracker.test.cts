/**
 * @file tracker.test.cts
 * @description Bug-first tests for BackgroundTaskTracker.
 * Following testing/01-bug-first-tests.md and testing/02-real-dependencies-only.md.
 */

import * as assert from 'assert';
import { BackgroundTaskTracker } from '../common/background-task-tracker.cjs';

suite('BackgroundTaskTracker Bug-First Tests', () => {

    /**
     * @bug Tracking of async tasks and their cleanup.
     * @failure_cause Mutation: Task is not removed from activeTasks on completion.
     * @prevented_behavior Memory leak and incorrect reporting of active tasks.
     */
    test('Should track and social cleanup tasks', async () => {
        const tracker = new BackgroundTaskTracker();
        // eslint-disable-next-line no-restricted-globals -- Disabling because we need raw setTimeout to test the tracker's ability to handle async tasks.
        const promise = new Promise<string>(resolve => setTimeout(() => resolve("done"), 10));

        const trackPromise = tracker.track("test task", promise);
        assert.strictEqual(tracker.getActiveTasks().length, 1);
        assert.strictEqual(tracker.getActiveTasks()[0].description, "test task");

        await trackPromise;
        assert.strictEqual(tracker.getActiveTasks().length, 0);
    });

    /**
     * @bug Error handling in tracked tasks.
     * @failure_cause Mutation: Tracker swallows errors or fails to cleanup on rejection.
     * @prevented_behavior Silent failures or memory leaks when tasks fail.
     */
    test('Should cleanup and rethrow on task failure', async () => {
        const tracker = new BackgroundTaskTracker();
        const promise = Promise.reject(new Error("task failed"));

        try {
            await tracker.track("failing task", promise);
            assert.fail("Should have thrown");
        } catch (error: unknown) {
            if (error instanceof Error) {
                assert.strictEqual(error.message, "task failed");
            } else {
                assert.fail("Unexpected error type");
            }
        }

        assert.strictEqual(tracker.getActiveTasks().length, 0);
    });

    /**
     * @bug Managed timeouts and cancellation.
     * @failure_cause Mutation: Timer is not cleared or task is not removed on cancel.
     * @prevented_behavior Dangling timers and incorrect task counts.
     */
    test('Should track and cancel managed timeouts', (done) => {
        const tracker = new BackgroundTaskTracker();
        let fired = false;

        // eslint-disable-next-line no-restricted-globals -- Disabling because we are testing tracked setTimeout by ensuring it actually fires.
        const timer = tracker.setTimeout(() => {
            fired = true;
        }, 100);

        assert.strictEqual(tracker.getActiveTasks().length, 1);

        timer.cancel();
        assert.strictEqual(tracker.getActiveTasks().length, 0);

        // eslint-disable-next-line no-restricted-globals -- Disabling because we need a raw delay to verify the cancelled timer DID NOT fire.
        setTimeout(() => {
            assert.strictEqual(fired, false, "Timer should not have fired");
            done();
        }, 150);
    });
});
