/**
 * @file logger.cts
 * @description Common logger interface and global proxy for Code 3D Visualizer.
 * Supports different implementations for Extension Host and Webview.
 */

import { Severity } from './contract.cjs';

export interface ILogger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
}

/**
 * A simple console-based logger as a fallback.
 */
class ConsoleLogger implements ILogger {
    constructor(private serviceName: string) { }

    private log(level: Severity, message: string, context?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString();
        const payload = JSON.stringify({ timestamp, level, service: this.serviceName, message, context });

        /* eslint-disable no-console -- Disabling because this is the fallback ConsoleLogger implementation. */
        switch (level) {
            case "DEBUG": console.debug(payload); break;
            case "INFO": console.info(payload); break;
            case "WARN": console.warn(payload); break;
            case "ERROR":
            case "FATAL": console.error(payload); break;
        }
        /* eslint-enable no-console -- Restoring console check after fallback logger block. */
    }

    debug(message: string, context?: Record<string, unknown>) { this.log("DEBUG", message, context); }
    info(message: string, context?: Record<string, unknown>) { this.log("INFO", message, context); }
    warn(message: string, context?: Record<string, unknown>) { this.log("WARN", message, context); }
    error(message: string, context?: Record<string, unknown>) { this.log("ERROR", message, context); }
}

let currentLogger: ILogger = new ConsoleLogger("Default");

export const logger: ILogger = {
    debug: (m, c) => currentLogger.debug(m, c),
    info: (m, c) => currentLogger.info(m, c),
    warn: (m, c) => currentLogger.warn(m, c),
    error: (m, c) => currentLogger.error(m, c),
};

/**
 * Updates the global logger implementation.
 */
export function setLogger(l: ILogger): void {
    currentLogger = l;
}
