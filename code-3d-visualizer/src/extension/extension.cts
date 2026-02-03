/**
 * @file extension.cts
 * @description Entry point for the VSCode extension.
 */

import * as vscode from 'vscode';
import { logger } from '../common/logger.cjs';
import './extension-logger.cjs'; // Initialize extension-specific logger
import { VisualizerWebviewProvider } from './webview-provider.cjs';
import { FileParser } from './parser.cjs';
import { VisualizerError, AppError } from '../common/errors.cjs';
import { ExtensionToWebviewMessageSchema } from '../common/contract.cjs';
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
            try {
                provider.handleWebviewMessage(data);
            } catch (error: unknown) {
                const appError = error instanceof AppError ? error : new VisualizerError(
                    "WEBVIEW_MESSAGE_INVALID",
                    error instanceof Error ? error.message : "Invalid message from webview",
                    'NON_RETRYABLE'
                );
                logger.error("Webview message handling failed", {
                    error: appError.message,
                    code: appError.code,
                    severity: appError.severity
                });
            }
        }, undefined, context.subscriptions);

        currentPanel.webview.html = provider.getHtmlForWebview(currentPanel.webview);
        return currentPanel;
    };

    const show3DViewDisposable = vscode.commands.registerCommand('code-3d-visualizer.show3DView', async () => {
        const panel = getOrCreatePanel();
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        const cts = new vscode.CancellationTokenSource();
        try {
            await provider.webviewReadyPromise;
            await taskTracker.track("Show 3D View", (async () => {
                const objects = await parser.parse(editor.document, cts.token);

                const payload = {
                    type: "UPDATE_SCENE" as const,
                    payload: {
                        blocks: objects,
                        originFile: editor.document.fileName
                    }
                };

                // Validate against contract before sending
                const message = ExtensionToWebviewMessageSchema.parse(payload);
                panel.webview.postMessage(message);
            })());

        } catch (error: unknown) {
            const appError = error instanceof AppError ? error : new VisualizerError(
                "PARSING_FAILED",
                error instanceof Error ? error.message : "Unexpected visualization error",
                'NON_RETRYABLE'
            );

            if (appError.code === "CANCELLATION_REQUESTED") return;

            logger.error("Command failed", {
                command: 'show3DView',
                error: appError.message,
                code: appError.code,
                severity: appError.severity
            });
            vscode.window.showErrorMessage(`Visualizer Error: ${appError.message}`);
        }
    });

    context.subscriptions.push(show3DViewDisposable);

    const fullScanDisposable = vscode.commands.registerCommand('code-3d-visualizer.visualizeFullCodebase', async () => {
        logger.info("Command: Visualize Full Codebase");
        const panel = getOrCreatePanel();
        await provider.webviewReadyPromise;
        const cts = new vscode.CancellationTokenSource();

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Visualizing Codebase...",
            cancellable: true
        }, async (progress, token) => {
            token.onCancellationRequested(() => cts.cancel());

            try {
                const objects = await workspaceManager.scanWorkspace(
                    cts.token,
                    progress,
                    (messageText, increment, current, total) => {
                        const progressPayload = {
                            type: "PROGRESS" as const,
                            payload: {
                                message: messageText,
                                increment,
                                totalFiles: total,
                                currentFile: current
                            }
                        };
                        const msg = ExtensionToWebviewMessageSchema.parse(progressPayload);
                        panel.webview.postMessage(msg);
                    }
                );

                const updatePayload = {
                    type: "UPDATE_SCENE" as const,
                    payload: {
                        blocks: objects,
                        originFile: "Full Workspace"
                    }
                };
                const message = ExtensionToWebviewMessageSchema.parse(updatePayload);

                provider.setLastObjectsCount(objects.length);
                panel.webview.postMessage(message);
            } catch (error: unknown) {
                const appError = error instanceof AppError ? error : new VisualizerError(
                    "PARSING_FAILED",
                    error instanceof Error ? error.message : "Workspace scan failed",
                    'NON_RETRYABLE'
                );
                logger.error("Workspace scan failed", {
                    error: appError.message,
                    code: appError.code,
                    severity: appError.severity
                });
                vscode.window.showErrorMessage(`Scan Failed: ${appError.message}`);
            }
        });
    });

    context.subscriptions.push(fullScanDisposable);

    taskTracker.track("Auto-visualization on startup", Promise.resolve(vscode.commands.executeCommand('code-3d-visualizer.visualizeFullCodebase'))).then(
        () => logger.info("Auto-visualization triggered"),
        (err: unknown) => logger.error("Failed to trigger auto-visualization", { error: err })
    );

    return { provider };
}

export function deactivate(): void {
    logger.info("Code 3D Visualizer Deactivated");
}
