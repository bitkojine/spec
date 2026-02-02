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
 * A minimal logger that does nothing - forces proper logger implementation.
 */
class ConsoleLogger implements ILogger {
    constructor(_serviceName: string) { }

    private log(_level: Severity, _message: string, _context?: Record<string, unknown>): void {
        // Intentionally empty - forces use of proper logging infrastructure
        // Real implementations should use ELK transport or webview bridging
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
