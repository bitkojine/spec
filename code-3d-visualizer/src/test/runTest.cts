/**
 * @file runTest.cts
 * @description Bootstrap script for running extension integration tests.
 */
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './index.cjs');

        // Download VS Code, unzip it and run the integration test
        const workspacePath = process.env.STRESS_TEST ? extensionDevelopmentPath : path.resolve(extensionDevelopmentPath, 'demo');

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [workspacePath]
        });
    } catch (err) {
        // eslint-disable-next-line no-console -- Disabling because this is a bootstrap script where console output is required for fatal error visibility.
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
