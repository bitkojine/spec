/**
 * @file errors.cts
 * @description Domain-specific error types for the extension.
 * Following reliability/01-error-handling.md.
 */

export type ErrorSeverity = 'FATAL' | 'RETRYABLE' | 'NON_RETRYABLE' | 'UI_ONLY';

export interface AppErrorOptions {
    code: string;
    severity: ErrorSeverity;
    message: string;
    context?: Record<string, unknown>;
    cause?: Error;
}

export class AppError extends Error {
    public readonly code: string;
    public readonly severity: ErrorSeverity;
    public readonly context: Record<string, unknown>;

    constructor(options: AppErrorOptions) {
        super(options.message);
        this.name = this.constructor.name;
        this.code = options.code;
        this.severity = options.severity;
        this.context = options.context ?? {};
        this.cause = options.cause;

        // Ensure stack trace is correctly captured
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export type ErrorCode =
    | "PARSING_FAILED"
    | "CANCELLATION_REQUESTED"
    | "WEBVIEW_MESSAGE_INVALID";

export class VisualizerError extends AppError {
    constructor(
        code: ErrorCode,
        message: string,
        severity: ErrorSeverity = 'NON_RETRYABLE'
    ) {
        super({
            code,
            severity,
            message
        });
    }
}

