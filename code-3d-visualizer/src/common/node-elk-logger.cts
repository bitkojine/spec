/**
 * @file node-elk-logger.cts
 * @description Node.js-specific ELK logger that crashes if ELK transport is unavailable.
 */

import { Severity } from './contract.cjs';
import { initializeElkTransport, sendToElk, LogEntry } from './elk-transport.cjs';
import { ILogger } from './logger.cjs';

export class NodeElkLogger implements ILogger {
    constructor(private serviceName: string) { 
        // Initialize ELK transport - will crash if this fails
        initializeElkTransport({
            enabled: true // Force enabled - no fallback
        });
    }

    private log(level: Severity, message: string, context?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString();

        // Send to ELK stack - if this fails, let it crash
        const elkEntry: LogEntry = {
            timestamp,
            level,
            service: this.serviceName,
            message,
            context
        };
        sendToElk(elkEntry);
    }

    debug(message: string, context?: Record<string, unknown>): void { this.log("DEBUG", message, context); }
    info(message: string, context?: Record<string, unknown>): void { this.log("INFO", message, context); }
    warn(message: string, context?: Record<string, unknown>): void { this.log("WARN", message, context); }
    error(message: string, context?: Record<string, unknown>): void { this.log("ERROR", message, context); }
}
