# Linting Standards Specification

## Overview
This specification defines the standards for static analysis and linting within the project. The primary goal is to ensure high code quality, maintainability, and auditability by preventing the silent suppression of enforced rules.

## Mandatory Justification for Suppressions
Any attempt to suppress a linting rule through inline comments or configuration must be accompanied by a clear, descriptive justification.

### Rules
1. **Explicit Justification**: Every `eslint-disable`, `eslint-disable-line`, or `eslint-disable-next-line` directive must include an explanation.
2. **Standard Format**: The justification should be provided on the same line as the directive, separated by two dashes (`--`).
   - **Correct**: `// eslint-disable-next-line no-console -- Required for CLI terminal output.`
   - **Incorrect**: `// eslint-disable-next-line no-console`
3. **Auditability**: Justifications must be descriptive enough for a reviewer or auditor to understand the rationale without deep investigation.
4. **Enforcement**: This rule is enforced via `eslint-plugin-eslint-comments/require-description`. Failure to provide a description will result in a build-breaking error.

### Rationale
- **Preventing Rule Drift**: Without justifications, developers may develop a habit of suppressing "annoying" rules without addressing the underlying issue.
- **Maintainability**: Future maintainers need to know if a suppression is still relevant or if it was a temporary workaround.
- **Security & Reliability**: Many linting rules exist to catch security vulnerabilities or reliability issues (e.g., `no-any`, `no-restricted-globals`). Overriding them must be a conscious, documented decision.

## Specific Rule Exclusions
While justifications are mandatory, certain files or directories may have broad exclusions defined in the root `.eslintrc.json`. These are typically:
- **Test files**: May have relaxed rules for specific testing patterns.
- **Demo/Example files**: May use `console.log` or `unknown` types to keep examples simple.
- **Build scripts**: May require access to system globals or console output for status reporting.

Even in these cases, inline suppressions within the code must still follow the mandatory justification rule.
