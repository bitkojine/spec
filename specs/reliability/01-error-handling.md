# Strict Error Handling & Fault Tolerance

## Background / Motivation
Unpredictable software behavior is rarely caused by a complete system crash; it is more often the result of improperly handled exceptions that leave the application in an inconsistent state. Robust engineering requires that every failure is anticipated, categorized, and handled with intention.

- **Eliminate Silent Failures**: Swallowing errors makes debugging impossible and hides systemic issues from monitoring tools.
- **Categorized Remediation**: Not all errors are equal. Distinguishing between transient failures (retryable) and logic errors (fatal) is critical for system resilience.
- **Observability**: Structured error handling ensures that telemetry and logs provide actionable context without requiring manual code inspection.
- **User Trust**: Providing clear, safe, and actionable feedback during failures prevents user frustration and accidental data loss.

## Rule Definition
This codebase enforces a zero-tolerance policy for ad-hoc or negligent error handling:
- **No Catch-All Swallowing**: Exception catch blocks must never be empty. Every caught error must be either rethrown, logged via the established logging standards, or handled with a documented fallback strategy.
- **Mandatory Error Context**: Generic error types are prohibited for domain logic. Use specialized error representations that include machine-readable codes and relevant context.
- **Categorize by Severity**: Errors must be explicitly categorized (e.g., as `RETRYABLE` for transient issues or `FATAL` for terminal logic errors).
- **Boundary Protection**: All system entry points (API endpoints, UI handlers, background jobs) must have a protective boundary that prevents uncaught exceptions from crashing the process or freezing the interface.
- **Sanitized Messages**: Error messages exposed to external users or systems must be sanitized to prevent leaking internal technical details (e.g., stack traces, database schemas, or system paths).

## Standard Patterns

### Specialized Error Representations
Define a clear hierarchy or categorization scheme to allow consumers to handle specific failure modes without resorting to text-based parsing.

### Purposeful Exception Handling
Only handle exceptions that you can actually remediate. Otherwise, allow them to propagate to a higher-level boundary where they can be properly processed or logged.

## Examples

### Incorrect Implementation (Silent & Generic)
The failure is lost, and the system is left in an unknown state with no indication of what went wrong or if it can be recovered.
```text
// NO: Silent failure and loss of context
// try { execute_operation() } catch (error) { log("error") }
```

### Correct Implementation (Structured & Intentional)
The error is enriched with specific context and a retryability hint, enabling automated recovery and precise monitoring.
```text
// YES: Intentional handling
// 1. Catch the low-level failure.
// 2. Wrap it in a domain-specific error with a machine-readable code (e.g., ERR_DB_TIMEOUT).
// 3. Mark the error as RETRYABLE: TRUE.
// 4. Log the structured error and rethrow or return it to the caller.
```

## Tooling & Enforcement

### Static Analysis
- Enforce rules that prohibit empty catch blocks.
- Enforce the use of domain-specific error types rather than generic system exceptions in core business logic.

### CI Expectations
- **Error Path Verification**: Critical business flows must include tests that specifically verify that failures are handled according to the specification.
- **Diagnostic Validation**: Automated checks should verify that persistent error records contain sufficient metadata for diagnosis.

## Non-Goals
- **Over-Catching**: Do not catch exceptions everywhere. Propagation is a valid and often preferred strategy as long as global boundaries exist.
- **Hyperspecific Class Hierarchies**: Avoid creating hundreds of hyperspecific error types. A few well-defined categories with flexible metadata are more effective.

## Summary
Error handling is not an "alternative" flow; it is a core part of the system's logic. By standardizing how we fail, we ensure that our software remains predictable, maintainable, and observable even under stress. Every potential failure point must be addressed with intention.
