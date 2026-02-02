# Contract-First Interface Development

## (TypeScript-Native, AI-Enforceable Specification)

---

## Purpose

Prevent interface drift by making **machine-readable contracts** the authoritative source of truth for all system boundaries.

All implementation logic, validation, mocks, tests, and generated clients **MUST** be derived from contracts.
This specification is explicitly designed to be **consumed, enforced, and executed by AI coding agents**.

---

## Canonical Tooling (Normative)

The following tools are **MANDATORY** for TypeScript systems unless an explicit exception is approved:

### Primary Contract Definition

* **Zod** (or Valibot as an approved equivalent)

> Zod schemas are the *contract artifact*.
> TypeScript types are *derived outputs*, never the source.

---

### Contract-Derived Outputs (Required)

From every contract, the following **MUST** be derivable:

* Static TypeScript types (`z.infer`)
* Runtime validators
* Mock data generators
* Test fixtures
* (Optional) OpenAPI specifications

---

### Disallowed as Primary Contracts

The following **MAY NOT** be used as boundary contracts:

* TypeScript `interface` or `type` alone
* JSON Schema without runtime validation
* Untyped JSON payloads
* Ad-hoc parsing logic

---

## Definitions

### Contract

A **contract** is a versioned Zod schema that defines:

* Structure
* Types
* Constraints
* Semantic intent (where required)

Example:

```ts
export const UserV1 = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});
```

---

### Boundary

A boundary exists whenever data:

* Crosses a **process or network boundary**
* Crosses a **deployment boundary** (service, job, lambda)
* Crosses an **ownership boundary** (team or domain)
* Is **persisted and later consumed** by another component

If a boundary exists, a contract **MUST** exist.

---

## Repository Layout (Required)

Contracts must be discoverable and versioned explicitly:

```
/contracts
  /user
    v1.schema.ts
    v2.schema.ts
  /order
    v1.schema.ts
```

Generated artifacts **MUST NOT** live in the same directory as contracts.

---

## Core Rules (Normative)

### 1. Contract Before Implementation

* No implementation logic may be written before a contract exists.
* Generated code does **NOT** count as a contract.
* The schema file is the **review and approval artifact**.

**AI agents must refuse to implement features without a contract.**

---

### 2. Mandatory Runtime Validation

All boundary data **MUST** be validated using the contract:

* On ingress (inputs, requests, messages)
* On egress (responses, emitted events)

Validation must fail fast.

Example:

```ts
UserV1.parse(input);
```

---

### 3. No Untyped or Opaque Payloads

The following are **FORBIDDEN** at boundaries:

* `any`
* `unknown`
* `Record<string, any>`
* Raw JSON objects

All data must be:

1. Parsed
2. Validated
3. Converted into a contract-defined type

---

### 4. Contract Independence

Contracts must be:

* Independent of database schemas
* Independent of ORM or persistence models
* Independent of internal domain objects

Contracts describe **exchange**, not **implementation**.

---

### 5. Versioning Rules (Mechanical)

Each contract **MUST** declare a version in its filename.

Compatibility rules:

* Field removal → **BREAKING**
* Type change → **BREAKING**
* Semantic change → **BREAKING**
* Additive optional field → **NON-BREAKING**

Breaking changes require:

* A new versioned schema file
  **OR**
* A documented migration adapter

---

### 6. Directional Data Flow Only

* Data may only cross boundaries through declared contracts.
* Shared databases or side channels between systems are prohibited.
* Every read/write path must reference a contract.

---

### 7. Contract Ownership Metadata

Each contract must export metadata:

```ts
export const ContractMeta = {
  owner: "identity-team",
  consumers: ["billing", "frontend"],
  stability: "stable",
};
```

Unowned contracts are invalid.

---

## AI Agent Operational Rules

AI coding agents **MUST**:

1. Treat `/contracts/**` as the single source of truth
2. Generate:

   * Types
   * Validators
   * Mocks
   * Tests
     **only from schemas**
3. Refuse to:

   * Infer undocumented fields
   * Extend payloads implicitly
   * Introduce breaking changes without version bumps
4. Fail generation if:

   * Validation fails
   * Compatibility checks fail
   * Contracts are missing metadata

---

## CI Enforcement (Required)

### Required Checks

CI **MUST** enforce:

* Schema validity
* Contract versioning rules
* Compatibility diffs between versions
* Generated artifacts in sync with contracts
* Runtime validation coverage at boundaries

---

## Mock & Test Generation (Required)

* Mocks **MUST** be generated from schemas
* Faker (`@faker-js/faker`) is the standard generator
* Negative test cases must include invalid payloads

---

## Optional: OpenAPI Export (Recommended)

If cross-language consumption is required:

* Generate OpenAPI from Zod schemas
* OpenAPI artifacts are **derived**, never authoritative

---

## Non-Goals

* Internal helper functions without boundary crossings
* Private implementation details
* Perfect future prediction

---

## Governing Principle

> **If it is not in the contract, it does not exist.**
