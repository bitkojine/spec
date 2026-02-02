/**
 * @file extension-logger.cts
 * @description VSCode-specific implementation of structured logging.
 */

import * as vscode from 'vscode';
import { Severity } from '../common/contract.cjs';

export interface LogEntry {
    timestamp: string;
    level: Severity;
    service: string;
    message: string;
    context?: Record<string, unknown>;
}

export class StructuredLogger {
    private outputChannel: vscode.OutputChannel;
    private serviceName: string;

    constructor(serviceName: string) {
        this.serviceName = serviceName;
        this.outputChannel = vscode.window.createOutputChannel("Code 3D Visualizer");
    }

    private log(level: Severity, message: string, context?: Record<string, unknown>): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            message,
            context
        };

        // In production, this would go to a log aggregator. 
        // For VSCode, we output JSON string to the output channel.
        const payload = JSON.stringify(entry);
        this.outputChannel.appendLine(payload);

        // ALWAYS write to console as well if we are in a test/dev environment 
        // so that cli-to-elk.mjs can capture the logs from the spawned process.
        if (process.env.STRESS_TEST === 'true' || process.env.LOG_LEVEL === 'debug') {
            /* eslint-disable-next-line no-console -- Required for ELK transport via stdout to capture extension host logs during tests */
            console.log(payload);
        }

        if (level === "ERROR" || level === "FATAL") {
            this.outputChannel.show(true);
        }
    }

    public debug(message: string, context?: Record<string, unknown>): void {
        this.log("DEBUG", message, context);
    }

    public info(message: string, context?: Record<string, unknown>): void {
        this.log("INFO", message, context);
    }

    public warn(message: string, context?: Record<string, unknown>): void {
        this.log("WARN", message, context);
    }

    public error(message: string, context?: Record<string, unknown>): void {
        this.log("ERROR", message, context);
    }
}

export const extensionLogger = new StructuredLogger("ExtensionHost");
import { setLogger } from '../common/logger.cjs';
setLogger(extensionLogger);
