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
        this.outputChannel.appendLine(JSON.stringify(entry));

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
