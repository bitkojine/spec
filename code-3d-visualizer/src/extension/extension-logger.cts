/**
 * @file extension-logger.cts
 * @description VSCode-specific implementation of structured logging.
 */

import * as vscode from 'vscode';
import { Severity } from '../common/contract.cjs';
import { NodeElkLogger } from '../common/node-elk-logger.cjs';
import { ILogger } from '../common/logger.cjs';

export interface LogEntry {
    "@timestamp": string;
    level: Severity;
    serviceId: string;
    correlationId: string;
    message: string;
    context?: Record<string, unknown>;
}

export class StructuredLogger implements ILogger {
    private outputChannel: vscode.OutputChannel;
    private elkLogger: NodeElkLogger;

    constructor(serviceName: string) {
        this.outputChannel = vscode.window.createOutputChannel("Code 3D Visualizer");
        this.elkLogger = new NodeElkLogger(serviceName);
    }

    private log(level: Severity, message: string, context?: Record<string, unknown>, correlationId?: string): void {
        const levels: Record<Severity, number> = { "DEBUG": 0, "INFO": 1, "WARN": 2, "ERROR": 3, "FATAL": 4 };
        const minLevel = levels[process.env.LOG_LEVEL as Severity] ?? 1;
        if (levels[level] < minLevel) return;

        const entry: LogEntry = {
            "@timestamp": new Date().toISOString(),
            level,
            serviceId: "ExtensionHost",
            correlationId: correlationId || `ext-${process.pid}-${Date.now()}`,
            message,
            context
        };

        // Output to VSCode channel for development visibility
        const payload = JSON.stringify(entry);
        this.outputChannel.appendLine(payload);

        // Send to ELK stack - if this fails, let it crash
        this.elkLogger[level.toLowerCase() as keyof ILogger](message, context, entry.correlationId);

        if (level === "ERROR" || level === "FATAL") {
            this.outputChannel.show(true);
        }
    }

    public debug(message: string, context?: Record<string, unknown>, cid?: string): void {
        this.log("DEBUG", message, context, cid);
    }

    public info(message: string, context?: Record<string, unknown>, cid?: string): void {
        this.log("INFO", message, context, cid);
    }

    public warn(message: string, context?: Record<string, unknown>, cid?: string): void {
        this.log("WARN", message, context, cid);
    }

    public error(message: string, context?: Record<string, unknown>, cid?: string): void {
        this.log("ERROR", message, context, cid);
    }
}

export const extensionLogger = new StructuredLogger("ExtensionHost");
import { setLogger } from '../common/logger.cjs';
setLogger(extensionLogger);
