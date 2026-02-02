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

    private log(level: Severity, message: string, context?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString();

        // Post back to extension for centralized logging (Output Channel) if API is present
        this.vscode.forEach(api => {
            const msg: WebviewToExtensionMessage = {
                type: "LOG",
                payload: {
                    severity: level,
                    message,
                    context,
                    timestamp
                }
            };
            api.postMessage(msg);
        });

        // Note: Webview environment doesn't have access to Node.js streams
        // All logging goes through the extension host for proper aggregation
    }

    debug(message: string, context?: Record<string, unknown>): void { this.log("DEBUG", message, context); }
    info(message: string, context?: Record<string, unknown>): void { this.log("INFO", message, context); }
    warn(message: string, context?: Record<string, unknown>): void { this.log("WARN", message, context); }
    error(message: string, context?: Record<string, unknown>): void { this.log("ERROR", message, context); }
}
