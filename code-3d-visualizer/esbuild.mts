/// <reference types="node" />
import * as esbuild from "esbuild";
import * as path from "path";

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Plugin to resolve .mjs and .js imports to their respective .mts and .ts source files.
 * This is necessary for Node16/NodeNext resolution in TypeScript.
 */
const resolveMjsJsToTs: esbuild.Plugin = {
    name: 'resolve-mjs-js-to-ts',
    setup(build) {
        // Resolve .mjs -> .mts
        build.onResolve({ filter: /.*\.mjs$/ }, args => {
            const resolveDir = args.resolveDir || path.dirname(args.importer);
            return { path: path.join(resolveDir, args.path.replace('.mjs', '.mts')) };
        });
        // Resolve .cjs -> .cts
        build.onResolve({ filter: /.*\.cjs$/ }, args => {
            const resolveDir = args.resolveDir || path.dirname(args.importer);
            return { path: path.join(resolveDir, args.path.replace('.cjs', '.cts')) };
        });
        // Resolve .js -> .ts (for project source files only, avoid node_modules)
        build.onResolve({ filter: /.*\.js$/ }, args => {
            if (args.path.startsWith('.') || args.path.startsWith('/')) {
                const resolveDir = args.resolveDir || path.dirname(args.importer);
                return { path: path.join(resolveDir, args.path.replace('.js', '.ts')) };
            }
            return undefined; // Let esbuild handle it normally
        });
    },
};

async function main() {
    const buildExtension = process.argv.includes('--extension') || !process.argv.some(arg => arg.startsWith('--'));
    const buildWebview = process.argv.includes('--webview') || !process.argv.some(arg => arg.startsWith('--'));

    const extensionCtx = buildExtension ? await esbuild.context({
        entryPoints: ['src/extension/extension.cts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/extension.cjs',
        external: ['vscode'],
        logLevel: 'info',
        plugins: [resolveMjsJsToTs],
    }) : undefined;

    const webviewCtx = buildWebview ? await esbuild.context({
        entryPoints: ['src/webview/webview-script.mts'],
        bundle: true,
        format: 'iife', // Browser friendly
        minify: true,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'browser',
        outfile: 'dist/webview-script.js',
        logLevel: 'info',
        plugins: [resolveMjsJsToTs],
    }) : undefined;

    if (watch) {
        const promises = [];
        if (extensionCtx) promises.push(extensionCtx.watch());
        if (webviewCtx) promises.push(webviewCtx.watch());
        await Promise.all(promises);
    } else {
        try {
            const promises = [];
            if (extensionCtx) promises.push(extensionCtx.rebuild());
            if (webviewCtx) promises.push(webviewCtx.rebuild());
            await Promise.all(promises);
        } catch (err) {
            // eslint-disable-next-line no-console -- Build script error output
            console.error("Build failed:", err instanceof Error ? err.message : String(err));
            process.exit(1);
        } finally {
            const promises = [];
            if (extensionCtx) promises.push(extensionCtx.dispose());
            if (webviewCtx) promises.push(webviewCtx.dispose());
            await Promise.all(promises);
        }
    }
}

main().catch(e => {
    // eslint-disable-next-line no-console -- Build script error output
    console.error("Build entry point error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
});
