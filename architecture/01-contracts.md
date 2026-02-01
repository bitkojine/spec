# Contract-First Interface Development

## Background / Motivation
The most common cause of systemic failure in distributed systems and large codebases is "Interface Drift"—when the implementation of a producer (API/Service) and the expectations of a consumer (Frontend/Client/Subsystem) diverge. Spec-driven development addresses this by making the "Contract" the primary artifact from which both implementation and verification flow.

- **Eliminate Integration Friction**: By defining boundaries before logic, we ensure that teams or components can be developed in parallel without constant synchronization.
- **Automated Verification**: Contracts act as machine-readable schemas that allow for automated runtime validation and compile-time guarantees.
- **Single Source of Truth**: The contract serves as the ultimate documentation, reducing ambiguity and "tribal knowledge" about how parts of the system interact.
- **Reliable Mocking**: High-fidelity mocks can be automatically generated from contracts, ensuring that tests are valid and resilient to implementation changes.

## Rule Definition
This codebase mandates a contract-first approach for all service boundaries and internal system interfaces:
- **Pre-Implementation Definition**: No implementation logic shall be written until a formal, machine-readable contract is defined and reviewed.
- **Mandatory Schema Usage**: Every boundary must use a formal schema definition language (e.g., OpenAPI, Protobuf, GraphQL, or a runtime validation schema).
- **Prohibit Untyped Payloads**: All data crossing a boundary must be explicitly structured and validated. Using opaque, untyped containers at a boundary without a subsequent validation step is a violation.
- **Versioning by Default**: Every breaking change to a contract must be accompanied by a version bump or a documented backward-compatible migration strategy.
- **Strict Directionality**: Data must only flow through the interface as defined. Side channels or direct shared storage access by multiple disparate systems are prohibited.

## Standard Patterns

### Interface Hardening at the Boundary
Use a formal validation layer to enforce the contract at the system boundaries. This ensures that the system "fails fast" at the edge if incoming or outgoing data does not match the agreed-upon contract.

### Independent Specification
The contract should be defined in a way that is decoupled from any specific implementation detail (e.g., database schema or internal object models). This allows the contract to evolve based on consumer needs rather than implementation artifacts.

## Examples

### Incorrect Implementation (Code-First)
Logic is written before the contract is solidified, leading to implicit types and "guesswork" at the boundary.
```text
// NO: Implementation defines the contract implicitly
// Component A sends undocumented data to Component B.
// Component B makes assumptions about the structure and types.
// Result: System breaks when Component A changes a field name.
```

### Correct Implementation (Contract-First)
The contract is defined as a standalone artifact that both producer and consumer reference and validate against.
```text
// YES: Contract is the source of truth
// 1. Definition: Define the structured schema (e.g., User: {id: uuid, email: string})
// 2. Validation: Both Producer and Consumer use the schema to validate payloads.
// 3. Testing: Consumers use mocks generated directly from the schema.
```

## Tooling & Enforcement

### Schema Validation
- All external input must be passed through a validation layer immediately upon entry.
- Build scripts or CI should verify the consistency of the implementation against the source schema where possible.

### CI Expectations
- **Contract Compatibility Check**: Changes that modify a contract must pass a compatibility check to detect breaking changes for downstream consumers.
- **Synchronization Check**: CI will fail if the implementation or generated artifacts are out of sync with the primary schema definition.

## Non-Goals
- **Over-Specification of Private Logic**: This rule applies to *boundaries* between systems or major components. Private, internal-only helper routines do not necessarily require a full formal schema but should still maintain clear internal contracts.
- **Perfect Forecasting**: Contracts can and should evolve. The goal is not to get it "perfect" on day one, but to ensure that every boundary is always explicit, intentional, and documented.

## Summary
Contract-First Development is the primary defense against systemic fragility. By treating our interfaces as formal specifications rather than an afterthought of implementation, we build systems that are modular, testable, and robust. Every architectural change begins with a contract modification.
