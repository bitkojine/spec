# Standardizing on ESM (.mts) and CJS (.cts)

## Background / Motivation
Node.js traditionally defaults to CommonJS (CJS). Modern JavaScript has standardized on **ECMAScript Modules (ESM)**. In a complex environment like a VS Code extension—where the Extension Host (Node.js) and the Webview (Browser) often require different module systems—relying on the file system to "guess" the module type via `package.json` proximity is brittle and error-prone.

This project adopts **Explicit Extension Signaling**. By using `.mts` and `.cts`, we remove all ambiguity, ensuring that every file conveys its intended module system directly through its extension.

## Rule Definition
This codebase enforces the following standards for module management:

- **REQUIRED: Explicit Signaling**: All TypeScript source files MUST use either the `.mts` or `.cts` extension. The use of the standard `.ts` extension is **PROHIBITED** to prevent ambiguity.
    - **.mts**: Use for all browser-compatible or modern Node.js ESM code (e.g., Webview components, browser scripts).
    - **.cts**: Use for code that must maintain CommonJS compatibility (e.g., VS Code Extension Host, CLI scripts, E2E tests).
- **REQUIRED: Pure ESM Default**: The root `package.json` MUST include `"type": "module"`. This defines the project's primary identity as ESM.
- **REQUIRED: Explicit Extensions**: All relative imports MUST include the explicit extension of the **compiled target**:
    - Import `foo.mts` as `import "./foo.mjs"`.
    - Import `bar.cts` as `import "./bar.cjs"`.

## Architectural Layering (Who Decides Resolution)
To maintain a predictable build system, we strictly define which layer owns module resolution:

| Layer | Responsibility | Logic |
| :--- | :--- | :--- |
| **Type Checking** | TypeScript | Governs how source files find each other during static analysis. |
| **Bundling / Build** | Toolchain (esbuild) | MUST comply with TypeScript's resolution rules. No custom heuristics. |
| **Runtime** | Node.js / Browser | Loads the emitted `.mjs` or `.cjs` files directly. |

> [!IMPORTANT]
> The **TypeScript Compiler** is the source of truth for module resolution. All other tools (bundlers, linters, IDEs) MUST respect the `Node16`/`NodeNext` resolution rules defined in `tsconfig.json`.

## Resolution Mapping Table

| Source File | Context | Resolution Mode | Target Ext | Import As | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.mts` | ESM | Node16/Next | `.mjs` | `./file.mjs` | **REQUIRED** |
| `.cts` | CJS | Node16/Next | `.cjs` | `./file.cjs` | **REQUIRED** |
| `.ts` | N/A | Node16/Next | `.js` | `./file.js` | **PROHIBITED** |

## Preferred Patterns

### Creating New Modules
Always choose the explicit extension matching the target environment.
```typescript
// src/webview/3d-engine.mts (Browser/ESM)
// src/extension/main.cts (Extension Host/CJS)
```

### Importing Modules
Always refer to the compiled extension.
```typescript
import { helper } from "./helper.mjs"; // For .mts source
import { config } from "./config.cjs"; // For .cts source
```

## Tooling & Enforcement

### Compiler Configuration
The `tsconfig.json` MUST be configured to enforce `Node16`/`NodeNext` resolution.

### Automated Linting
ESLint is configured to error on any `.ts` or `.js` source files using the `no-restricted-syntax` rule. This ensures that only explicit extensions are used.

### Bundler Compliance
The bundler (e.g., `esbuild.mts`) MUST include a resolution plugin that handles the mapping from `.mjs`/`.cjs` imports to their respective `.mts`/`.cts` source files deterministically.

## Preferred Patterns

### Creating New Modules
Always choose the explicit extension matching the target environment.
```typescript
// src/webview/3d-engine.mts (Browser/ESM)
// src/extension/main.cts (Extension Host/CJS)
```

### Importing Modules
Always refer to the compiled extension.
```typescript
import { helper } from "./helper.mjs"; // For .mts source
import { config } from "./config.cjs"; // For .cts source
```

## Tooling & Enforcement

### Compiler Configuration
The `tsconfig.json` MUST be configured to enforce `Node16`/`NodeNext` resolution.

### Bundler Compliance
The bundler (e.g., `esbuild.ts`) MUST include a resolution plugin that handles the mapping from `.mjs`/`.cjs` imports to their respective `.mts`/`.cts` source files deterministically.

## Summary
By standardizing on explicit extensions and a "Pure ESM" package identity, we achieve a robust, future-proof architecture that eliminates runtime module errors and aligns perfectly with modern engineering standards.
