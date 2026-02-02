#!/usr/bin/env node

/**
 * @file log-aggregator.mjs
 * @description Development log aggregator for Code 3D Visualizer.
 * Collects, filters, and formats structured logs from the extension.
 */

import { createWriteStream } from 'fs';

// Create write streams for different log destinations
const logFile = createWriteStream('./logs/extension.log', { flags: 'a' });
const errorFile = createWriteStream('./logs/error.log', { flags: 'a' });

// Process logs line by line
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', (/** @type {string} */ chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    lines.forEach(line => {
        if (line.trim()) {
            try {
                const logEntry = JSON.parse(line);
                
                // Write all logs to main log file
                logFile.write(JSON.stringify(logEntry) + '\n');
                
                // Write errors to separate error file
                if (logEntry.level === 'ERROR' || logEntry.level === 'FATAL') {
                    errorFile.write(JSON.stringify(logEntry) + '\n');
                }
                
                // Also output to console for development visibility
                // eslint-disable-next-line no-console -- Log aggregator output
                console.log(JSON.stringify(logEntry));
            } catch {
                // eslint-disable-next-line no-console -- Error reporting
                console.error('Failed to parse log line:', line);
            }
        }
    });
});

process.stdin.on('end', () => {
    if (buffer.trim()) {
        // eslint-disable-next-line no-console -- Final log output
        console.log(JSON.stringify(JSON.parse(buffer)));
    }
    logFile.end();
    errorFile.end();
});

// eslint-disable-next-line no-console -- Startup message
console.log('Log aggregator started. Pipe extension logs to this process.');
// eslint-disable-next-line no-console -- Usage example
console.log('Example: npm run test 2>&1 | node scripts/log-aggregator.mjs');
