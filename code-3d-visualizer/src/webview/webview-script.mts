/**
 * @file webview-script.mts
 * @description Main entry point for the 3D visualizer webview.
 */
import { BoxGeometry, MeshBasicMaterial, Mesh } from 'three';
import { SceneManager } from './scene-manager.mjs';
import { InputManager } from './input-manager.mjs';
import { VSCodeApi } from './types.mjs';
import { ExtensionToWebviewMessage, Block } from '../common/contract.cjs';
import { managedDelay } from '../common/utils.cjs';
import { logger, setLogger } from '../common/logger.cjs';
import { WebviewLogger } from './webview-logger.mjs';
import { some, none } from '../common/option.cjs';

declare function acquireVsCodeApi(): VSCodeApi;
const vscode = typeof acquireVsCodeApi === 'function' ? some(acquireVsCodeApi()) : none();

// Initialize proper logging bridge
setLogger(new WebviewLogger(vscode));

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const sceneManager = new SceneManager(canvas);
const inputManager = new InputManager(sceneManager.camera, document.body);

sceneManager.scene.add(inputManager.controls.getObject());

// --- World Generation Helpers ---
function createStaticWorld() {
    // Ground
    const size = 100;
    for (let x = -size / 2; x < size / 2; x++) {
        for (let z = -size / 2; z < size / 2; z++) {
            sceneManager.createBlock(x, -1, z, 'grass', sceneManager.worldGroup);
        }
    }

    // Sun
    const sunGeom = new BoxGeometry(10, 10, 10);
    const sunMat = new MeshBasicMaterial({ color: 0xFFD700 });
    const sun = new Mesh(sunGeom, sunMat);
    sun.position.set(50, 80, -50);
    sceneManager.worldGroup.add(sun);
}
createStaticWorld();

// --- Message Handling ---
function runVisualCheck() {
    const gl = sceneManager.renderer.getContext();
    const pixels = new Uint8Array(4 * gl.drawingBufferWidth * gl.drawingBufferHeight);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let coloredPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        if (Math.abs(pixels[i] - 135) > 10) coloredPixels++;
    }

    vscode.forEach(api => {
        api.postMessage({
            type: 'VISUAL_REPORT',
            payload: { hasPixels: coloredPixels > 0, pixelCount: coloredPixels }
        });
    });
}

window.addEventListener('message', async (event: MessageEvent<ExtensionToWebviewMessage>) => {
    try {
        const message = event.data;
        const statusEl = document.getElementById('status');
        const progressBar = document.getElementById('progress-bar');
        const pContainer = document.getElementById('progress-container');

        if (message.type === 'PROGRESS') {
            if (pContainer) pContainer.style.display = 'block';
            if (statusEl) statusEl.textContent = message.payload.message;
            if (message.payload.totalFiles && progressBar) {
                const percent = (message.payload.currentFile! / message.payload.totalFiles) * 100;
                progressBar.style.width = `${percent}%`;
            }
        } else if (message.type === 'UPDATE_SCENE') {
            if (pContainer) pContainer.style.display = 'none';
            if (statusEl) statusEl.textContent = `World Loaded: ${message.payload.originFile}`;

            while (sceneManager.codeGroup.children.length > 0) {
                sceneManager.codeGroup.remove(sceneManager.codeGroup.children[0]);
            }

            message.payload.blocks.forEach((block: Block) => {
                sceneManager.createBlock(block.position.x, block.position.y, block.position.z, block.type, sceneManager.codeGroup);
            });

            await managedDelay(500);
            runVisualCheck();
        }
    } catch (error: unknown) {
        // Log to centralized logger (which now bridges to extension Output Channel)
        logger.error("Webview Message Error", { error: error instanceof Error ? error.message : String(error) });

        if (vscode.type === 'some') {
            vscode.value.postMessage({
                type: "VISUAL_REPORT",
                payload: { hasPixels: false }
            });
        }
    }
});

vscode.forEach(api => api.postMessage({ type: 'READY' }));

// --- Animation Loop ---
let prevTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;

    inputManager.update(delta);
    sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
    prevTime = time;
}
animate();

window.addEventListener('resize', () => {
    sceneManager.camera.aspect = window.innerWidth / window.innerHeight;
    sceneManager.camera.updateProjectionMatrix();
    sceneManager.renderer.setSize(window.innerWidth, window.innerHeight);
});
