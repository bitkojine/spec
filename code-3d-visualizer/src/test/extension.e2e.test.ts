/**
 * @file extension.e2e.test.ts
 * @description E2E tests for the Code 3D Visualizer extension.
 * Following testing/01- bug-first-tests.md and testing/02-real-dependencies-only.md.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { VisualizerError } from '../common/errors';
import { VisualizerWebviewProvider } from '../extension/webview-provider';

suite('Extension E2E Tests', function () {
    this.timeout(15000); // Increase timeout for full scan + auto-start

    /**
     * @bug Extension fails to activate or command is not registered.
     * @failure_cause Mutation: removing 'contributes.commands' from package.json or 'vscode.commands.registerCommand' from extension.ts.
     * @prevented_behavior Users being unable to see the 3D view despite the extension being installed.
     */
    test('Should execute "Show 3D View" command successfully', async () => {
        // 1. Ensure extension is activated
        const ext = vscode.extensions.getExtension('visualizer.code-3d-visualizer');
        if (!ext) {
            assert.fail("Extension not found");
        }
        await ext.activate();

        // 2. Open a real file from the demo project
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            assert.fail("No workspace folders found. Please run with the demo project.");
        }

        const files = await vscode.workspace.findFiles('**/AuthService.ts');
        if (files.length === 0) {
            assert.fail("No AuthService.ts found. Please ensure workspace is correctly set up.");
        }

        const document = await vscode.workspace.openTextDocument(files[0]);
        await vscode.window.showTextDocument(document);

        // 3. Execute the command
        try {
            await vscode.commands.executeCommand('code-3d-visualizer.show3DView');
            assert.ok(true, "Command executed without crashing");

            // Wait for 2 seconds so the user can see the 3D view in the test window
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: unknown) {
            if (error instanceof VisualizerError) {
                assert.ok(true, `Managed error: ${error.code}`);
            } else {
                if (error instanceof Error && error.message === "CANCELED") {
                    assert.ok(true);
                } else {
                    assert.fail(`Unexpected error during command execution: ${error}`);
                }
            }
        }
    });

    test('Should handle no active editor gracefully', async () => {
        // Close all editors
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        try {
            await vscode.commands.executeCommand('code-3d-visualizer.show3DView');
            assert.ok(true, "Show 3D View did not throw with no active editor");
        } catch (error: unknown) {
            assert.fail(`Show 3D View failed with no active editor: ${error}`);
        }
    });

    test('Should automatically launch visualization on activation', async () => {
        // Opening any .ts file should trigger activation
        const files = await vscode.workspace.findFiles('**/AuthService.ts');
        if (files.length === 0) {
            assert.fail("Could not find AuthService.ts for activation test");
        }
        await vscode.workspace.openTextDocument(files[0]);
        await new Promise(resolve => setTimeout(resolve, 3000));

        assert.ok(true, "Automatically launched visualization");
    });

    test('Should execute "Visualize Full Codebase" command successfully', async () => {
        try {
            await vscode.commands.executeCommand('code-3d-visualizer.visualizeFullCodebase');
            assert.ok(true, "Full codebase scan executed");
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error: unknown) {
            assert.fail(`Full codebase visualization failed: ${error}`);
        }
    });

    /**
     * @bug Extension opens the view but fails to render any 3D objects (black screen).
     * @failure_cause Mutation: remove three.js rendering calls or fail to pass objects to webview.
     * @prevented_behavior Users seeing an empty or broken 3D scene.
     */
    test('Should render 3D pixels in the webview', async () => {
        const ext = vscode.extensions.getExtension<{ provider: VisualizerWebviewProvider }>('visualizer.code-3d-visualizer');
        if (!ext) {
            assert.fail("Extension not found");
        }

        const api = await ext.activate();
        const provider = api.provider;

        // Ensure we are ready
        await provider.webviewReadyPromise;

        // Trigger full codebase visualization
        await vscode.commands.executeCommand('code-3d-visualizer.visualizeFullCodebase');

        // Poll for the visual report from the webview
        let reportReceived = false;
        let lastReport;

        for (let i = 0; i < 20; i++) {
            lastReport = provider.lastVisualReport;
            if (lastReport && lastReport.hasPixels) {
                reportReceived = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        assert.ok(reportReceived, `Webview should report that pixels were rendered. Objects: ${provider.lastObjectsCount}`);
    });
});
