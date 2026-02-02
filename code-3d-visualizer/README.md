# Code 3D Visualizer Starter

A production-quality VSCode extension starter using TypeScript and Three.js, following strict engineering specifications.

## Features

- **3D Visualization**: Renders classes and functions as 3D objects in a webview.
- **Strict Typing**: Enforces `no-any` and strict compiler settings.
- **Contract-First**: Formal communication schema between extension and webview.
- **Async Safety**: Cancellation support for long-running operations.
- **Structured Logging**: JSON-based logs for better observability.
- **Bug-First Testing**: Tests designed to prevent specific, realistic regressions.

## Getting Started

1. `npm install`
2. `npm run compile`
3. Press `F5` to start debugging.
4. Run the command `Show 3D View`.

## Performance Monitoring

The extension includes a built-in performance monitoring suite using the **ELK Stack** (Elasticsearch, Logstash, Kibana).

### 🚀 Quick Start
1.  **Setup ELK**: Ensure Docker is running and execute:
    ```bash
    npm run elk:setup
    ```
2.  **Generate Data**: Run the automated benchmark suite:
    ```bash
    npm run test:perf
    ```
3.  **View Dashboard**: Open Kibana at [http://localhost:5601](http://localhost:5601) and navigate to the **Performance Monitoring** dashboard.

### 📊 Key Metrics
- **Parsing Latency**: Real-time analysis speed of the TS parser.
- **WebView FPS**: Rendering performance of the 3D scene.
- **Heap Usage**: Memory delta tracking for both the Extension Host and WebView layers.

## Engineering Specs Followed

- [architecture/01-contracts.md](file:///Users/name/trusted-git/oss/spec/architecture/01-contracts.md)
- [concurrency/01-async-safety.md](file:///Users/name/trusted-git/oss/spec/concurrency/01-async-safety.md)
- [logging/01-logging-standards.md](file:///Users/name/trusted-git/oss/spec/logging/01-logging-standards.md)
- [reliability/01-error-handling.md](file:///Users/name/trusted-git/oss/spec/reliability/01-error-handling.md)
- [testing/01-bug-first-tests.md](file:///Users/name/trusted-git/oss/spec/testing/01-bug-first-tests.md)
- [testing/02-real-dependencies-only.md](file:///Users/name/trusted-git/oss/spec/testing/02-real-dependencies-only.md)
- [typescript/01-no-any.md](file:///Users/name/trusted-git/oss/spec/typescript/01-no-any.md)
