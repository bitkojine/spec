/**
 * @file verify-specs.mts
 * @description Verifies that engineering specifications are followed in the codebase.
 * Ported from verify-specs.sh to TypeScript (ESM).
 */

import { glob } from 'glob';
import { readFile } from 'node:fs/promises';

async function main() {
    let exitCode = 0;

    // Disabling no-console because this is a CLI script where direct terminal output 
    // is the intended interface for build/verification feedback.
    /* eslint-disable no-console */
    console.log("Running Specification Verification...");

    // 1. Verify Bug-First Metadata in Tests
    console.log("Checking for Bug-First metadata in tests...");
    const testFiles = await glob('src/test/**/*.{test.cts,test.mts}');

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
            console.warn(`WARNING: ${file} is missing mandatory @file header`);
            // exitCode = 1; // Keeping as warning for now to match shim, but we should enforce it.
        }
    }

    if (exitCode === 0) {
        console.log("SUCCESS: All specification checks passed.");
    } else {
        console.error("FAILURE: One or more specification checks failed.");
    }
    /* eslint-enable no-console */

    process.exit(exitCode);
}

main().catch(err => {
    // Disabling no-console for critical internal error reporting in this CLI script.
    /* eslint-disable no-console */
    console.error("Internal Error during specification verification:", err);
    /* eslint-enable no-console */
    process.exit(1);
});
