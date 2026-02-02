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
    const extensionCtx = await esbuild.context({
        entryPoints: ['src/extension/extension.cts'],
        bundle: true,
        format: 'cjs',
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: 'node',
        outfile: 'dist/extension.cjs',
        external: ['vscode'],
        logLevel: 'silent',
        plugins: [resolveMjsJsToTs],
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
        plugins: [resolveMjsJsToTs],
    });

    if (watch) {
        await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
    } else {
        try {
            await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
        } catch (err) {
            // eslint-disable-next-line no-console -- Disabling because this is a build script where terminal output is the primary interface.
            console.error("Build failed:", err);
            process.exit(1);
        } finally {
            await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
        }
    }
}

main().catch(e => {
    // eslint-disable-next-line no-console -- Disabling because this is the build entry point and errors must be visible in the terminal.
    console.error(e);
    process.exit(1);
});
