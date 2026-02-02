# Engineering Specification: Maximum Code File Length

**Status:** Draft  
**Version:** 1.0.0  
**Effective Date:** 2026-02-01

## Purpose & Rationale

This specification defines and governs a maximum code file length policy. The primary objective is to improve maintainability, readability, and reviewability across the codebase.

### Objectives
- **Modularity:** Enforces the Single Responsibility Principle (SRP) by naturally constraining the scope of a single file.
- **Readability:** Reduces cognitive load by ensuring files remain small enough to be understood in a single sitting.
- **Reviewability:** Facilitates faster and more thorough code reviews by keeping change sets manageable.
- **Testability:** Encourages the creation of smaller, decoupled components that are easier to test in isolation.
- **Ownership Clarity:** Makes it easier to define clear boundaries and ownership for specific modules.

## Scope

This rule applies to:
- **Production Code:** All source files used in the final build (e.g., `.ts`, `.js`, `.py`, `.go`).
- **Test Code:** All unit, integration, and end-to-end test files.
- **Scripts:** Utility and build scripts (e.g., `.sh`, `.py`).

This rule **MAY NOT** apply to:
- **Generated Code:** Files automatically created by tools (e.g., `schema.d.ts`, `bundle.js`).
- **Configuration:** Static configuration files (e.g., `.json`, `.yaml`, `.toml`) unless they contain significant logic.
- **Documentation:** Markdown files or other non-code documentation.

The rule is **language-agnostic** but may be implemented using language-specific tooling.

## Definitions

- **Line:** A physical line in the file as stored on disk.
- **Logical Line:** A statement or expression that may span multiple physical lines.
- **Comment:** Lines containing only comments (e.g., `//`, `/* ... */`, `#`).
- **Blank Line:** Lines containing only whitespace characters.

For the purpose of this specification, **Measurement** is based on **Physical Lines**, including comments and blank lines. This approach is chosen for its simplicity, tool-agnosticism, and its direct correlation with visual "height" and cognitive load.

## The Rule

1. **Hard Limit:** Every code file MUST NOT exceed **300 physical lines**.
2. **Standard:** This is a **hard constraint** for all new code.
3. **Legacy Policy:** Existing files exceeding this limit SHOULD be prioritized for refactoring during subsequent modifications (i.e., "Leave it better than you found it").

## Exceptions & Escape Hatches

Files MAY exceed the 300-line limit only under the following conditions:

### Legitimate Reasons
- **Third-Party Logic:** Inline inclusion of external libraries where external management is not feasible.
- **Complexity Concentration:** Rare cases where splitting a file would introduce more complexity (e.g., highly coupled state machines) than it solves.
- **Performance Constraints:** Situations where modularization significantly impacts runtime performance in critical paths.

### Process
1. **Annotation:** The file MUST include a top-level directive or comment explaining the exception (e.g., `// engineering-spec: exception-file-length: [Reason]`).
2. **Review Sign-off:** Exceptions MUST be explicitly called out in pull requests and require approval from a senior engineer or architect.
3. **Intentionality:** Exceptions remain temporary and MUST be reviewed during architectural audits.

## Enforcement Mechanisms

- **Linter Integration:** Standard linters (e.g., ESLint `max-lines`, Ruff `PLR0915`) MUST be configured with a 300-line limit.
- **Pre-commit Hooks:** Commits that violate the limit SHOULD be blocked locally.
- **CI Checks:** The build pipeline MUST fail if any non-exempt file exceeds the limit.
- **Failure Behavior:**
    - **Warnings:** Issued for legacy files during development.
    - **Build Failure:** Triggered for all new files or modifications to legacy files that increase the line count beyond the limit.

## Refactoring Guidance

When a file approaches or exceeds the limit, developers SHOULD:
- **Extract Components:** Move UI components or logic blocks into separate files.
- **Isolate Utilities:** Move generic helper functions to a `utils` or `helpers` directory.
- **Use Composition:** Decompose large classes into smaller, specialized objects.
- **Delegate Responsibilities:** Use patterns like Services, Repositories, or Providers.

### Non-Goals
- **Splitting for Metrics:** Do NOT split a file purely to satisfy the 300-line limit if the resulting modules lack cohesion or introduce unnecessary indirection.
- **Obfuscation:** Do NOT compress code (e.g., removing necessary comments or blank lines) to circumvent the limit.

## Trade-offs & Risks

### Risks
- **Over-fragmentation:** Too many small files can make the codebase difficult to navigate.
- **Indirection:** Excessive modularization can make it harder to trace logic across files.
- **Boilerplate:** Smaller files may increase the ratio of boilerplate (imports/exports).

### Mitigation
- **Consistent Structure:** Enforce clear directory structures and naming conventions.
- **Tooling:** Use IDE features (e.g., "Go to Definition") to navigate fragments.
- **Cohesion First:** Always prioritize logical cohesion over strict line counts.

## Success Criteria

1. **Reduced Cognitive Load:** Developer surveys indicate improved ease of understanding new files.
2. **Faster Review Cycles:** Average time spent on PR reviews for large files decreases.
3. **Improved Coverage:** Modular files show a higher correlation with granular unit test coverage.
4. **Architectural Health:** Gradual reduction in the number of "God Objects" and "Kitchen Sink" files.

## Non-Goals

This specification does NOT attempt to:
- **Enforce Architectural Correctness:** Small files do not guarantee good design; they only facilitate it.
- **Limit Logical Complexity:** A 20-line file can still be overly complex; this spec only addresses length.
- **Mandate Specific File Layouts:** This spec defines the *size*, not the internal organization.
