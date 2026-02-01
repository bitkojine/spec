/**
 * @file stress.e2e.test.cts
 * @description Stress test for large codebase visualization.
 * FOLLOWING: testing/01-bug-first-tests.md and testing/02-real-dependencies-only.md.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { VisualizerWebviewProvider } from '../extension/webview-provider.cjs';
import { logger } from '../common/logger.cjs';
import { managedDelay } from '../common/utils.cjs';

suite('Stress E2E Tests', function () {
    this.timeout(120000); // High timeout for full extension repo scan
    const isStress = process.env.STRESS_TEST === 'true';

    /**
     * @bug Visualization fails or is empty because the wrong workspace is opened.
     * @failure_cause Mutation: runTest.ts pointing to the wrong directory for stress tests.
     * @prevented_behavior Users seeing "0 files found" because the scanner started in an empty temp dir.
     */
    test('Should have the correct workspace folder opened', async () => {
        const folders = vscode.workspace.workspaceFolders;
        assert.ok(folders && folders.length > 0, "Workspace folders should be present");

        const folderName = folders[0].name;
        // In our runTest.ts, stress test opens 'extensionDevelopmentPath' (the repo itself)
        // Usually titled 'code-3d-visualizer' or the folder name
        assert.ok(folderName.includes('code-3d-visualizer') || folderName.includes('spec') || folderName.includes('demo'), `Unexpected workspace: ${folderName}`);
    });

    /**
     * @bug Visualization fails or is empty for large, complex codebases.
     * @failure_cause Mutation: WorkspaceManager fails to recurse directories or ignores valid files.
     * @prevented_behavior Users seeing an empty or sparse 3D scene when scanning a real-world repository.
     */
    test('Should visualize the entire extension repository successfully', async () => {
        const ext = vscode.extensions.getExtension<{ provider: VisualizerWebviewProvider }>('visualizer.code-3d-visualizer');
        if (!ext) {
            assert.fail("Extension not found");
        }

        const api = await ext.activate();
        const provider = api.provider;

        // Ensure workspace is recognized and ready
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            assert.fail("No workspace folders found in stress test. Ensure extensionDevelopmentPath is used.");
        }

        // Wait a bit for VS Code to index the files
        await managedDelay(2000);

        // Trigger full codebase visualization
        await vscode.commands.executeCommand('code-3d-visualizer.visualizeFullCodebase');

        // Wait for the visual report with relaxed polling (large repos take longer)
        let reportReceived = false;
        let lastReport;

        // Poll for up to 60 seconds
        for (let i = 0; i < 120; i++) {
            lastReport = provider.lastVisualReport;
            if (lastReport && lastReport.hasPixels) {
                reportReceived = true;
                break;
            }
            await managedDelay(500);
        }

        assert.ok(reportReceived, `Webview should report pixels for a large codebase. Last report: ${JSON.stringify(lastReport)}`);

        // Assertions for visual density and correctness
        const pixelCount = lastReport?.pixelCount ?? 0;
        const objectCount = provider.lastObjectsCount ?? 0;

        // Use structured logging instead of console.log as per logging/01-logging-standards.md
        logger.info("Stress Test Results", {
            pixelCount,
            objectCount,
            repo: "code-3d-visualizer"
        });

        // A full repo scan should produce significantly more than 100 pixels if it's "visible"
        // And we expect at least 40 objects for the core extension files (classes, functions etc)
        if (isStress) {
            assert.ok(objectCount > 40, `Expected at least 40 objects for the extension repo, but found ${objectCount}`);
            assert.ok(pixelCount > 1000, `Expected at least 1000 pixels for visibility, but found ${pixelCount}.`);
        } else {
            assert.ok(objectCount > 0, "Should find some objects even in non-stress mode");
            assert.ok(pixelCount > 0, "Should render some pixels even in non-stress mode");
        }
    });
});
