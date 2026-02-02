/**
 * @file parser.cts
 * @description Parses code files into 3D object metadata using robust pattern matching.
 */

import * as vscode from 'vscode';
import { Block, BlockType } from '../common/contract.cjs';
import { logger } from '../common/logger.cjs';
import { VisualizerError } from '../common/errors.cjs';
import { PerformanceMetrics } from '../common/performance-metrics.cjs';

export class FileParser {
    public async parse(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<Block[]> {
        return await PerformanceMetrics.measure("FILE_PARSE", async () => {
            const text = document.getText();
            const lines = text.split('\n');
            const objects: Block[] = [];
            let inBlockComment = false;

            for (let i = 0; i < lines.length; i++) {
                if (token.isCancellationRequested) {
                    throw new VisualizerError("CANCELLATION_REQUESTED", "Parsing cancelled", true);
                }

                // Yield to the event loop every 200 lines to keep UI responsive without unmanaged timers
                if (i > 0 && i % 200 === 0) {
                    await new Promise(resolve => process.nextTick(resolve));
                }

                let line = lines[i];

                // 0. Handle Block Comments
                if (inBlockComment) {
                    const endIdx = line.indexOf('*/');
                    if (endIdx !== -1) {
                        line = line.substring(endIdx + 2);
                        inBlockComment = false;
                    } else {
                        continue;
                    }
                }

                const startIdx = line.indexOf('/*');
                if (startIdx !== -1) {
                    const endIdx = line.indexOf('*/', startIdx + 2);
                    if (endIdx === -1) {
                        line = line.substring(0, startIdx);
                        inBlockComment = true;
                    } else {
                        // Inline block comment
                        line = line.substring(0, startIdx) + line.substring(endIdx + 2);
                    }
                }

                // 0.1 Handle Strings (basic) - replace content of strings to avoid false matches
                line = line.replace(/(['"`])(?:(?!\1).|\\.)*\1/g, '""');

                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) continue;

                // 1. Classes, Interfaces, Enums (including exported)
                const classMatch = trimmedLine.match(/\b(export\s+)?(class|abstract\s+class|interface|enum)\s+(\w+)/);
                if (classMatch) {
                    logger.debug(`Matched Class: ${classMatch[3]}`);
                    objects.push(this.createObject(classMatch[3], 'class', objects.length, document.fileName));
                    continue;
                }

                // 2. Named Functions (including exported and async)
                const funcMatch = trimmedLine.match(/\b(export\s+)?(async\s+)?function\*?\s+(\w+)/);
                if (funcMatch) {
                    logger.debug(`Matched Fun: ${funcMatch[3]}`);
                    objects.push(this.createObject(funcMatch[3], 'function', objects.length, document.fileName));
                    continue;
                }

                // 3. Arrow Functions & Const Assignments (including exported)
                const constMatch = trimmedLine.match(/\b(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?(\(.*\)|[\w$]+)\s*=>/) ||
                    trimmedLine.match(/\b(export\s+)?(const|let|var)\s+(\w+)\s*=\s*function/);
                if (constMatch) {
                    logger.debug(`Matched Arrow/Const: ${constMatch[3]}`);
                    objects.push(this.createObject(constMatch[3], 'function', objects.length, document.fileName));
                    continue;
                }

                // 4. Methods (implicit or explicit visibility)
                // Use negative lookbehind to avoid matching method calls like this.method() or obj.method()
                const methodMatch = trimmedLine.match(/(?<!\.)\b(public|private|protected|static|async)?\s*(async\s+)?(\w+)\s*\(/);
                if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'await', 'return', 'yield'].includes(methodMatch[3])) {
                    logger.debug(`Matched Method: ${methodMatch[3]}`);
                    objects.push(this.createObject(methodMatch[3], 'function', objects.length, document.fileName));
                    continue;
                }
            }

            logger.debug("Parsing completed", { fileName: document.fileName, objectCount: objects.length });
            return objects;
        }, { fileName: document.fileName, fileSize: document.getText().length });
    }

    private createObject(name: string, type: "class" | "function", blockIndex: number, fileName: string): Block {
        const blockType: BlockType = type === 'class' ? 'class_block' : 'function_block';

        // Spiral Layout (Fermat's Spiral for constant density)
        const scaling = 1.5;
        const radius = scaling * Math.sqrt(blockIndex);
        const angle = blockIndex * 2.4;

        const x = Math.round(radius * Math.cos(angle));
        const z = Math.round(radius * Math.sin(angle));

        // Stable and unique ID based on filename and index
        const fileHash = Buffer.from(fileName).toString('base64').replace(/[/+=]/g, '');
        const id = `block_${fileHash}_${blockIndex}`;

        return {
            id,
            type: blockType,
            position: { x, y: 0, z },
            metadata: {
                name,
                originalType: type
            },
            color: type === 'class' ? 0xd4AF37 : 0x00CED1
        };
    }
}
