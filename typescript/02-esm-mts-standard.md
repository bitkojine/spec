# Standardizing on ESM and .mts

## Background / Motivation
Node.js has traditionally used CommonJS (CJS) as its default module system. However, the industry has shifted towards **ECMAScript Modules (ESM)** as the official standard for JavaScript. ESM provides benefits such as improved static analysis, better tree-shaking, and a consistent module syntax across browser and server environments.

In Node.js, determining whether a file is CJS or ESM can be ambiguous, often relying on the nearest `package.json`'s `"type"` field. This ambiguity can lead to runtime errors and toolchain complexity. 

This project adopts the **`.mts`** extension for TypeScript files to explicitly signal that they are ES Modules. This ensures absolute clarity for Node.js, TypeScript, and bundlers like `esbuild`.

## Rule Definition
This codebase enforces the following standards for module management:

- **REQUIRED: .mts Extension**: All new TypeScript source files MUST use the `.mts` extension.
- **REQUIRED: ESM Imports**: All imports MUST use ESM syntax (`import`/`export`). The use of `require()` and `module.exports` is prohibited in source code.
- **REQUIRED: Explicit Extensions**: When importing internal modules, the import path MUST include the explicit **`.mjs`** extension (the compiled target extension).
    - *Rationale*: This is required by the TypeScript `Node16` / `NodeNext` module resolution logic to ensure compatibility with Node.js ESM.
- **REQUIRED: Package Configuration**: The root `package.json` MUST include `"type": "module"`.

## Preferred Patterns

### Creating New Modules
When creating a new file, name it with the `.mts` extension.
```typescript
// src/utils/math-helper.mts
export const add = (a: number, b: number) => a + b;
```

### Importing Modules
Always refer to the compiled extension (`.mjs`) even though the source is `.mts`.
```typescript
// src/index.mts
import { add } from "./utils/math-helper.mjs";
```

### Transitioning from .ts to .mts
1.  Rename the file from `file.ts` to `file.mts`.
2.  Update all inbound imports to use the `.mjs` extension.
3.  Ensure the `tsconfig.json` is configured for `Node16` resolution.

## Examples

### Incorrect Implementation
```typescript
// ❌ Using .ts in an ESM project (creates ambiguity)
// ❌ Omitting the file extension in the import
import { logger } from "./logger"; 

// ❌ Using CommonJS require
const fs = require("fs"); 
```

### Correct Implementation
```typescript
// ✅ Using .mts for explicit ESM
// ✅ Using explicit .mjs extension in the import
import { logger } from "./logger.mjs"; 

// ✅ Using ESM import for built-in modules
import * as fs from "node:fs"; 
```

## Tooling & Enforcement

### Compiler Configuration
The `tsconfig.json` MUST be configured to support ESM resolution:
```json
{
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "Node16",
    "target": "ES2022"
  }
}
```

### Bundler Integration
The build process (e.g., `esbuild.ts`) MUST include logic to resolve `.mjs` imports back to `.mts` source files during the bundling phase to allow for seamless development.

### CI Expectations
The build pipeline will fail if:
- Any `require()` calls are detected in the source code.
- TypeScript compilation fails due to incorrect module resolution or missing extensions.

## Non-Goals
- This specification does not mandate the use of ESM for auxiliary scripts (e.g., small bash-like utility scripts) unless they are part of the core application runtime.
- It does not cover the specifics of CSS or asset bundling, which are handled separately by the visualizer's build pipeline.

## Summary
The project is a "pure ESM" project. We use `.mts` to eliminate module ambiguity and ensure that our code is modern, future-proof, and fully compatible with the Node.js ESM implementation.
