/**
 * @file parser.test.ts
 * @description Bug-first tests for FileParser.
 * Following testing/01-bug-first-tests.md and testing/02-real-dependencies-only.md.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileParser } from '../extension/parser';
import { VisualizerError } from '../common/errors';

suite('FileParser Bug-First Tests', () => {
    const parser = new FileParser();

    /**
     * @bug Handling of empty files.
     * @failure_cause Mutation: if line split logic fails on empty string or returns undefined.
     * @prevented_behavior Application crash or returning undefined when an empty array is expected.
     */
    test('Should return empty array for empty document', async () => {
        const doc = await vscode.workspace.openTextDocument({ content: "" });
        const cts = new vscode.CancellationTokenSource();
        const results = await parser.parse(doc, cts.token);
        assert.strictEqual(results.length, 0);
    });

    /**
     * @bug Extraction of class names.
     * @failure_cause Mutation: Regex or split logic incorrectly handles spaces or missing braces.
     * @prevented_behavior Visualizing objects with 'undefined' or incorrect names.
     */
    test('Should correctly extract class name', async () => {
        const content = "class MyTestClass {}";
        const doc = await vscode.workspace.openTextDocument({ content });
        const cts = new vscode.CancellationTokenSource();
        const results = await parser.parse(doc, cts.token);

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].name, 'MyTestClass');
        assert.strictEqual(results[0].type, 'class');
    });

    /**
     * @bug Cancellation safety.
     * @failure_cause Mutation: Ignoring the cancellation token and continuing to parse.
     * @prevented_behavior Resource leaks and UI lag when parsing large files that are no longer needed.
     */
    test('Should throw CANCELED if token is cancelled', async () => {
        const content = "class A {}\n".repeat(1000); // Larger file to ensure async batching
        const doc = await vscode.workspace.openTextDocument({ content });
        const cts = new vscode.CancellationTokenSource();

        // Immediate cancellation
        cts.cancel();

        try {
            await parser.parse(doc, cts.token);
            assert.fail("Should have thrown CANCELLATION_REQUESTED");
        } catch (error) {
            if (error instanceof VisualizerError) {
                assert.strictEqual(error.code, "CANCELLATION_REQUESTED");
            } else {
                assert.fail("Error should be an instance of VisualizerError");
            }
        }
    });
});
