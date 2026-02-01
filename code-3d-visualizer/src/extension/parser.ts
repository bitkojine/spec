/**
 * @file parser.ts
 * @description Parses code files into 3D object metadata using robust pattern matching.
 */

import * as vscode from 'vscode';
import { CodeObject3D } from '../common/contract';
import { logger } from '../common/logger';
import { VisualizerError } from '../common/errors';

export class FileParser {
    public async parse(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<CodeObject3D[]> {
        const text = document.getText();
        const lines = text.split('\n');

        return new Promise((resolve, reject) => {
            const objects: CodeObject3D[] = [];
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
                        objects.push(this.createObject(classMatch[2], 'class', i));
                        continue;
                    }

                    // 2. Named Functions
                    const funcMatch = line.match(/\bfunction\*?\s+(\w+)/);
                    if (funcMatch) {
                        objects.push(this.createObject(funcMatch[1], 'function', i));
                        continue;
                    }

                    // 3. Arrow Functions & Const Assignments
                    const constMatch = line.match(/\b(const|let|var)\s+(\w+)\s*=\s*(async\s+)?(\(.*\)|[\w$]+)\s*=>/) ||
                        line.match(/\b(const|let|var)\s+(\w+)\s*=\s*function/);
                    if (constMatch) {
                        objects.push(this.createObject(constMatch[2], 'function', i));
                        continue;
                    }

                    // 4. Methods (inside classes)
                    const methodMatch = line.match(/\b(public|private|protected|static)\s+(async\s+)?(\w+)\s*\(/);
                    if (methodMatch) {
                        objects.push(this.createObject(methodMatch[3], 'function', i));
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

    private createObject(name: string, type: "class" | "function", index: number): CodeObject3D {
        return {
            id: `obj_${index}_${Math.floor(Math.random() * 1000)}`,
            name,
            type,
            position: {
                x: (Math.random() - 0.5) * 40,
                y: index * 0.2,
                z: (Math.random() - 0.5) * 40
            },
            scale: { x: 1, y: 1, z: 1 },
            color: type === 'class' ? '#ff4444' : '#44ff44'
        };
    }
}
