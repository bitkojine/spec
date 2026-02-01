/**
 * @file parser.ts
 * @description Parses code files into 3D object metadata using robust pattern matching.
 */

import * as vscode from 'vscode';
import { Block, BlockType } from '../common/contract';
import { logger } from '../common/logger';
import { VisualizerError } from '../common/errors';

export class FileParser {
    public async parse(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<Block[]> {
        const text = document.getText();
        const lines = text.split('\n');

        return new Promise((resolve, reject) => {
            const objects: Block[] = [];
            let currentLine = 0;

            const parseBatch = () => {
                if (token.isCancellationRequested) {
                    return reject(new VisualizerError("CANCELLATION_REQUESTED", "Parsing cancelled", true));
                }

                const endLine = Math.min(currentLine + 200, lines.length);
                for (let i = currentLine; i < endLine; i++) {
                    const line = lines[i].trim();
                    if (!line || line.startsWith('//') || line.startsWith('*')) continue;

                    // 1. Classes & Interfaces
                    const classMatch = line.match(/\b(class|abstract\s+class|interface|enum)\s+(\w+)/);
                    if (classMatch) {
                        objects.push(this.createObject(classMatch[2], 'class', objects.length));
                        continue;
                    }

                    // 2. Named Functions
                    const funcMatch = line.match(/\bfunction\*?\s+(\w+)/);
                    if (funcMatch) {
                        objects.push(this.createObject(funcMatch[1], 'function', objects.length));
                        continue;
                    }

                    // 3. Arrow Functions & Const Assignments
                    const constMatch = line.match(/\b(const|let|var)\s+(\w+)\s*=\s*(async\s+)?(\(.*\)|[\w$]+)\s*=>/) ||
                        line.match(/\b(const|let|var)\s+(\w+)\s*=\s*function/);
                    if (constMatch) {
                        objects.push(this.createObject(constMatch[2], 'function', objects.length));
                        continue;
                    }

                    // 4. Methods (inside classes)
                    const methodMatch = line.match(/\b(public|private|protected|static)\s+(async\s+)?(\w+)\s*\(/);
                    if (methodMatch) {
                        objects.push(this.createObject(methodMatch[3], 'function', objects.length));
                        continue;
                    }
                }

                currentLine = endLine;
                if (currentLine < lines.length) {
                    setTimeout(parseBatch, 0);
                } else {
                    logger.debug("Parsing completed", { fileName: document.fileName, objectCount: objects.length });
                    resolve(objects);
                }
            };

            parseBatch();
        });
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
