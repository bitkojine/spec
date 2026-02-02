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

            for (let i = 0; i < lines.length; i++) {
                if (token.isCancellationRequested) {
                    throw new VisualizerError("CANCELLATION_REQUESTED", "Parsing cancelled", true);
                }

                // Yield to the event loop every 200 lines to keep UI responsive without unmanaged timers
                if (i > 0 && i % 200 === 0) {
                    await new Promise(resolve => process.nextTick(resolve));
                }

                const line = lines[i].trim();
                if (!line || line.startsWith('//') || line.startsWith('*')) continue;

                // 1. Classes, Interfaces, Enums (including exported)
                const classMatch = line.match(/\b(export\s+)?(class|abstract\s+class|interface|enum)\s+(\w+)/);
                if (classMatch) {
                    logger.debug(`Matched Class: ${classMatch[3]}`);
                    objects.push(this.createObject(classMatch[3], 'class', objects.length));
                    continue;
                }

                // 2. Named Functions (including exported and async)
                const funcMatch = line.match(/\b(export\s+)?(async\s+)?function\*?\s+(\w+)/);
                if (funcMatch) {
                    logger.debug(`Matched Fun: ${funcMatch[3]}`);
                    objects.push(this.createObject(funcMatch[3], 'function', objects.length));
                    continue;
                }

                // 3. Arrow Functions & Const Assignments (including exported)
                const constMatch = line.match(/\b(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?(\(.*\)|[\w$]+)\s*=>/) ||
                    line.match(/\b(export\s+)?(const|let|var)\s+(\w+)\s*=\s*function/);
                if (constMatch) {
                    logger.debug(`Matched Arrow/Const: ${constMatch[3]}`);
                    objects.push(this.createObject(constMatch[3], 'function', objects.length));
                    continue;
                }

                // 4. Methods (implicit or explicit visibility)
                const methodMatch = line.match(/\b(public|private|protected|static|async)?\s*(async\s+)?(\w+)\s*\(/);
                if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[3])) {
                    logger.debug(`Matched Method: ${methodMatch[3]}`);
                    objects.push(this.createObject(methodMatch[3], 'function', objects.length));
                    continue;
                }
            }

            logger.debug("Parsing completed", { fileName: document.fileName, objectCount: objects.length });
            return objects;
        }, { fileName: document.fileName, fileSize: document.getText().length });
    }

    private createObject(name: string, type: "class" | "function", blockIndex: number): Block {
        const blockType: BlockType = type === 'class' ? 'class_block' : 'function_block';

        // Spiral Layout (Fermat's Spiral for constant density)
        // r = c * sqrt(n)
        const scaling = 1.5;
        const radius = scaling * Math.sqrt(blockIndex);
        const angle = blockIndex * 2.4; // Golden angle approx (in radians ish) to minimize overlap

        let x = Math.round(radius * Math.cos(angle));
        let z = Math.round(radius * Math.sin(angle));

        // Ensure integer grid
        x = Math.round(x);
        z = Math.round(z);

        // On the ground (y=0)
        const y = 0;

        return {
            id: `block_${blockIndex}_${Math.floor(Math.random() * 1000)}`,
            type: blockType,
            position: { x, y, z },
            metadata: {
                name,
                originalType: type
            },
            color: type === 'class' ? 0xd4AF37 : 0x00CED1 // Gold for class, Turquoise for functions
        };
    }
}
