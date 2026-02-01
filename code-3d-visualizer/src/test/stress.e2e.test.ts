/**
 * @file stress.e2e.test.ts
 * @description Stress test for large codebase visualization.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { VisualizerWebviewProvider } from '../extension/webview-provider';

suite('Stress E2E Tests', function () {
    this.timeout(60000); // High timeout for full extension repo scan

    /**
     * @bug Visualization is empty for large codebases.
     * @prevented_behavior Users seeing an empty 3D scene when scanning a real project.
     */
    test('Should visualize the entire extension repository successfully', async () => {
        const ext = vscode.extensions.getExtension<{ provider: VisualizerWebviewProvider }>('visualizer.code-3d-visualizer');
        if (!ext) {
            assert.fail("Extension not found");
        }

        const api = await ext.activate();
        const provider = api.provider;

        // Trigger full codebase visualization
        await vscode.commands.executeCommand('code-3d-visualizer.visualizeFullCodebase');

        // Wait for the visual report with relaxed polling (large repos take longer)
        let reportReceived = false;
        let lastReport;

        // Poll for up to 30 seconds
        for (let i = 0; i < 60; i++) {
            lastReport = provider.lastVisualReport;
            if (lastReport && lastReport.hasPixels) {
                reportReceived = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        assert.ok(reportReceived, `Webview should report pixels for a large codebase. Last report: ${JSON.stringify(lastReport)}`);

        // Assertions for visual density
        const pixelCount = lastReport?.pixelCount ?? 0;
        const objectCount = provider.lastObjectsCount ?? 0;

        console.log(`Stress Test: Rendered ${pixelCount} pixels and ${objectCount} objects for the extension repo.`);

        // A full repo scan should produce significantly more than 100 pixels if it's "visible"
        // And we expect at least 40 objects for the core extension files
        assert.ok(objectCount > 40, `Expected at least 40 objects for the extension repo, but found ${objectCount}`);
        assert.ok(pixelCount > 1000, `Expected at least 1000 pixels for visibility, but found ${pixelCount}.`);
    });
});
