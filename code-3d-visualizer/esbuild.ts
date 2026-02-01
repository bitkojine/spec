/// <reference types="node" />
import * as esbuild from "esbuild";

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const extensionCtx = await esbuild.context({
        entryPoints: ['src/extension/extension.ts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/extension.js',
        external: ['vscode'],
        logLevel: 'silent',
        plugins: [/* add any plugins if needed */],
    });

    const webviewCtx = await esbuild.context({
        entryPoints: ['src/webview/webview-script.mts'],
        bundle: true,
        format: 'iife', // Browser friendly
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'browser',
        outfile: 'dist/webview-script.js',
        logLevel: 'silent',
        plugins: [],
    });

    if (watch) {
        await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
    } else {
        await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
        await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
