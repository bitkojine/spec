#!/usr/bin/env node

/**
 * @file cli-to-elk.mjs
 * @description Universal CLI to ELK transport for all command outputs.
 * Catches any command output and sends it to ELK stack.
 */

import { spawn } from 'child_process';
import { createSocket } from 'dgram';
import { createWriteStream } from 'fs';

// Configuration
const LOGSTASH_HOST = process.env.LOGSTASH_HOST || 'localhost';
const LOGSTASH_PORT = process.env.LOGSTASH_PORT || 5001;
const LOG_FILE = process.env.LOG_FILE || './logs/cli-to-elk.log';

// Get command from arguments
const command = process.argv.slice(2);
if (command.length === 0) {
    // eslint-disable-next-line no-console -- CLI usage
    console.error('Usage: node scripts/cli-to-elk.mjs <command> [args...]');
    process.exit(1);
}

// Create UDP client for Logstash
const client = createSocket('udp4');

// Log file for backup
const logFile = createWriteStream(LOG_FILE, { flags: 'a' });

// Metrics
let sentCount = 0;
let errorCount = 0;

// Show connection status
// eslint-disable-next-line no-console -- Connection status
console.log(`CLI-to-ELK connected to Logstash at ${LOGSTASH_HOST}:${LOGSTASH_PORT}`);

// Handle UDP errors
client.on('error', (err) => {
    errorCount++;
    // eslint-disable-next-line no-console -- Error reporting
    console.error('Logstash UDP error:', err.message);
});

// Send to ELK via UDP
function sendToElk(data) {
    try {
        const logEntry = {
            "@timestamp": new Date().toISOString(),
            level: data.level || "INFO",
            service: "CLI",
            message: data.message || "Command output",
            application: "code-3d-visualizer",
            context: {
                command: command.join(' '),
                pid: process.pid,
                ...data.context
            },
            transport: {
                timestamp: new Date().toISOString(),
                source: "cli-to-elk-transport",
                version: "1.0.0"
            }
        };

        const message = Buffer.from(JSON.stringify(logEntry));
        
        // Send via UDP
        client.send(message, LOGSTASH_PORT, LOGSTASH_HOST, (err) => {
            if (err) {
                errorCount++;
                logFile.write(JSON.stringify(logEntry) + '\n');
            } else {
                sentCount++;
            }
        });
        
        // Always write to backup file
        logFile.write(JSON.stringify(logEntry) + '\n');
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
    
    // Send stdout to ELK
    sendToElk({
        level: "INFO",
        message: "Command stdout",
        context: { 
            output: output.trim(),
            stream: 'stdout'
        }
    });
    
    // Also output to console for visibility
    process.stdout.write(data);
});

child.stderr.on('data', (data) => {
    const output = data.toString();
    stderrBuffer += output;
    
    // Send stderr to ELK
    sendToElk({
        level: "ERROR", 
        message: "Command stderr",
        context: { 
            output: output.trim(),
            stream: 'stderr'
        }
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
        client.close();
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
        client.end();
        logFile.end();
        process.exit(1);
    }, 1000);
});
