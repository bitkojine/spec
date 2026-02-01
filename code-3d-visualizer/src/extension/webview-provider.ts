/**
 * @file webview-provider.ts
 * @description Manages the VSCode Webview lifecycle for the 3D panel.
 */

import * as vscode from 'vscode';
import { isWebviewMessage, VisualReportMessage, isExtensionMessage } from '../common/contract';
import { logger } from '../common/logger';
import { getWebviewContent } from './webview-template';

export class VisualizerWebviewProvider {
    private _lastVisualReport?: VisualReportMessage['payload'];
    private _lastObjectsCount: number = 0;
    private _webviewReadyResolve?: () => void;
    public readonly webviewReadyPromise: Promise<void>;
    private readonly _extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
        this.webviewReadyPromise = new Promise((resolve) => {
            this._webviewReadyResolve = resolve;
        });
    }

    public handleWebviewMessage(data: unknown): void {
        if (isWebviewMessage(data)) {
            if (data.type === "READY") {
                this._webviewReadyResolve?.();
                logger.info("Webview reported READY");
            } else if (data.type === "VISUAL_REPORT") {
                this._lastVisualReport = data.payload;
                logger.info("Received visual report from webview", data.payload);
            }
        } else if (isExtensionMessage(data)) {
            logger.debug("Received extension message in provider", { type: data.type });
        }
    }

    public setLastObjectsCount(count: number): void {
        this._lastObjectsCount = count;
    }

    public get lastVisualReport(): VisualReportMessage['payload'] | undefined {
        return this._lastVisualReport;
    }

    public get lastObjectsCount(): number {
        return this._lastObjectsCount;
    }

    public getHtmlForWebview(webview: vscode.Webview): string {
        logger.debug("Generating HTML for webview", { webview });
        return getWebviewContent(webview, this._extensionUri);
    }
}
