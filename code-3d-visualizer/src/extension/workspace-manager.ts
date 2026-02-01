/**
 * @file workspace-manager.ts
 * @description Coordinates scanning and parsing of the entire codebase.
 */

import * as vscode from 'vscode';
import { logger } from '../common/logger';
import { FileParser } from './parser';
import { Block } from '../common/contract';

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
    ): Promise<Block[]> {
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

        const allObjects: Block[] = [];
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
                    // Distribute files in a spiral as well to keep them centered around spawn
                    const islandScale = 8; // Much tighter clustering
                    const islandRadius = islandScale * Math.sqrt(fileIndex);
                    const islandAngle = fileIndex * 2.4;

                    const islandX = Math.round(islandRadius * Math.cos(islandAngle));
                    const islandZ = Math.round(islandRadius * Math.sin(islandAngle));

                    // This map is creating nested arrays if we are not careful
                    // `objects` is Block[]
                    return objects.map((obj) => ({
                        ...obj,
                        position: {
                            x: obj.position.x + islandX,
                            y: obj.position.y,
                            z: obj.position.z + islandZ
                        }
                    }));
                } catch (error) {
                    logger.error(`Failed to parse ${fileUri.fsPath}`, { error });
                    // Return empty array on error, flattened later
                    return [] as Block[];
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
