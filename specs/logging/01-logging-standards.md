# Logging Standards Engineering Specification

## 1. Purpose & Scope

This specification establishes the mandatory standards for application logging within the codebase. The primary objective is to ensure high observability, security, and operational reliability by mandating structured logging and centralized ingestion into the **ELK stack (Elasticsearch, Logstash, Kibana)**.

Ad-hoc console output is strictly prohibited in production environments. All diagnostic data MUST be emitted through standardized, machine-readable interfaces to enable automated monitoring, alerting, and long-term auditability.

## 2. Definitions

*   **Console Logging**: Direct output to system streams (`stdout`, `stderr`) or browser-specific consoles using primitives like `console.log`, `print`, `fmt.Println`, or equivalent language statements.
*   **Structured Logging**: A logging methodology where messages are emitted as machine-readable data structures (typically JSON) rather than plain text strings, containing consistent metadata fields.
*   **Centralized Logging**: The process of aggregating logs from all distributed components into a unified system (the ELK stack) for storage, indexing, and analysis.
*   **Log Violation**: Any instance of ad-hoc logging primitives remaining in production code paths or any log emitted that bypasses the approved centralized pipeline.

## 3. Normative Requirements

### 3.1. Prohibition of Ad-Hoc Output
*   Developers MUST NOT use `console.log`, `console.info`, `console.warn`, `console.error`, or language-equivalent primitives (e.g., `print()`) for application logging.
*   All such ad-hoc statements MUST be removed or replaced with approved logging interface calls before code is committed to the main branch.

### 3.2. Centralized Ingestion (ELK)
*   All application logs MUST be sent through approved logging interfaces that are configured to feed the ELK stack.
*   Logs MUST NOT be written to local files only; they MUST be accessible via Kibana for production troubleshooting.

### 3.3. Log Structure and Levels
*   **Format**: All logs MUST be emitted in a structured JSON format.
*   **Standard Fields**: Every log entry MUST include:
    *   `timestamp`: ISO 8601 format.
    *   `level`: One of `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`.
    *   `service_id`: Unique identifier for the emitting service.
    *   `correlation_id`: For tracing requests across distributed components.
    *   `message`: A concise, human-readable summary.
*   **Levels**:
    *   `DEBUG`: Granular info for troubleshooting.
    *   `INFO`: General operational events.
    *   `WARN`: Non-critical issues that may require attention.
    *   `ERROR`: Critical failures affecting specific operations.
    *   `FATAL`: System-wide failures requiring immediate intervention.

## 4. Allowed Exceptions

While application code is strictly governed, the following exceptions apply:

*   **Local Development Tooling**: Scripts or tools intended solely for local developer or workstation use (not deployed) MAY use console output for immediate feedback.
*   **Test Runners**: CLI output from test runners (e.g., `jest`, `pytest`) is permitted to provide developer feedback during the CI process.
*   **Build/CI Scripts**: Deployment and build automation scripts MAY use console output to report progress and status.
*   **Isolation**: Any code using these exceptions MUST be physically isolated (e.g., in `tools/`, `scripts/`, or `*.test.ts`) and MUST NOT be imported into production runtime paths.

## 5. Enforcement & Verification

### 5.1. Automated Enforcement
*   **Linting**: Static analysis tools (e.g., ESLint `no-console` rule) MUST be configured to treat ad-hoc logging as a build-breaking error.
*   **CI Checks**: The CI pipeline MUST scan for prohibited patterns (`console.\w+`, `print\(`) and fail the build if detected in production source directories.

### 5.2. Verification
*   **Code Review**: Reviewers MUST ensure that new logs provide adequate context/metadata and adhere to the structured format.
*   **Observability Audit**: Periodically, logs in Kibana SHOULD be reviewed to ensure expected fields are present and searchable.

## 6. Rationale & Trade-offs

### 6.1. Why Prohibit Console Logging?
*   **Searchability**: Plain text console output is difficult to query across thousands of containers.
*   **Correlation**: Centralized logging allows us to trace a single request through multiple microservices using a `correlation_id`.
*   **Security**: Centralized pipelines can implement automated redaction of sensitive data (PII).
*   **Performance**: Standardized loggers often use non-blocking, buffered I/O, whereas direct `stdout` writes can block execution.

### 6.2. Operational Benefits
*   **Alerting**: ELK enables automated alerts based on log patterns (e.g., error rate spikes).
*   **Dashboards**: Kibana allows for real-time visualization of system health.

## 7. Non-Goals

This specification does **not** cover:
*   The configuration details of the ELK stack or Logstash filters.
*   The design of specific Kibana dashboards.
*   Selection of specific logging libraries for individual languages (that is left to implementation guides).
