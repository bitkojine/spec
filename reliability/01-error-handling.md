# Strict Error Handling & Fault Tolerance

## Background / Motivation
Unpredictable software behavior is rarely caused by a complete system crash; it is more often the result of improperly handled exceptions that leave the application in an inconsistent state. Robust engineering requires that every failure is anticipated, categorized, and handled with intention.

- **Eliminate Silent Failures**: Swallowing errors makes debugging impossible and hides systemic issues from monitoring tools.
- **Categorized Remediation**: Not all errors are equal. Distinguishing between transient failures (retryable) and logic errors (fatal) is critical for system resilience.
- **Observability**: Structured error handling ensures that logs and telemetry provide actionable context without requiring manual code inspection.
- **User Trust**: Providing clear, safe, and actionable feedback during failures prevents user frustration and accidental data loss.

## Rule Definition
This codebase enforces a zero-tolerance policy for ad-hoc or negligent error handling:
- **No Catch-All Swallowing**: `catch` blocks must never be empty. Every caught error must be either rethrown, logged via the [Logging Standards](file:///Users/name/trusted-git/oss/spec/logging/01-logging-standards.md), or handled with a documented fallback strategy.
- **Mandatory Error Context**: Generic `Error` objects are prohibited for domain logic. Use specialized error classes that include machine-readable codes and context.
- **Categorize by Severity**: Errors must be explicitly marked as `RETRYABLE` (e.g., network timeout) or `FATAL` (e.g., invalid configuration).
- **Boundary Protection**: All top-level entry points (API handlers, UI event listeners, Cron jobs) must have a "Global Catch" that prevents process exit or UI freeze.
- **Sanitized Messages**: Error messages shown to users must be sanitized to prevent leaking internal system details (paths, stack traces, database schemas).

## Standard Patterns

### Specialized Error Classes
Create clear hierarchies to allow consumers to handle specific failure modes without resorting to string parsing.

```typescript
export enum ErrorCode {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  UNAUTHORIZED = "UNAUTHORIZED",
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryable: boolean = false,
    public readonly meta: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

### Purposeful Catching
Only catch errors you can actually handle. Otherwise, let them bubble up to a higher-level boundary.

```typescript
try {
  await db.connect();
} catch (error) {
  // Catching because we have a specific remediation strategy
  throw new AppError(
    ErrorCode.SERVICE_UNAVAILABLE,
    "Database connection failed",
    true, // Mark as retryable
    { originalError: error }
  );
}
```

## Examples

### Incorrect Implementation (Silent & Generic)
The error is lost, and the caller has no idea why the operation failed or if it's safe to retry.
```typescript
// NO: Silent failure and loss of context
async function updateUser(data) {
  try {
    await api.post("/user", data);
  } catch (e) {
    console.log("error"); // Useless logging
  }
}
```

### Correct Implementation (Structured & Intentional)
The error is wrapped with context and categorization, allowing for automated retries or clear UI state updates.
```typescript
// YES: Intentional handling
async function updateUser(data: UserData) {
  try {
    await api.post("/user", data);
  } catch (error) {
    const appError = new AppError(
      ErrorCode.SERVICE_UNAVAILABLE,
      "Failed to update user profile",
      true, // It's an API call, potentially transient
      { userId: data.id }
    );
    
    logger.error(appError); // Log structured data
    throw appError; // Propagate for UI handling
  }
}
```

## Tooling & Enforcement

### Static Analysis (ESLint)
- Enable `no-empty-blocks` for catch statements.
- Custom rule: `prohibit-generic-error` - flags `throw new Error()` in business logic.
- Custom rule: `require-error-logging` - ensures caught errors are passed to the logging utility.

### CI Expectations
- **Error Path Testing**: Critical business paths must have unit tests that specifically trigger and verify error handling logic (ensuring the system fails *correctly*).
- **Log Validation**: Automated tests should verify that error logs contain the required metadata (ErrorCode, context).

## Non-Goals
- **Catching Everwhere**: Do not wrap every line in a try-catch. Bubbling is a valid strategy as long as there is a protective boundary at the top level.
- **Complex Hierarchies**: Avoid "Class Explosion." A few well-defined error types with flexible metadata are better than dozens of hyperspecific classes.

## Summary
Error handling is not an "alternative" flow; it is a core part of the system's logic. By standardizing how we fail, we ensure that our software remains predictable, maintainable, and observable even under stress.
