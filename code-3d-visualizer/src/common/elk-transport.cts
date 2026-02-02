/**
 * @file elk-transport.cts
 * @description ELK Stack transport for structured logging.
 * Sends logs directly to Logstash via UDP.
 */

import dgram from 'dgram';
import { createWriteStream } from 'fs';

export interface LogEntry {
    timestamp: string;
    level: "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
    service: string;
    message: string;
    context?: Record<string, unknown>;
}

export interface ElkTransportConfig {
    logstashHost?: string;
    logstashPort?: number;
    logFile?: string;
    enabled?: boolean;
}

export class ElkTransport {
    private client: dgram.Socket;
    private logFile: NodeJS.WritableStream;
    private config: Required<ElkTransportConfig>;
    private sentCount = 0;
    private errorCount = 0;

    constructor(config: ElkTransportConfig = {}) {
        this.config = {
            logstashHost: config.logstashHost || process.env.LOGSTASH_HOST || 'localhost',
            logstashPort: config.logstashPort || parseInt(process.env.LOGSTASH_PORT || '5001'),
            logFile: config.logFile || process.env.LOG_FILE || './logs/elk-transport.log',
            enabled: config.enabled ?? (process.env.ELK_ENABLED !== 'false')
        };

        // Create UDP client for Logstash
        this.client = dgram.createSocket('udp4');

        // Log file for backup
        this.logFile = createWriteStream(this.config.logFile, { flags: 'a' });

        // Handle UDP client events
        this.client.on('error', (_err) => {
            this.errorCount++;
            // Silently handle errors to avoid infinite loops
        });

        // Handle client close
        this.client.on('close', () => {
            this.logFile.end();
        });
    }

    public send(logEntry: LogEntry): void {
        if (!this.config.enabled) {
            return;
        }

        try {
            const elkLogEntry = {
                timestamp: logEntry.timestamp,
                level: logEntry.level,
                service: logEntry.service,
                message: logEntry.message,
                application: "code-3d-visualizer",
                context: logEntry.context,
                transport: {
                    timestamp: new Date().toISOString(),
                    source: "elk-transport",
                    version: "1.0.0"
                }
            };

            const message = Buffer.from(JSON.stringify(elkLogEntry) + '\n');
            
            this.client.send(message, this.config.logstashPort, this.config.logstashHost, (_err) => {
                if (_err) {
                    this.errorCount++;
                    // Fallback to file
                    this.logFile.write(JSON.stringify(elkLogEntry) + '\n');
                } else {
                    this.sentCount++;
                }
            });
            
            // Always write to backup file
            this.logFile.write(JSON.stringify(elkLogEntry) + '\n');
        } catch {
            this.errorCount++;
            // Silently handle errors to avoid infinite loops
        }
    }

    public getMetrics(): { sent: number; errors: number } {
        return { sent: this.sentCount, errors: this.errorCount };
    }

    public close(): void {
        // Close immediately - no need for delay in this use case
        this.client.close();
    }
}

// Global ELK transport instance
let elkTransport: ElkTransport | undefined;

export function initializeElkTransport(config?: ElkTransportConfig): ElkTransport {
    elkTransport = new ElkTransport(config);
    return elkTransport;
}

export function getElkTransport(): ElkTransport | undefined {
    return elkTransport;
}

export function sendToElk(logEntry: LogEntry): void {
    if (elkTransport) {
        elkTransport.send(logEntry);
    }
}
