/**
 * @file webview-logger.mts
 * @description Bridges webview logging to the Extension Host via vscode.postMessage.
 */

import { ILogger } from '../common/logger.cjs';
import { Severity, WebviewToExtensionMessage } from '../common/contract.cjs';
import { VSCodeApi } from './types.mjs';
import { Option } from '../common/option.mjs';

export class WebviewLogger implements ILogger {
    constructor(
        private readonly vscode: Option<VSCodeApi>
    ) { }

    private log(level: Severity, message: string, context?: Record<string, unknown>, correlationId?: string): void {
        const timestamp = new Date().toISOString();

        // Post back to extension for centralized logging (Output Channel) if API is present
        this.vscode.forEach(api => {
            const msg: WebviewToExtensionMessage = {
                type: "LOG",
                payload: {
                    level,
                    serviceId: "Webview",
                    correlationId: correlationId || `web-${Date.now()}`,
                    message,
                    context,
                    "@timestamp": timestamp
                }
            };
            api.postMessage(msg);
        });
    }

    debug(message: string, context?: Record<string, unknown>, cid?: string): void { this.log("DEBUG", message, context, cid); }
    info(message: string, context?: Record<string, unknown>, cid?: string): void { this.log("INFO", message, context, cid); }
    warn(message: string, context?: Record<string, unknown>, cid?: string): void { this.log("WARN", message, context, cid); }
    error(message: string, context?: Record<string, unknown>, cid?: string): void { this.log("ERROR", message, context, cid); }
}
