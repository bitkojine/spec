/**
 * @file verify-specs.mts
 * @description Verifies that engineering specifications are followed in the codebase.
 * Ported from verify-specs.sh to TypeScript (ESM).
 */

import { glob } from 'glob';
import { readFile } from 'node:fs/promises';

async function main() {
    let exitCode = 0;
    const correlationId = `spec-check-${Date.now()}`;

    const log = (level: "INFO" | "ERROR", message: string, context?: Record<string, unknown>) => {
        const entry: Record<string, unknown> = {
            "@timestamp": new Date().toISOString(),
            level,
            message,
            context
        };
        // Use index access to satisfy strict naming-convention while meeting external spec
        entry["service_id"] = "SpecVerifier";
        entry["correlation_id"] = correlationId;

        if (level === "ERROR") {
            /* eslint-disable-next-line no-console -- Required for structured log output to stdout/stderr */
            console.error(JSON.stringify(entry));
        } else {
            /* eslint-disable-next-line no-console -- Required for structured log output to stdout/stderr */
            console.log(JSON.stringify(entry));
        }
    };

    log("INFO", "Running Specification Verification...");
    log("INFO", "Checking for Bug-First metadata in tests...");
    const testFiles = await glob('src/test/**/*.test.{mts,cts}');

    for (const file of testFiles) {
        const content = await readFile(file, 'utf-8');
        const hasBug = content.includes('@bug');
        const hasFailureCause = content.includes('@failure_cause');
        const hasPreventedBehavior = content.includes('@prevented_behavior');

        if (!hasBug || !hasFailureCause || !hasPreventedBehavior) {
            log("ERROR", "Missing Bug-First metadata", {
                file,
                hasBug,
                hasFailureCause,
                hasPreventedBehavior
            });
            exitCode = 1;
        }
    }

    log("INFO", "Checking for file-level headers...");
    const srcFiles = await glob('src/**/*.{mts,cts}');

    for (const file of srcFiles) {
        const content = await readFile(file, 'utf-8');
        if (!content.includes('@file')) {
            log("ERROR", "Missing @file header", { file });
            exitCode = 1;
        }

        // 3. Prohibit unmanaged timers
        if (content.includes('setTimeout') || content.includes('setInterval')) {
            // Allow in the tracker itself and the shim that uses it
            const isAllowed = file.endsWith('background-task-tracker.cts') ||
                file.endsWith('utils.cts') ||
                file.includes('test'); // Tests might use them for mocking time if absolutely necessary, though discouraged

            if (!isAllowed) {
                log("ERROR", "Unmanaged timers found", { file });
                exitCode = 1;
            }
        }
    }

    if (exitCode === 0) {
        log("INFO", "All specification checks passed");
    } else {
        log("ERROR", "Specification checks failed", { exitCode });
    }

    process.exit(exitCode);
}

main().catch(err => {
    const correlationId = `spec-check-err-${Date.now()}`;
    const entry: Record<string, unknown> = {
        "@timestamp": new Date().toISOString(),
        level: "ERROR",
        message: "Internal error during specification verification",
        context: {
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined
        }
    };
    entry["service_id"] = "SpecVerifier";
    entry["correlation_id"] = correlationId;
    /* eslint-disable-next-line no-console -- Critical internal error visibility */
    console.error(JSON.stringify(entry));
    process.exit(1);
});
