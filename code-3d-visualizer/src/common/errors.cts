/**
 * @file errors.cts
 * @description Domain-specific error types for the extension.
 * Following reliability/01-error-handling.md.
 */

export type ErrorCode =
    | "PARSING_FAILED"
    | "CANCELLATION_REQUESTED"
    | "WEBVIEW_MESSAGE_INVALID";

export class VisualizerError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = "VisualizerError";
    }
}
