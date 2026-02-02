/**
 * @file webview-provider.cts
 * @description Manages the VSCode Webview lifecycle for the 3D panel.
 */

import * as vscode from 'vscode';
import { isWebviewMessage, VisualReportMessage, isExtensionMessage } from '../common/contract.cjs';
import { logger } from '../common/logger.cjs';
import { getWebviewContent } from './webview-template.cjs';


type ProviderState =
    | { status: 'initializing'; resolveReady: () => void }
    | { status: 'active'; lastReport?: VisualReportMessage['payload']; objectCount: number };

export class VisualizerWebviewProvider {
    private _state: ProviderState;
    public readonly webviewReadyPromise: Promise<void>;
    private readonly _extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;

        let resolve!: () => void;
        this.webviewReadyPromise = new Promise((r) => { resolve = r; });
        this._state = { status: 'initializing', resolveReady: resolve };
    }

    public handleWebviewMessage(data: unknown): void {
        if (isWebviewMessage(data)) {
            switch (data.type) {
                case "READY":
                    if (this._state.status === 'initializing') {
                        this._state.resolveReady();
                        this._state = { status: 'active', objectCount: 0 };
                        logger.info("Webview reported READY. Transitioned to 'active' state.");
                    } else {
                        logger.warn("Received READY signal while already active.");
                    }
                    break;

                case "VISUAL_REPORT":
                    if (this._state.status === 'active') {
                        this._state = { ...this._state, lastReport: data.payload };
                        logger.info("Received visual report", data.payload);
                    } else {
                        logger.warn("Received VISUAL_REPORT while initializing (ignored).");
                    }
                    break;

                case "LOG":
                    // Call logging logic (pure function or dedicated method)
                    this.handleLogMessage(data.payload);
                    break;
            }
        } else if (isExtensionMessage(data)) {
            logger.debug("Received extension message in provider (ignored)", { type: data.type });
        }
    }

    private handleLogMessage(payload: {
        level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
        serviceId: string;
        correlationId: string;
        message: string;
        context?: Record<string, unknown>;
        "@timestamp": string;
    }): void {
        const { level, message, context, correlationId, serviceId } = payload;
        const enrichedContext = { ...context, originalServiceId: serviceId };
        switch (level) {
            case "DEBUG": logger.debug(message, enrichedContext, correlationId); break;
            case "INFO": logger.info(message, enrichedContext, correlationId); break;
            case "WARN": logger.warn(message, enrichedContext, correlationId); break;
            case "ERROR":
            case "FATAL": logger.error(message, enrichedContext, correlationId); break;
        }
    }

    public setLastObjectsCount(count: number): void {
        if (this._state.status === 'active') {
            this._state = { ...this._state, objectCount: count };
        } else {
            // If initialized but not active (ready), we can't really track this state meaningfully in the 'active' bucket yet
            // preventing invalid state where we have count but no active session
            logger.warn("Attempted to set object count while initializing.");
        }
    }

    public get lastVisualReport(): VisualReportMessage['payload'] | undefined {
        return this._state.status === 'active' ? this._state.lastReport : undefined;
    }

    public get lastObjectsCount(): number {
        return this._state.status === 'active' ? this._state.objectCount : 0;
    }

    public getHtmlForWebview(webview: vscode.Webview): string {
        logger.debug("Generating HTML for webview", { webview });
        return getWebviewContent(webview, this._extensionUri);
    }
}
