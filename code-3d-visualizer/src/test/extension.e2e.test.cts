/**
 * @file extension.e2e.test.cts
 * @description E2E tests for the Code 3D Visualizer extension.
 * FOLLOWING: testing/01-bug-first-tests.md and testing/02-real-dependencies-only.md.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { VisualizerWebviewProvider } from '../extension/webview-provider.cjs';
import { managedDelay } from '../common/utils.cjs';

suite('Bug-First E2E Tests', function () {
    this.timeout(20000);

    /**
     * @bug Extension activation fails or commands are not registered.
     * @failure_cause Mutation: removing 'contributes.commands' from package.json.
     * @prevented_behavior Users cannot find or run "Show 3D View" command.
     */
    test('Should have extension activated and commands registered', async () => {
        const ext = vscode.extensions.getExtension('visualizer.code-3d-visualizer');
        assert.ok(ext, "Extension should be present");

        await ext.activate();
        assert.strictEqual(ext.isActive, true, "Extension should be active");

        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('code-3d-visualizer.show3DView'), "Show 3D View command should be registered");
        assert.ok(commands.includes('code-3d-visualizer.visualizeFullCodebase'), "Visualize Full Codebase command should be registered");
    });

    /**
     * @bug Webview fails to initialize or never signals readiness.
     * @failure_cause Mutation: removing 'postMessage({ type: "READY" })' from webview script.
     * @prevented_behavior Extension hanging forever waiting for webviewReadyPromise.
     */
    test('Webview should signal readiness upon opening', async () => {
        const ext = vscode.extensions.getExtension<{ provider: VisualizerWebviewProvider }>('visualizer.code-3d-visualizer');
        const api = await ext!.activate();
        const provider = api.provider;

        // Trigger view
        await vscode.commands.executeCommand('code-3d-visualizer.show3DView');

        // This promise should resolve if the webview sends specialized READY signal
        await provider.webviewReadyPromise;
        assert.ok(true, "Webview signalled readiness");
    });

    /**
     * @bug Rendering logic fails to produce 3D objects even for valid files.
     * @failure_cause Mutation: FileParser regex failing to find common TS patterns.
     * @prevented_behavior Users seeing a black screen/empty scene despite having code.
     */
    test('Should render 3D pixels for a valid TypeScript file', async () => {
        const ext = vscode.extensions.getExtension<{ provider: VisualizerWebviewProvider }>('visualizer.code-3d-visualizer');
        const api = await ext!.activate();
        const provider = api.provider;

        // Open a file from the workspace (using AuthService.mts from demo as a real dependency)
        const files = await vscode.workspace.findFiles('**/AuthService.mts');
        if (files.length === 0) {
            assert.fail("AuthService.mts not found in workspace");
        }
        const doc = await vscode.workspace.openTextDocument(files[0]);
        await vscode.window.showTextDocument(doc);

        // Execute visualization
        await vscode.commands.executeCommand('code-3d-visualizer.show3DView');

        // Poll for visual confirmation from the webview (real rendering check)
        let pixelsDetected = false;
        for (let i = 0; i < 10; i++) {
            if (provider.lastVisualReport?.hasPixels) {
                pixelsDetected = true;
                break;
            }
            await managedDelay(1000);
        }

        assert.ok(pixelsDetected, "Webview should report that pixels were rendered in the 3D scene");
    });

    /**
     * @bug Extension crashes when no editor is open but 3D view is triggered.
     * @failure_cause Mutation: failing to check 'vscode.window.activeTextEditor' for undefined.
     * @prevented_behavior "Visualizer Error" notification appearing to user.
     */
    test('Should handle no active editor gracefully', async () => {
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');

        try {
            await vscode.commands.executeCommand('code-3d-visualizer.show3DView');
            assert.ok(true, "Did not crash with no active editor");
        } catch (e) {
            assert.fail(`Should not have thrown error: ${e}`);
        }
    });
});
