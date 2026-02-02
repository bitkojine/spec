/**
 * @file webview-logger.mts
 * @description Bridges webview logging to the Extension Host via vscode.postMessage.
 */

import { ILogger } from '../common/logger.cjs';
import { Severity, WebviewToExtensionMessage } from '../common/contract.cjs';
import { VSCodeApi } from './types.mjs';
import { Option } from '../common/option.cjs';

export class WebviewLogger implements ILogger {
    constructor(
        private readonly vscode: Option<VSCodeApi>,
        private readonly serviceName: string = "Webview"
    ) { }

    private log(level: Severity, message: string, context?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString();

        // 1. Post back to extension for centralized logging (Output Channel) if API is present
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

        // 2. Also log to console for local debugging (Real browser API)
        /* eslint-disable no-console -- Fallback for webview environment before specialized logging is available. */
        const payload = JSON.stringify({ timestamp, level, service: this.serviceName, message, context });
        switch (level) {
            case "DEBUG": console.debug(payload); break;
            case "INFO": console.info(payload); break;
            case "WARN": console.warn(payload); break;
            case "ERROR":
            case "FATAL": console.error(payload); break;
        }
        /* eslint-enable no-console -- Restoring console check after fallback logger block. */
    }

    debug(message: string, context?: Record<string, unknown>): void { this.log("DEBUG", message, context); }
    info(message: string, context?: Record<string, unknown>): void { this.log("INFO", message, context); }
    warn(message: string, context?: Record<string, unknown>): void { this.log("WARN", message, context); }
    error(message: string, context?: Record<string, unknown>): void { this.log("ERROR", message, context); }
}
