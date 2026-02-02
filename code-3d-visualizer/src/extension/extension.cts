/**
 * @file extension.cts
 * @description Entry point for the VSCode extension.
 */

import * as vscode from 'vscode';
import { logger } from '../common/logger.cjs';
import './extension-logger.cjs'; // Initialize extension-specific logger
import { VisualizerWebviewProvider } from './webview-provider.cjs';
import { FileParser } from './parser.cjs';
import { VisualizerError } from '../common/errors.cjs';
import { ExtensionToWebviewMessage } from '../common/contract.cjs';
import { WorkspaceManager } from './workspace-manager.cjs';
import { taskTracker } from '../common/background-task-tracker.cjs';

let currentPanel: vscode.WebviewPanel | undefined = undefined;

export async function activate(context: vscode.ExtensionContext): Promise<{ provider: VisualizerWebviewProvider }> {
    logger.info("Code 3D Visualizer Activated");

    const provider = new VisualizerWebviewProvider(context.extensionUri);
    const parser = new FileParser();
    const workspaceManager = new WorkspaceManager();

    const getOrCreatePanel = (): vscode.WebviewPanel => {
        if (currentPanel) {
            currentPanel.reveal(vscode.ViewColumn.Beside);
            return currentPanel;
        }

        currentPanel = vscode.window.createWebviewPanel(
            'code3DView',
            '3D Code View',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [context.extensionUri]
            }
        );

        currentPanel.onDidDispose(() => {
            currentPanel = undefined;
        }, undefined, context.subscriptions);

        currentPanel.webview.onDidReceiveMessage((data: unknown) => {
            provider.handleWebviewMessage(data);
        }, undefined, context.subscriptions);

        currentPanel.webview.html = provider.getHtmlForWebview(currentPanel.webview);
        return currentPanel;
    };

    const show3DViewDisposable = vscode.commands.registerCommand('code-3d-visualizer.show3DView', async () => {
        const panel = getOrCreatePanel();
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            // If no editor, just show the blank panel/scene
            return;
        }

        const cts = new vscode.CancellationTokenSource();
        try {
            await taskTracker.track("Show 3D View", (async () => {
                const objects = await parser.parse(editor.document, cts.token);
                const message: ExtensionToWebviewMessage = {
                    type: "UPDATE_SCENE",
                    payload: {
                        blocks: objects,
                        originFile: editor.document.fileName
                    }
                };

                panel.webview.postMessage(message);
            })());

        } catch (error: unknown) {
            if (error instanceof VisualizerError) {
                if (error.code === "CANCELLATION_REQUESTED") return;
                vscode.window.showErrorMessage(`Visualizer Error: ${error.message}`);
            } else {
                logger.error("Unexpected error", { error });
            }
        }
    });

    context.subscriptions.push(show3DViewDisposable);

    const fullScanDisposable = vscode.commands.registerCommand('code-3d-visualizer.visualizeFullCodebase', async () => {
        logger.info("Command: Visualize Full Codebase");
        const panel = getOrCreatePanel();
        await provider.webviewReadyPromise; // Await webview readiness
        const cts = new vscode.CancellationTokenSource();

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Visualizing Codebase...",
            cancellable: true
        }, async (progress, token) => {
            token.onCancellationRequested(() => cts.cancel());

            try {
                await taskTracker.track("Full Codebase Visualization", (async () => {
                    const objects = await workspaceManager.scanWorkspace(
                        cts.token,
                        progress,
                        (messageText, increment, current, total) => {
                            const progressMsg: ExtensionToWebviewMessage = {
                                type: "PROGRESS",
                                payload: {
                                    message: messageText,
                                    increment,
                                    totalFiles: total,
                                    currentFile: current
                                }
                            };
                            panel.webview.postMessage(progressMsg);
                        }
                    );
                    const message: ExtensionToWebviewMessage = {
                        type: "UPDATE_SCENE",
                        payload: {
                            blocks: objects,
                            originFile: "Full Workspace"
                        }
                    };
                    provider.setLastObjectsCount(objects.length);
                    panel.webview.postMessage(message);
                })());
            } catch (error: unknown) {
                logger.error("Workspace scan failed", { error });
            }
        });
    });

    context.subscriptions.push(fullScanDisposable);

    // Auto-open 3D view on activation as requested
    taskTracker.track("Auto-visualization on startup", Promise.resolve(vscode.commands.executeCommand('code-3d-visualizer.visualizeFullCodebase'))).then(
        () => logger.info("Auto-visualization triggered"),
        (err: unknown) => logger.error("Failed to trigger auto-visualization", { error: err })
    );

    return { provider };
}

export function deactivate(): void {
    logger.info("Code 3D Visualizer Deactivated");
}
