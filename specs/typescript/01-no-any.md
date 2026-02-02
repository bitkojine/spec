# Avoiding any in TypeScript

## Background / Motivation
The `any` type selectively disables the TypeScript type system, effectively converting typed code into untyped JavaScript. This undermines the core value proposition of the language and introduces significant technical debt and runtime risk:
- **Type Safety Erosion**: `any` allows for invalid operations that bypass compile-time checks, leading to preventable runtime exceptions.
- **Maintenance Complexity**: Codebases with frequent `any` usage are significantly harder to refactor because the compiler cannot provide reliable feedback on the downstream impact of changes.
- **Degraded Tooling Support**: Critical developer productivity features, such as intelligent autocompletion, jump-to-definition, and safe renaming, are unavailable for `any` types.
- **Technical Debt Propagation**: `any` acts as a "leaky abstraction" that often forces consumers of an interface to also adopt unsafe types, poisoning the codebase over time.

## Rule Definition
This codebase enforces a strict prohibition on the `any` type. The following are non-negotiable standards for all code submissions:
- **No Explicit any**: The keyword `any` must not be used in variable declarations, function signatures, or type assertions.
- **No Generic any**: Collections and generic instances must have concrete or bounded types (e.g., `any[]` and `Array<any>` are prohibited).
- **No Record any**: Mapping types must have defined value types (e.g., `Record<string, any>` is prohibited).
- **No Implicit any**: The compiler must never fall back to `any` for untyped parameters, variables, or return values.
- **Zero Compliance Threshold**: The codebase must not compile if these rules are violated. All instances of `any` are considered build-breaking errors.

## Preferred Alternatives
Developers must use more precise types to maintain safety and clarity. When dealing with dynamic or unknown data, prioritize the following patterns:

### unknown
Use `unknown` for data from external sources (such as APIs or JSON.parse). Unlike `any`, `unknown` requires explicit narrowing via type guards or control flow analysis before the value can be accessed.
```typescript
const handleResponse = (data: unknown) => {
  if (typeof data === "string") {
    console.log(data.length); // Safe narrowing
  }
};
```

### Generics
Use generics to preserve type continuity and relationships when working with reusable components or utility functions.
```typescript
function getFirstMember<T>(items: T[]): T | undefined {
  return items[0];
}
```

### Discriminated Unions
Model complex states using literal tag properties. This allows the compiler to enforce exhaustive checks and accurate type narrowing.
```typescript
type OperationResult = 
  | { type: "idle" }
  | { type: "success"; data: string[] }
  | { type: "error"; message: string };
```

### Formal Interfaces and Type Aliases
Define clear contracts for all objects. Even for complex structures, an interface is preferable to a dynamic object. Use Utility Types like `Partial<T>`, `Pick<T, K>`, or `Record<string, number>` to adapt types safely.

### never
Use `never` to represent states that should be unreachable, ensuring that all possible code paths are handled correctly in switch statements and conditionals.

## Examples

### Incorrect Implementation (Explicit any)
```typescript
// Explicit any bypasses safety
function processConfig(config: any) {
  const settings: Record<string, any> = config.settings;
  console.log(settings.timeout.toFixed()); // Runtime error if timeout is missing
}
```

### Correct Implementation (Strongly Typed)
```typescript
interface ProcessorConfig {
  settings: {
    timeout: number;
    retries: number;
  };
}

function processConfig(config: ProcessorConfig) {
  const settings = config.settings;
  console.log(settings.timeout.toFixed()); // Safe and validated
}
```

### Incorrect Implementation (Implicit any)
```typescript
// Implicit any via missing parameter types
const calculateTotal = (price, tax) => price + tax;
```

### Correct Implementation (Explicit Types)
```typescript
const calculateTotal = (price: number, tax: number): number => price + tax;
```

## Incremental Typing Strategy
While perfect types may not always be immediately available (e.g., during migration or when using poorly typed legacy dependencies), the following rules apply:
- **Prefer unknown over any**: If a type cannot be fully defined, use `unknown`. This signals to future developers that the type needs to be validated before use.
- **Boundary Validation**: Use validation logic or type guards at the system boundaries to cast external data into internal, strictly typed structures.
- **Non-Regression Policy**: When modifying existing code, developers are required to improve the surrounding types. Replacing `any` with a precise type is a mandatory part of any refactoring effort.
- **Temporary Compromises**: `eslint-disable` comments for `any` rules are only permitted in extreme cases where third-party definitions are missing, and must be accompanied by a `TODO` comment with a rationale.

## Tooling & Enforcement

### Compiler Configuration
The `tsconfig.json` must be configured to enforce strictness:
- `strict: true`
- `noImplicitAny: true`
- `strictPropertyInitialization: true`

### ESLint Rules
The following `@typescript-eslint` rules must be set to `error` and integrated into the development workflow:
- `no-explicit-any`
- `no-unsafe-assignment`
- `no-unsafe-member-access`
- `no-unsafe-call`
- `no-unsafe-return`

### CI Expectations
The Continuous Integration pipeline will execute a full build and lint check on every pull request. No code violating these standards will be merged.

## Non-Goals
- **Developer Convenience**: Short-term speed or ease of implementation never justifies the introduction of `any`.
- **Over-Engineering**: While types must be precise, avoid creating overly recursive or opaque type logic that obscures code intent. Aim for the simplest type that guarantees safety.

## Summary
The prohibition of `any` is a fundamental engineering standard. We prioritize long-term maintainability and runtime reliability over the convenience of bypassable types. Every developer is responsible for ensuring that the codebase trends toward stronger, more precise type definitions.
