# Strict Error Handling & Fault Tolerance

## 1. Purpose
Unpredictable software behavior is rarely caused by a complete system crash; it is more often the result of improperly handled exceptions that leave the application in an inconsistent state. This specification mandates a deterministic approach to error representation and handling to ensure the system remains observable and resilient.

## 2. Core Rule: No "Generic" Errors
The use of the base `Error` class or string-only errors is **PROHIBITED** for domain-specific logic. All errors MUST be represented by an instance of `AppError` or its subclasses.

## 3. Canonical Representation (Normative)

All errors must comply with the following TypeScript structure:

### 3.1. Error Severity
Every error MUST be categorized into exactly one of these levels:
*   `FATAL`: System-wide failure; process or major component must restart.
*   `RETRYABLE`: Transient failure (e.g., network timeout); operation should be retried.
*   `NON_RETRYABLE`: Logical failure (e.g., invalid input); operation will fail again if retried.
*   `UI_ONLY`: Handled failure that only requires user notification, no system risk.

### 3.2. Code Structure
Every error MUST have a unique, machine-readable string code in `SCREAMING_SNAKE_CASE`, prefixed by the component name.
Example: `WORKSPACE_FILE_NOT_FOUND`, `PARSER_INVALID_SYNTAX`.

### 3.3. Base Class Template
This is the mandatory base implementation for all system errors:

```typescript
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
```

## 4. Operational Rules (Normative)

### 4.1. Catch-Block Requirements
*   **FORBIDDEN**: Empty catch blocks.
*   **REQUIRED**: Every caught error must be either:
    1. Logged via the approved `Logger` interface.
    2. Enriched and rethrown as an `AppError`.
    3. Handled with a documented fallback (e.g., returning a default value).

### 4.2. Boundary Protection
All entry points (API handlers, Webview message listeners) MUST be wrapped in a top-level try-catch that:
1. Maps uncaught exceptions to a `FATAL` or `NON_RETRYABLE` `AppError`.
2. Sanitizes the message for the user.
3. Logs the full trace and context.

## 5. Examples

### 5.1. Creating a Specialized Error
```typescript
class FileNotFoundError extends AppError {
  constructor(filePath: string) {
    super({
      code: 'WORKSPACE_FILE_NOT_FOUND',
      severity: 'NON_RETRYABLE',
      message: `File not found at path: ${filePath}`,
      context: { filePath }
    });
  }
}
```

### 5.2. Handling and Wrapping
```typescript
try {
  await fs.readFile(path);
} catch (err) {
  throw new FileNotFoundError(path); // Wrap low-level error in domain-specific AppError
}
```

## 6. AI Agent Requirements
AI coding agents **MUST**:
1. Refuse to use `new Error("message")` or `throw "message"`.
2. Auto-generate `AppError` subclasses for new failure modes identified during implementation.
3. Ensure every catch block contains at least one call to `Logger.error()` or a `throw`.

## 7. CI Enforcement
*   **Static Analysis**: ESLint MUST flag `new Error()` or `throw` statements that do not use `AppError`.
*   **Traceability**: Build fails if any `AppError` instantiation lacks a `code` or `severity`.

## 8. Summary
By standardizing on `AppError` and explicit `ErrorSeverity`, we move error handling from "accidental" cleanup to a first-class citizen of the architecture. Every failure is now a data point for observability and a hook for automated recovery.
