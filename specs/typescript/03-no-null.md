# No-Null Engineering Specification

## 1. Overview

This specification establishes a strict policy prohibiting the use of the `null` value within the engineering organization. The objective is to eliminate the ambiguity and common runtime errors associated with `null`—often referred to as the "billion-dollar mistake"—and to standardize on `undefined` or functional patterns for representing the absence of a value.

## 2. Normative Rules

### 2.1. Absolute Prohibition
* The `null` literal MUST NOT be used in any part of the codebase.
* The `null` type MUST NOT be used in any type definitions, interfaces, or class properties.

### 2.2. Preferred Alternatives
* **`undefined`**: Use `undefined` for simple optional parameters, optional properties, or values that are intentionally missing.
* **`Option<T>`**: For complex logic requiring clear handling of presence vs. absence, use the functional `Option<T>` pattern (`Some` or `None`).

### 2.3. Handling Third-Party APIs
* If a third-party API or library returns `null`, the value MUST be immediately converted or wrapped:
    * Coalesce to `undefined`: `const val = thirdPartyCall() ?? undefined;`
    * Wrap in `Option`: `const opt = thirdPartyCall() !== null ? some(val) : none();`

## 3. Rationale

### The "Billion Dollar Mistake"
The inventor of the null reference, Tony Hoare, apologized for its creation, citing it as a source of innumerable errors, vulnerabilities, and system crashes. Having two distinct ways to represent "nothing" (`null` and `undefined`) in JavaScript/TypeScript increases cognitive load and leads to inconsistent checks.

### Type Safety
Standardizing on `undefined` allows for better utilization of TypeScript's optional properties (`?`) and default parameters, leading to cleaner and more predictable code.

## 4. Enforcement

### Automated Linting
* ESLint MUST be configured to raise an ERROR on any usage of `null`.
* Recommended rule: `no-restricted-syntax` targeting `Literal[value=null]` and `NullKeyword`.

### Build Failures
* Any violation of this specification MUST result in a build failure during the linting phase of the CI/CD pipeline.
