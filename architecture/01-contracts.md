# Contract-First Interface Development

## Background / Motivation
The most common cause of systemic failure in distributed systems and large codebases is "Interface Drift"—when the implementation of a producer (API/Service) and the expectations of a consumer (Frontend/Client) diverge. Spec-driven development addresses this by making the "Contract" the primary artifact from which both implementation and verification flow.

- **Eliminate Integration Friction**: By defining boundaries before logic, we ensure that teams or components can be developed in parallel without constant synchronization.
- **Automated Verification**: Contracts act as a machine-readable schema that allows for automated runtime validation and compile-time type safety.
- **Single Source of Truth**: The contract serves as the ultimate documentation, reducing ambiguity and "tribal knowledge" about how parts of the system interact.
- **Reliable Mocking**: High-fidelity mocks can be automatically generated from contracts, ensuring that tests are valid and resilient to implementation changes.

## Rule Definition
This codebase mandates a contract-first approach for all service boundaries and internal system interfaces:
- **Pre-Implementation Definition**: No implementation logic (backend or frontend) shall be written until a formal, machine-readable contract is defined and reviewed.
- **Mandatory Schema Usage**: Every boundary must use a formal schema definition (e.g., Zod for TypeScript/Runtime, OpenAPI for HTTP, or Protobuf for RPC).
- **Prohibit Untyped Payloads**: All data crossing a boundary must be explicitly typed and validated. Using `unknown` or `any` at a boundary without a subsequent validation step is a violation.
- **Versioning by Default**: Every breaking change to a contract must be accompanied by a version bump or a backward-compatible migration strategy.
- **Strict Directionality**: Data must only flow through the interface as defined. Side channels or direct database access by multiple services are prohibited.

## Standard Patterns

### Interface Hardening with Zod
Use Zod (or equivalent) to enforce the contract at the runtime boundary. This ensures that even if TypeScript is bypassed (e.g., via `any` or external JSON), the system fails fast at the edge.

```typescript
import { z } from "zod";

// 1. Define the Contract
export const UserContract = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
});

export type User = z.infer<typeof UserContract>;

// 2. Enforce at the Boundary
export async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const rawData = await response.json();
  
  // Validate raw data against the contract
  return UserContract.parse(rawData); 
}
```

### Type-Safe Internal Boundaries
For internal services, use Dependency Injection and clearly defined interfaces to decouple the "Intent" from the "Implementation."

## Examples

### Incorrect Implementation (Code-First)
Logic is written before the contract is solidified, leading to implicit types and "guesswork" at the boundary.
```typescript
// NO: Implementation defines the contract implicitly
async function saveProfile(profile: any) {
  // Logic mixed with schema assumptions
  return db.save("profiles", profile);
}
```

### Correct Implementation (Contract-First)
The contract is defined as a standalone artifact that both producer and consumer reference.
```typescript
// YES: Contract is the source of truth
const ProfileUpdateSchema = z.object({
  displayName: z.string().min(3),
  bio: z.string().max(160),
});

type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

// Implementation follows the contract
async function saveProfile(update: ProfileUpdate) {
  return db.save("profiles", update);
}
```

## Tooling & Enforcement

### Schema Validation
- All external API calls must be wrapped in a validation layer (e.g., `Zod.parse()` or `Tsoa` controllers).
- Build scripts must include a "Schema Check" step that verifies the consistency of generated types against the source schemas.

### ESLint & Linting
- Use rules that prohibit the use of unvalidated data in business logic (e.g., `require-schema-validation`).
- Enforce the use of specific boundary-layer decorators or wrappers.

## CI Expectations
- **Contract Compatibility Check**: PRs that modify a contract must pass a compatibility check against existing consumer mocks to detect breaking changes.
- **Code Generation Sync**: If using generated types (e.g., from OpenAPI), the CI will fail if the committed code is out of sync with the schema.

## Non-Goals
- **Over-Specification of Internal Logic**: This rule applies to *boundaries* between systems or major components. Private, internal-only helper functions do not necessarily require a full Zod schema but should still maintain strong typing.
- **Perfect Forecasting**: Contracts can and should evolve. The goal isn't to get it "perfect" on day one, but to ensure that the *boundary* is always explicit and intentional.

## Summary
Contract-First Development is the primary defense against systemic fragility. By treating our interfaces as formal specifications rather than an afterthought of implementation, we build systems that are modular, testable, and robust. Every architectural change begins with a contract modification.
