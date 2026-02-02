#!/usr/bin/env node

/**
 * @file cli-to-elk.mjs
 * @description Universal CLI to ELK transport for all command outputs.
 * Catches any command output and sends it to ELK stack.
 */

import { spawn } from 'child_process';
import { Socket } from 'net';
import { createWriteStream, readFileSync } from 'fs';
import { join } from 'path';

// Configuration
const LOGSTASH_HOST = process.env.LOGSTASH_HOST || 'localhost';
const LOGSTASH_PORT = process.env.LOGSTASH_PORT || 5001;
const LOG_FILE = process.env.LOG_FILE || './logs/cli-to-elk.log';
const BUILD_ID = process.env.BUILD_ID || `dev-${new Date().toISOString().replace(/[:.]/g, '-')}`;

// Read version from package.json
let APP_VERSION = 'unknown';
try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    APP_VERSION = pkg.version;
} catch (e) {
    // Fallback to unknown
}

// Get command from arguments
const command = process.argv.slice(2);
if (command.length === 0) {
    // eslint-disable-next-line no-console -- CLI usage
    console.error('Usage: node scripts/cli-to-elk.mjs <command> [args...]');
    process.exit(1);
}

// Create TCP client for Logstash
const client = new Socket();
let isConnected = false;
let pendingLogs = [];

client.connect(LOGSTASH_PORT, LOGSTASH_HOST, () => {
    isConnected = true;
    // eslint-disable-next-line no-console -- Connection status
    console.log(`CLI-to-ELK connected to Logstash at ${LOGSTASH_HOST}:${LOGSTASH_PORT} (Build: ${BUILD_ID})`);

    // Send any logs that were queued while connecting
    while (pendingLogs.length > 0) {
        const log = pendingLogs.shift();
        client.write(log + '\n');
    }
});

// Log file for backup
const logFile = createWriteStream(LOG_FILE, { flags: 'a' });

// Metrics
let sentCount = 0;
let errorCount = 0;

// Handle TCP errors
client.on('error', (err) => {
    errorCount++;
    isConnected = false;
    // eslint-disable-next-line no-console -- Error reporting
    console.error('Logstash TCP error:', err.message);
});

// Send to ELK via TCP
function sendToElk(data, isAlreadyStructured = false) {
    try {
        let logEntry;

        if (isAlreadyStructured) {
            logEntry = {
                ...data,
                "@timestamp": data["@timestamp"] || data.timestamp || new Date().toISOString(),
                "service_id": data.serviceId || data.service_id || data.service || "CLI",
                "correlation_id": data.correlationId || data.correlation_id || BUILD_ID,
                context: {
                    ...data.context,
                    build_id: BUILD_ID,
                    version: APP_VERSION
                },
                transport: {
                    timestamp: new Date().toISOString(),
                    source: "cli-to-elk-unwrapped",
                    version: "1.7.0"
                }
            };
            // Clean up old fields if present
            delete logEntry.service;
            delete logEntry.serviceId;
            delete logEntry.correlationId;
            delete logEntry.timestamp;
        } else {
            logEntry = {
                "@timestamp": new Date().toISOString(),
                level: data.level || "INFO",
                "service_id": "CLI",
                "correlation_id": BUILD_ID,
                message: data.message || "Command output",
                application: "code-3d-visualizer",
                context: {
                    command: command.join(' '),
                    pid: process.pid,
                    build_id: BUILD_ID,
                    version: APP_VERSION,
                    ...data.context
                },
                transport: {
                    timestamp: new Date().toISOString(),
                    source: "cli-to-elk-wrapped",
                    version: "1.7.0"
                }
            };
        }

        const payload = JSON.stringify(logEntry);

        if (isConnected) {
            client.write(payload + '\n');
            sentCount++;
        } else {
            pendingLogs.push(payload);
        }

        // Always write to backup file
        logFile.write(payload + '\n');
    } catch (err) {
        errorCount++;
        // eslint-disable-next-line no-console -- Error reporting
        console.error('Failed to send to ELK:', err.message);
    }
}

// Send command start log
sendToElk({
    level: "INFO",
    message: "Command started",
    context: {
        command: command.join(' '),
        args: command,
        cwd: process.cwd()
    }
});

// Spawn the command
const child = spawn(command[0], command.slice(1), {
    stdio: ['inherit', 'pipe', 'pipe']
});

let stdoutBuffer = '';
let stderrBuffer = '';

child.stdout.on('data', (data) => {
    const output = data.toString();
    stdoutBuffer += output;

    // Split by lines and handle each separately for JSON detection
    const lines = output.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        let jsonPayload = null;
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.timestamp && parsed.level && parsed.service) {
                jsonPayload = parsed;
            }
        } catch (e) {
            // Not JSON
        }

        if (jsonPayload) {
            sendToElk({
                ...jsonPayload,
                application: "code-3d-visualizer",
                source: "cli-unwrapped"
            }, true);
        } else {
            sendToElk({
                level: "INFO",
                message: trimmed,
                context: { stream: 'stdout' },
                source: "cli-wrapped"
            });
        }
    });

    // Also output to console for visibility
    process.stdout.write(data);
});

child.stderr.on('data', (data) => {
    const output = data.toString();
    stderrBuffer += output;

    const lines = output.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        sendToElk({
            level: "ERROR",
            message: trimmed,
            context: { stream: 'stderr' },
            source: "cli-wrapped"
        });
    });

    // Also output to stderr for visibility
    process.stderr.write(data);
});

child.on('close', (code) => {
    // Send command completion log
    sendToElk({
        level: code === 0 ? "INFO" : "ERROR",
        message: `Command ${code === 0 ? 'completed' : 'failed'}`,
        context: {
            exitCode: code,
            stdoutLength: stdoutBuffer.length,
            stderrLength: stderrBuffer.length
        }
    });

    setTimeout(() => {
        client.destroy();
        logFile.end();

        // eslint-disable-next-line no-console -- Summary
        console.log(`CLI-to-ELK Summary: ${sentCount} sent, ${errorCount} errors`);
        process.exit(code);
    }, 1000);
});

child.on('error', (err) => {
    sendToElk({
        level: "ERROR",
        message: "Command spawn failed",
        context: {
            error: err.message,
            command: command.join(' ')
        }
    });

    setTimeout(() => {
        client.destroy();
        logFile.end();
        process.exit(1);
    }, 1000);
});
