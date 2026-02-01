/**
 * @file workspace-manager.ts
 * @description Coordinates scanning and parsing of the entire codebase.
 */

import * as vscode from 'vscode';
import { logger } from '../common/logger';
import { FileParser } from './parser';
import { CodeObject3D } from '../common/contract';

export class WorkspaceManager {
    private parser: FileParser;

    constructor() {
        this.parser = new FileParser();
    }

    /**
     * Scans the workspace and parses all relevant files.
     */
    public async scanWorkspace(
        token: vscode.CancellationToken,
        progress?: vscode.Progress<{ message?: string; increment?: number }>,
        onProgressMessage?: (msg: string, increment: number, current: number, total: number) => void
    ): Promise<CodeObject3D[]> {
        logger.info("Starting codebase scan");

        const excludes = [
            '**/node_modules/**',
            '**/.vscode-test/**',
            '**/out/**',
            '**/dist/**',
            '**/.git/**'
        ];
        const excludePattern = `{${excludes.join(',')}}`;
        const files = await vscode.workspace.findFiles('**/*.{ts,js}', excludePattern);
        const total = files.length;
        logger.info(`Found ${total} files to parse`);

        if (progress) {
            progress.report({ message: `Found ${total} files. Parsing...`, increment: 0 });
        }
        if (onProgressMessage) {
            onProgressMessage(`Found ${total} files.`, 0, 0, total);
        }

        const allObjects: CodeObject3D[] = [];
        const batchSize = 5;

        for (let i = 0; i < total; i += batchSize) {
            if (token.isCancellationRequested) {
                logger.warn("Workspace scan cancelled");
                break;
            }

            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(async (fileUri) => {
                try {
                    const document = await vscode.workspace.openTextDocument(fileUri);
                    const objects = await this.parser.parse(document, token);
                    logger.debug(`File ${fileUri.fsPath} parsed. Objects found: ${objects.length}`);

                    const fileIndex = files.indexOf(fileUri);
                    return objects.map(obj => ({
                        ...obj,
                        position: {
                            x: obj.position.x + (fileIndex % 10) * 30,
                            y: obj.position.y,
                            z: obj.position.z + Math.floor(fileIndex / 10) * 30
                        }
                    }));
                } catch (error) {
                    logger.error(`Failed to parse ${fileUri.fsPath}`, { error });
                    return [];
                }
            });

            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(results => allObjects.push(...results));

            const current = Math.min(i + batchSize, total);
            const increment = (batch.length / total) * 100;

            if (progress) {
                progress.report({
                    message: `Parsing ${current}/${total} files...`,
                    increment
                });
            }
            if (onProgressMessage) {
                onProgressMessage(`Parsing ${current}/${total} files...`, increment, current, total);
            }
        }

        logger.info("Codebase scan complete", { totalObjects: allObjects.length });
        return allObjects;
    }
}
