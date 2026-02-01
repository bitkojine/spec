# Logging Standards Engineering Specification

## 1. Overview

This specification establishes a strict policy for logging within production-quality software systems. The primary objective is to ensure that all runtime diagnostic information is structured, searchable, and actionable, while minimizing operational, security, and performance risks associated with ad-hoc logging mechanisms.

Ad-hoc logging (e.g., `console.log`, `print`, `stdout`) is prohibited in production code paths because it lacks the structure required for automated analysis, often bypasses security redaction layers, and can cause performance bottlenecks or storage exhaustion in high-throughput environments.

## 2. Applicability

This specification applies to all production software, supporting infrastructure, and automated coding agents operating within the organization. All new code MUST comply with these standards, and existing codebases SHOULD be migrated according to the timeline defined in Section 9.

## 3. Definitions

*   **Structured Logging**: A technique where logs are emitted as machine-readable data structures (typically JSON) rather than plain text strings.
*   **Ad-hoc Logging**: Direct output to system streams (stdout/stderr) or browser consoles using language primitives like `console.log`, `print`, or `fmt.Println`.
*   **Log Level**: A severity indicator (e.g., DEBUG, INFO, WARN, ERROR, FATAL) used to filter and prioritize log data.
*   **Correlation ID**: A unique identifier attached to all logs within a single request or transaction flow to enable end-to-end tracing.
*   **Log Aggregator**: A centralized system (e.g., ELK stack, Datadog, CloudWatch) that collects, indexes, and stores logs from multiple services.

## 4. Normative Rules

### 4.1. Prohibition of Ad-hoc Logging
*   Ad-hoc logging mechanisms MUST NOT be used in production code paths.
*   Explicit calls to `console.log`, `console.info`, `console.warn`, `console.error`, and their language-specific equivalents (e.g., `print()`, `puts`) MUST be removed or replaced before deployment to production-equivalent environments.

### 4.2. Mandatory Structured Logging Interface
*   All runtime logs MUST be emitted through an approved logging library or interface.
*   The output format MUST be JSON or an equivalent structured format supported by the organization's Log Aggregator.
*   Every log entry MUST contain at least:
    *   Timestamp (ISO 8601 format)
    *   Log Level
    *   Service/Component Name
    *   Message (concise summary)
    *   Contextual Data (relevant metadata)

### 4.3. Log Level Standards
Loggers MUST support the following levels:
*   **DEBUG**: Granular information for development and troubleshooting. SHOULD NOT be enabled in production by default.
*   **INFO**: Significant operational events (e.g., service startup, successful transaction).
*   **WARN**: Potentially harmful situations that do not halt execution.
*   **ERROR**: Error events that prevent specific operations but allow the system to continue running.
*   **FATAL**: Severe errors that cause the application or a critical component to terminate.

### 4.4. Tracing and Correlation
*   Correlation IDs MUST be included in every log entry associated with a request or background task.
*   The Correlation ID MUST be propagated through all downstream service calls.

### 4.5. Data Security and Privacy
*   Sensitive data (e.g., PII, passwords, authentication tokens, credit card numbers) MUST NOT be logged.
*   The logging infrastructure MUST implement automatic redaction or masking for known sensitive patterns.

## 5. Environment Distinctions

### 5.1. Production and Staging
*   Compliance with this specification is MANDATORY.
*   Log level SHOULD be set to `INFO` or higher.
*   Logs MUST be forwarded to the centralized Log Aggregator.

### 5.2. Local Development
*   Ad-hoc logging MAY be used temporarily for debugging during local development but MUST NOT be committed to the repository.
*   Developers SHOULD use the structured logging interface even in local environments to ensure consistency.
*   A "pretty-print" formatter MAY be used locally to transform structured JSON into human-readable text.

## 6. Enforcement Mechanisms

### 6.1. Static Analysis
*   ESLint, Ruff, or equivalent linters MUST be configured to error on `console.log` and similar primitives.
*   CI/CD pipelines MUST fail if prohibited logging patterns are detected.

### 6.2. CI/CD Checks
*   Build pipelines MUST verify that the logging configuration for the target environment is present and valid.

### 6.3. Code Review
*   Reviewers MUST verify that logs provide sufficient context for troubleshooting without exposing sensitive information.
*   Reviewers MUST reject any code containing ad-hoc logging primitives.

## 7. Rationale

### Observability
Structured logs allow for complex queries, dashboards, and automated alerting. Text-based logs require expensive and fragile regex parsing, making them unsuitable for modern observability.

### Security and Compliance
Ad-hoc logging bypasses the audit trails and redaction filters built into central logging services. This significantly increases the risk of data leakage.

### Performance
Standardized logging libraries often utilize asynchronous I/O and buffering. Direct writes to `stdout` are blocking and can severely degrade performance under high load.

## 8. Examples

### 8.1. Non-Compliant Code
```javascript
// PROHIBITED: Ad-hoc logging to console
function processOrder(order) {
    console.log("Processing order: " + order.id);
    if (!order.items) {
        console.error("Order missing items!");
        return;
    }
}
```

### 8.2. Compliant Code (Pseudocode)
```javascript
// COMPLIANT: Using structured logging interface
const logger = require('./logger');

function processOrder(order) {
    logger.info("Processing order", {
        order_id: order.id,
        item_count: order.items.length,
        correlation_id: getCorrelationId()
    });

    if (!order.items) {
        logger.error("Order processing failed", {
            reason: "MISSING_ITEMS",
            order_id: order.id,
            correlation_id: getCorrelationId()
        });
        return;
    }
}
```

## 9. Migration Guidance

### 9.1. Deprecation Strategy
1.  **Phase 1 (Immediate)**: All new code MUST use the structured logging interface.
2.  **Phase 2**: Introduce linting rules as warnings in existing repositories.
3.  **Phase 3**: Convert linting warnings to errors.
4.  **Phase 4**: Automated refactoring (codemods) to replace simple print statements with structured logger calls where possible.
