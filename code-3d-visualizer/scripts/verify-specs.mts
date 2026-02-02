/**
 * @file verify-specs.mts
 * @description Verifies that engineering specifications are followed in the codebase.
 * Ported from verify-specs.sh to TypeScript (ESM).
 */

import { glob } from 'glob';
import { readFile } from 'node:fs/promises';

async function main() {
    let exitCode = 0;

    // 1. Verify Bug-First Metadata in Tests
    /* eslint-disable no-console -- Disabling because this is a CLI tool where terminal output is the primary UI. */
    console.log("Running Specification Verification...");

    // 1. Verify Bug-First Metadata in Tests
    console.log("Checking for Bug-First metadata in tests...");
    const testFiles = await glob('src/test/**/*.test.{mts,cts}');

    for (const file of testFiles) {
        const content = await readFile(file, 'utf-8');
        const hasBug = content.includes('@bug');
        const hasFailureCause = content.includes('@failure_cause');
        const hasPreventedBehavior = content.includes('@prevented_behavior');

        if (!hasBug || !hasFailureCause || !hasPreventedBehavior) {
            console.error(`FAIL: ${file} is missing mandatory Bug-First metadata (@bug, @failure_cause, @prevented_behavior)`);
            exitCode = 1;
        }
    }

    // 2. Verify all files have file-level description/file tags
    console.log("Checking for file-level headers...");
    const srcFiles = await glob('src/**/*.{mts,cts}');

    for (const file of srcFiles) {
        const content = await readFile(file, 'utf-8');
        if (!content.includes('@file')) {
            console.error(`FAIL: ${file} is missing mandatory @file header`);
            exitCode = 1;
        }

        // 3. Prohibit unmanaged timers
        if (content.includes('setTimeout') || content.includes('setInterval')) {
            // Allow in the tracker itself and the shim that uses it
            const isAllowed = file.endsWith('background-task-tracker.cts') ||
                file.endsWith('utils.cts') ||
                file.includes('test'); // Tests might use them for mocking time if absolutely necessary, though discouraged

            if (!isAllowed) {
                console.error(`FAIL: ${file} contains unmanaged timers (setTimeout/setInterval). Use BackgroundTaskTracker instead.`);
                exitCode = 1;
            }
        }
    }

    if (exitCode === 0) {
        console.log("SUCCESS: All specification checks passed.");
    } else {
        console.error("FAILURE: One or more specification checks failed.");
    }
    /* eslint-enable no-console -- Restoring console check after main CLI logic. */

    process.exit(exitCode);
}

main().catch(err => {
    /* eslint-disable no-console -- Disabling because critical internal errors in this CLI script must be visible. */
    console.error("Internal Error during specification verification:", err);
    /* eslint-enable no-console -- Restoring console check. */
    process.exit(1);
});
