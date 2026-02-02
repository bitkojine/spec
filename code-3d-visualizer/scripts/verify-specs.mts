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
    /* eslint-disable no-console -- CLI tool output for user feedback */
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
            const errorLog = {
                timestamp: new Date().toISOString(),
                level: "ERROR",
                service: "SpecVerifier",
                message: "Missing Bug-First metadata",
                context: {
                    file,
                    hasBug,
                    hasFailureCause,
                    hasPreventedBehavior
                }
            };
            console.error(JSON.stringify(errorLog));
            exitCode = 1;
        }
    }

    // 2. Verify all files have file-level description/file tags
    console.log("Checking for file-level headers...");
    const srcFiles = await glob('src/**/*.{mts,cts}');

    for (const file of srcFiles) {
        const content = await readFile(file, 'utf-8');
        if (!content.includes('@file')) {
            const errorLog = {
                timestamp: new Date().toISOString(),
                level: "ERROR",
                service: "SpecVerifier",
                message: "Missing @file header",
                context: { file }
            };
            console.error(JSON.stringify(errorLog));
            exitCode = 1;
        }

        // 3. Prohibit unmanaged timers
        if (content.includes('setTimeout') || content.includes('setInterval')) {
            // Allow in the tracker itself and the shim that uses it
            const isAllowed = file.endsWith('background-task-tracker.cts') ||
                file.endsWith('utils.cts') ||
                file.includes('test'); // Tests might use them for mocking time if absolutely necessary, though discouraged

            if (!isAllowed) {
                const errorLog = {
                    timestamp: new Date().toISOString(),
                    level: "ERROR",
                    service: "SpecVerifier",
                    message: "Unmanaged timers found",
                    context: { file }
                };
                console.error(JSON.stringify(errorLog));
                exitCode = 1;
            }
        }
    }

    if (exitCode === 0) {
        const successLog = {
            timestamp: new Date().toISOString(),
            level: "INFO",
            service: "SpecVerifier",
            message: "All specification checks passed"
        };
        console.log(JSON.stringify(successLog));
    } else {
        const failureLog = {
            timestamp: new Date().toISOString(),
            level: "ERROR",
            service: "SpecVerifier",
            message: "Specification checks failed",
            context: { exitCode }
        };
        console.error(JSON.stringify(failureLog));
    }
    /* eslint-enable no-console -- Restoring console check after main CLI logic. */

    process.exit(exitCode);
}

main().catch(err => {
    /* eslint-disable no-console -- Critical internal errors must be visible */
    const errorLog = {
        timestamp: new Date().toISOString(),
        level: "ERROR",
        service: "SpecVerifier",
        message: "Internal error during specification verification",
        context: {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
        }
    };
    console.error(JSON.stringify(errorLog));
    /* eslint-enable no-console -- Restoring console check. */
    process.exit(1);
});
