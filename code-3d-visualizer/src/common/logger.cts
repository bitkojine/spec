/**
 * @file logger.cts
 * @description Common logger interface and global proxy for Code 3D Visualizer.
 * Supports different implementations for Extension Host and Webview.
 */

import { Severity } from './contract.cjs';

export interface ILogger {
    debug(message: string, context?: Record<string, unknown>, correlationId?: string): void;
    info(message: string, context?: Record<string, unknown>, correlationId?: string): void;
    warn(message: string, context?: Record<string, unknown>, correlationId?: string): void;
    error(message: string, context?: Record<string, unknown>, correlationId?: string): void;
}

/**
 * A minimal logger that does nothing - forces proper logger implementation.
 */
class ConsoleLogger implements ILogger {
    constructor(_serviceName: string) { }

    private log(_level: Severity, _message: string, _context?: Record<string, unknown>, _correlationId?: string): void {
        // Intentionally empty - forces use of proper logging infrastructure
        // Real implementations should use ELK transport or webview bridging
    }

    debug(message: string, context?: Record<string, unknown>, correlationId?: string) { this.log("DEBUG", message, context, correlationId); }
    info(message: string, context?: Record<string, unknown>, correlationId?: string) { this.log("INFO", message, context, correlationId); }
    warn(message: string, context?: Record<string, unknown>, correlationId?: string) { this.log("WARN", message, context, correlationId); }
    error(message: string, context?: Record<string, unknown>, correlationId?: string) { this.log("ERROR", message, context, correlationId); }
}

let currentLogger: ILogger = new ConsoleLogger("Default");

export const logger: ILogger = {
    debug: (m, c, cid) => currentLogger.debug(m, c, cid),
    info: (m, c, cid) => currentLogger.info(m, c, cid),
    warn: (m, c, cid) => currentLogger.warn(m, c, cid),
    error: (m, c, cid) => currentLogger.error(m, c, cid),
};

/**
 * Updates the global logger implementation.
 */
export function setLogger(l: ILogger): void {
    currentLogger = l;
}
