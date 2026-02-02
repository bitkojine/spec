#!/usr/bin/env node

/**
 * @file elk-transport.mjs
 * @description ELK Stack transport for Code 3D Visualizer logs.
 * Sends structured logs to Logstash for processing in ELK stack.
 */

import dgram from 'dgram';
import { createWriteStream } from 'fs';

// Configuration
const LOGSTASH_HOST = process.env.LOGSTASH_HOST || 'localhost';
const LOGSTASH_PORT = process.env.LOGSTASH_PORT || 5001;
const LOG_FILE = process.env.LOG_FILE || './logs/elk-transport.log';

// Create UDP client for Logstash
const client = dgram.createSocket('udp4');

// Log file for backup
const logFile = createWriteStream(LOG_FILE, { flags: 'a' });

// Metrics
let sentCount = 0;
let errorCount = 0;

// Handle UDP client events
client.on('error', (err) => {
    errorCount++;
    // eslint-disable-next-line no-console -- Error reporting
    console.error('Logstash UDP error:', err.message);
});

function sendToElk(data) {
    try {
        const logEntry = {
            "@timestamp": new Date().toISOString(),
            level: data.level || "INFO",
            service: data.service || "CLI",
            message: data.message || "Command output",
            application: "code-3d-visualizer",
            context: {
                command: command.join(' '),
                pid: process.pid,
                ...data.context
            },
            transport: {
                timestamp: new Date().toISOString(),
                source: "elk-transport",
                version: "1.0.0"
            }
        };

        const message = Buffer.from(JSON.stringify(logEntry) + '\n');
        client.send(message, LOGSTASH_PORT, LOGSTASH_HOST, (err) => {
            if (err) {
                errorCount++;
                // Fallback to file
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

// eslint-disable-next-line no-console -- Startup message
console.log(`ELK Transport started. Sending logs to ${LOGSTASH_HOST}:${LOGSTASH_PORT}`);
console.log('Example: npm run test 2>&1 | node scripts/elk-transport.mjs');

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
                
                // Add transport metadata
                const enrichedLog = {
                    ...logEntry,
                    transport: {
                        timestamp: new Date().toISOString(),
                        source: 'code-3d-visualizer-elk-transport',
                        version: '1.0.0'
                    }
                };
                
                // Send to Logstash via UDP
                const message = Buffer.from(JSON.stringify(enrichedLog) + '\n');
                client.send(message, LOGSTASH_PORT, LOGSTASH_HOST, (err) => {
                    if (err) {
                        errorCount++;
                        // Fallback to file
                        logFile.write(JSON.stringify(enrichedLog) + '\n');
                    } else {
                        sentCount++;
                    }
                });
                
                // Also write to backup file
                logFile.write(JSON.stringify(enrichedLog) + '\n');
                
            } catch {
                // eslint-disable-next-line no-console -- Error reporting
                console.error('Failed to parse log line:', line);
            }
        }
    });
});

process.stdin.on('end', () => {
    if (buffer.trim()) {
        try {
            const enrichedLog = JSON.parse(buffer);
            const message = Buffer.from(JSON.stringify(enrichedLog) + '\n');
            client.send(message, LOGSTASH_PORT, LOGSTASH_HOST);
            logFile.write(JSON.stringify(enrichedLog) + '\n');
        } catch {
            // eslint-disable-next-line no-console -- Error reporting
            console.error('Failed to parse final log line:', buffer);
        }
    }
    
    // Wait a moment for final sends
    setTimeout(() => {
        client.close();
        logFile.end();
        
        // eslint-disable-next-line no-console -- Metrics reporting
        console.log(`ELK Transport Summary: ${sentCount} sent, ${errorCount} errors`);
    }, 1000);
});
