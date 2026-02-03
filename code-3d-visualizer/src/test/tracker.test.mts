/**
 * @file tracker.test.mts
 * @description Bug-first tests for BackgroundTaskTracker.
 * Following testing/01-bug-first-tests.md and testing/02-real-dependencies-only.md.
 */

import * as assert from 'assert';
import { BackgroundTaskTracker } from '../common/background-task-tracker.cjs';
import { VisualizerError } from '../common/errors.cjs';

suite('BackgroundTaskTracker Bug-First Tests', () => {

    /**
     * @bug Tracking of async tasks and their cleanup.
     * @failure_cause Mutation: Task is not removed from activeTasks on completion.
     * @prevented_behavior Memory leak and incorrect reporting of active tasks.
     */
    test('should track and cleanup tasks', async () => {
        const tracker = new BackgroundTaskTracker();

        // Start a task
        let taskCompleted = false;
        const taskPromise = tracker.track('test-task', new Promise<void>((resolve) => {
            tracker.setTimeout(() => {
                taskCompleted = true;
                resolve();
            }, 50);
        }));

        // Verify task is tracked
        const activeBefore = tracker.getActiveTasks();
        assert.strictEqual(activeBefore.length, 1);
        assert.strictEqual(activeBefore[0].id, 'task-1');

        // Wait for task completion
        await taskPromise;

        // Verify task is cleaned up
        const activeAfter = tracker.getActiveTasks();
        assert.strictEqual(activeAfter.length, 0);
        assert.strictEqual(taskCompleted, true);
    });

    /**
     * @bug Proper error handling and cleanup on task failure.
     * @failure_cause Mutation: Task failure doesn't remove from activeTasks or rethrow error.
     * @prevented_behavior Silent failures and incorrect task tracking state.
     */
    test('should cleanup and rethrow on task failure', async () => {
        const tracker = new BackgroundTaskTracker();

        // Verify task is tracked
        const activeBefore = tracker.getActiveTasks();
        assert.strictEqual(activeBefore.length, 0);

        // Task should rethrow the error and cleanup
        try {
            await tracker.track('failing-task', Promise.reject(new VisualizerError('PARSING_FAILED', 'Test error')));
            assert.fail('Should have thrown an error');
        } catch (error) {
            assert.strictEqual((error as VisualizerError).message, 'Test error');
        }

        // Verify task is cleaned up despite failure
        const activeAfter = tracker.getActiveTasks();
        assert.strictEqual(activeAfter.length, 0);
    });

    /**
     * @bug Managed setTimeout should be properly tracked and cancellable.
     * @failure_cause Mutation: setTimeout is not tracked or cannot be cancelled.
     * @prevented_behavior Unmanaged timers and memory leaks.
     */
    test('should track and cancel managed timeouts', async () => {
        const tracker = new BackgroundTaskTracker();
        let timerFired = false;

        // Start a managed timeout
        const timer = tracker.setTimeout(() => {
            timerFired = true;
        }, 100);

        // Verify timer is tracked
        const activeBefore = tracker.getActiveTasks();
        assert.strictEqual(activeBefore.length, 1);
        assert.ok(activeBefore[0].description.includes('Timeout'));

        // Cancel the timer
        timer.cancel();

        // Wait to ensure timer doesn't fire
        await new Promise<void>((resolve) => {
            tracker.setTimeout(resolve, 150);
        });

        // Verify timer didn't fire and was cleaned up
        assert.strictEqual(timerFired, false);
        const activeAfter = tracker.getActiveTasks();
        assert.strictEqual(activeAfter.length, 0);
    });
});

// Export for test runner compatibility
export { };
