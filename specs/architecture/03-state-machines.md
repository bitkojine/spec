# Explicit State Machines

## (Architecture, AI-Enforceable Specification)

---

## Purpose

Eliminate invalid system states and side effects by modeling complex logic as **Finite State Machines (FSMs)**.

Traditional boolean flags (e.g., `isLoading`, `hasError`, `isSuccess`) often lead to "impossible" states (e.g., `isLoading === true` AND `hasError === true`). State machines make these invalid states unrepresentable.

This specification is explicitly designed to help **AI coding agents** understand system behavior by providing a rigorous map of valid states and transitions.

---

## Canonical Pattern (Normative)

The following patterns are **MANDATORY** for complex stateful logic:

### 1. Discriminated Unions (Simple State)

For component-level state or simple logic, use TypeScript Discriminated Unions.

```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: string }
  | { status: 'error'; error: Error };

// Invalid states are impossible (e.g. loading + error)
```

### 2. Explicit Transitions (Complex Logic)

For system-level logic (e.g., connection lifecycles, background jobs, multi-step wizards), you **MUST** define explicit transitions.

> **Rule**: State transitions logic needs to be pure and centralized.

---

## Core Rules (Normative)

### 1. No "Bag of Flags"
*   **FORBIDDEN**: Using multiple independent boolean flags to represent a single logical process.
*   **REQUIRED**: A single `status` or `state` field that discriminates the mode of operation.

### 2. Exhaustive Matching
*   All state consumers (UI renderers, effect handlers) **MUST** handle every possible state or explicitly throw/ignore.
*   TypeScript `switch` checks with `never` assertions are the standard way to enforce this.

### 3. Transition Guarding
*   Actions are only valid in specific states.
*   Example: A `submit()` action is only valid in the `idle` or `error` state, never in `loading`.

---

## AI Agent Operational Rules

AI coding agents **MUST**:

1.  **Identify State**: When modifying a component, identify the implicit state machine.
2.  **Refactor to Explicit**: If a "bag of flags" is found, refactor it to a Discriminated Union.
3.  **Respect Transitions**: Only trigger side effects (API calls, etc.) during valid state transitions.

---

## Example (Before vs. After)

### Before (Fragile)
```typescript
let isLoading = false;
let error: Error | null = null;
let data: Data | null = null;

function load() {
  isLoading = true; // Error might still be non-null!
  // ...
}
```

### After (Robust)
```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: Data }
  | { status: 'failed'; error: Error };

let state: State = { status: 'idle' };

function load() {
  if (state.status === 'loading') return; // Guard
  state = { status: 'loading' };
  // ...
}
```

---

## Governing Principle

> **Make impossible states impossible.**
