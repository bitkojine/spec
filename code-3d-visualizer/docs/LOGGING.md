# Production Logging Infrastructure

This document describes the production-quality logging infrastructure implemented in Code 3D Visualizer.

## Overview

The extension now uses **Pino** - a production-grade JSON logger that provides:
- High-performance, non-blocking logging
- Structured JSON output compatible with log aggregators
- Configurable log levels
- Proper error handling and context preservation

## Architecture

### Components

1. **Common Logger** (`src/common/logger.cts`)
   - Global logger interface and proxy
   - Production-quality Pino implementation
   - Environment-aware configuration

2. **Extension Logger** (`src/extension/extension-logger.cts`)
   - VSCode OutputChannel integration
   - Structured JSON output to VSCode UI
   - Auto-show on errors

3. **Webview Logger** (`src/webview/webview-logger.mts`)
   - Forwards logs to extension host
   - No direct console output (complies with logging standards)

4. **Log Aggregator** (`scripts/log-aggregator.cts`)
   - Development log collection and routing
   - Separates errors to dedicated files
   - Real-time log processing

## Usage

### Basic Logging

```typescript
import { logger } from '../common/logger.cjs';

logger.info("User action completed", { 
    userId: "123", 
    action: "visualize", 
    duration: 1500 
});

logger.error("Failed to parse file", { 
    filename: "example.ts", 
    error: "Syntax error at line 42" 
});
```

### Environment Configuration

```bash
# Set log level (debug, info, warn, error)
export LOG_LEVEL=debug

# Run tests with structured logging
npm run test:with-logs

# Monitor logs in real-time
npm run logs:tail

# Monitor only errors
npm run logs:errors
```

### Log Aggregation

```bash
# Pipe any command output through the log aggregator
npm run test 2>&1 | node scripts/log-aggregator.cts

# This creates:
# - logs/extension.log (all logs)
# - logs/error.log (errors only)
# - Console output (for development visibility)
```

## Log Format

All logs use structured JSON format:

```json
{
  "timestamp": "2026-02-02T18:30:45.123Z",
  "level": "INFO",
  "service": "ExtensionHost",
  "message": "Workspace scan completed",
  "context": {
    "fileCount": 150,
    "duration": 2500,
    "workspace": "/path/to/project"
  }
}
```

## Production vs Development

### Production (VSCode Extension)
- Logs go to VSCode OutputChannel
- Structured JSON format
- Error-level logs auto-show panel
- No console output

### Development
- Logs go to stdout (structured JSON)
- Can be piped to log aggregator
- File-based log separation
- Real-time monitoring capabilities

## Integration with Log Aggregators

The structured JSON output is compatible with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Datadog**
- **CloudWatch Logs**
- **Grafana Loki**
- **Splunk**

Example for ELK integration:
```bash
# Send logs to Logstash
npm run test 2>&1 | node scripts/log-aggregator.cts | nc logstash.example.com 5000
```

## Migration from console.log

### Before (Prohibited)
```typescript
// ❌ Violates logging standards
console.log("Processing file: " + filename);
console.error("Error occurred: " + error.message);
```

### After (Compliant)
```typescript
// ✅ Structured, production-ready
logger.info("Processing file", { filename });
logger.error("Processing failed", { 
    filename, 
    error: error.message,
    stack: error.stack 
});
```

## Performance Benefits

- **Non-blocking**: Async logging doesn't block the main thread
- **Low overhead**: ~5x faster than console.log
- **Memory efficient**: Minimal memory footprint
- **Scalable**: Handles high-throughput scenarios

## Troubleshooting

### No logs appearing
1. Check LOG_LEVEL environment variable
2. Verify logger initialization
3. Check VSCode OutputChannel panel

### Logs not in files
1. Ensure log aggregator is running
2. Check file permissions in logs/ directory
3. Verify pipe syntax: `2>&1 | node scripts/log-aggregator.cts`

### Performance issues
1. Adjust log level to `warn` or `error` in production
2. Use context objects efficiently
3. Avoid logging in hot paths

## Scripts Reference

| Script | Purpose | Example |
|--------|---------|---------|
| `npm run test` | Run tests with info logs | `npm run test` |
| `npm run test:with-logs` | Run tests with debug + aggregation | `npm run test:with-logs` |
| `npm run logs:tail` | Monitor all logs | `npm run logs:tail` |
| `npm run logs:errors` | Monitor errors only | `npm run logs:errors` |
| `npm run logs:clean` | Clean log files | `npm run logs:clean` |

This infrastructure ensures AI coding agents and developers have proper logging tools available, eliminating the need to fall back to `console.log` usage.
