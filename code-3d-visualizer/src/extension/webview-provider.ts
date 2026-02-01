/**
 * @file webview-provider.ts
 * @description Manages the VSCode Webview lifecycle for the 3D panel.
 */

import * as vscode from 'vscode';
import { isWebviewMessage, VisualReportMessage, isExtensionMessage } from '../common/contract';
import { logger } from '../common/logger';

export class VisualizerWebviewProvider {
    private _lastVisualReport?: VisualReportMessage['payload'];
    private _lastObjectsCount: number = 0;
    private _webviewReadyResolve?: () => void;
    public readonly webviewReadyPromise: Promise<void>;

    constructor() {
        this.webviewReadyPromise = new Promise((resolve) => {
            this._webviewReadyResolve = resolve;
        });
    }

    public handleWebviewMessage(data: unknown): void {
        if (isWebviewMessage(data)) {
            if (data.type === "READY") {
                this._webviewReadyResolve?.();
                logger.info("Webview reported READY");
            } else if (data.type === "VISUAL_REPORT") {
                this._lastVisualReport = data.payload;
                logger.info("Received visual report from webview", data.payload);
            }
        } else if (isExtensionMessage(data)) {
            logger.debug("Received extension message in provider", { type: data.type });
        }
    }

    public setLastObjectsCount(count: number): void {
        this._lastObjectsCount = count;
    }

    public get lastVisualReport(): VisualReportMessage['payload'] | undefined {
        return this._lastVisualReport;
    }

    public get lastObjectsCount(): number {
        return this._lastObjectsCount;
    }

    public getHtmlForWebview(webview: vscode.Webview): string {
        logger.debug("Generating HTML for webview", { webview });

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'unsafe-inline' https://unpkg.com; connect-src https://unpkg.com;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>3D Code View</title>
                <style>
                    body { margin: 0; overflow: hidden; background: #0a0a0c; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                    canvas { width: 100vw; height: 100vh; display: block; }
                    #overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
                    
                    #info-box { background: rgba(20, 20, 25, 0.8); backdrop-filter: blur(8px); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); width: fit-content; max-width: 400px; }
                    #title { font-size: 14px; font-weight: 600; margin-bottom: 5px; color: #a9a9b3; }
                    #status { font-size: 12px; color: #70707a; margin-bottom: 25px; }
                    
                    #progress-container { width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; display: none; }
                    #progress-bar { width: 0%; height: 100%; background: linear-gradient(90deg, #4488ff, #44ccff); transition: width 0.3s ease; }
                    
                    .stat { font-size: 11px; color: #4488ff; margin-top: 8px; font-variant-numeric: tabular-nums; }
                </style>
            </head>
            <body>
                <div id="overlay">
                    <div id="info-box">
                        <div id="title">CODEBASE EXPLORER</div>
                        <div id="status">Ready to visualize</div>
                        <div id="progress-container">
                            <div id="progress-bar"></div>
                        </div>
                        <div id="count" class="stat"></div>
                    </div>
                </div>
                <canvas id="canvas"></canvas>
                <script type="importmap">
                    {
                        "imports": {
                            "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                            "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
                        }
                    }
                </script>
                <script type="module">
                    import * as THREE from 'three';
                    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

                    const vscode = acquireVsCodeApi();
                    const canvas = document.getElementById('canvas');
                    
                    const renderer = new THREE.WebGLRenderer({ 
                        canvas, 
                        antialias: true,
                        preserveDrawingBuffer: true 
                    });
                    renderer.setSize(window.innerWidth, window.innerHeight);
                    renderer.setPixelRatio(window.devicePixelRatio);

                    const scene = new THREE.Scene();
                    scene.background = new THREE.Color(0x0a0a0c);
                    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.002);

                    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
                    camera.position.set(200, 200, 200);

                    const controls = new OrbitControls(camera, renderer.domElement);
                    controls.enableDamping = true;
                    controls.dampingFactor = 0.05;

                    const ambientLight = new THREE.AmbientLight(0x404040, 2);
                    scene.add(ambientLight);

                    const pointLight = new THREE.PointLight(0xffffff, 1000, 1000);
                    pointLight.position.set(100, 200, 100);
                    scene.add(pointLight);

                    const objectsGroup = new THREE.Group();
                    scene.add(objectsGroup);

                    function runVisualCheck() {
                        const gl = renderer.getContext();
                        const pixels = new Uint8Array(4 * gl.drawingBufferWidth * gl.drawingBufferHeight);
                        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                        
                        let coloredPixels = 0;
                        for (let i = 0; i < pixels.length; i += 4) {
                            const r = pixels[i];
                            const g = pixels[i+1];
                            const b = pixels[i+2];
                            if (r !== 10 || g !== 10 || b !== 12) {
                                coloredPixels++;
                                if (coloredPixels > 5000) break; 
                            }
                        }
                        
                        vscode.postMessage({
                            type: 'VISUAL_REPORT',
                            payload: {
                                hasPixels: coloredPixels > 0,
                                pixelCount: coloredPixels
                            }
                        });
                    }

                    // Report READY immediately on script execution
                    vscode.postMessage({ type: 'READY' });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        const statusEl = document.getElementById('status');
                        const progressContainer = document.getElementById('progress-container');
                        const progressBar = document.getElementById('progress-bar');
                        const countEl = document.getElementById('count');

                        if (message.type === 'PROGRESS') {
                            progressContainer.style.display = 'block';
                            statusEl.textContent = message.payload.message;
                            if (message.payload.totalFiles) {
                                const percent = (message.payload.currentFile / message.payload.totalFiles) * 100;
                                progressBar.style.width = \`\${percent}%\`;
                                countEl.textContent = \`Processed \${message.payload.currentFile}/\${message.payload.totalFiles} files\`;
                            }
                        }

                        if (message.type === 'UPDATE_SCENE') {
                            progressContainer.style.display = 'none';
                            progressBar.style.width = '0%';
                            statusEl.textContent = \`Visualized: \${message.payload.originFile}\`;
                            countEl.textContent = \`Total Objects: \${message.payload.objects.length}\`;

                            while(objectsGroup.children.length > 0) { 
                                objectsGroup.remove(objectsGroup.children[0]); 
                            }

                            message.payload.objects.forEach(data => {
                                const geometry = data.type === 'class' ? new THREE.BoxGeometry(5, 5, 5) : new THREE.SphereGeometry(3, 16, 16);
                                const color = new THREE.Color(data.color);
                                const material = new THREE.MeshPhongMaterial({ 
                                    color,
                                    emissive: color,
                                    emissiveIntensity: 0.5,
                                    shininess: 100
                                });
                                const mesh = new THREE.Mesh(geometry, material);
                                mesh.position.set(data.position.x, data.position.y, data.position.z);
                                objectsGroup.add(mesh);
                            });
                            
                            const box = new THREE.Box3().setFromObject(objectsGroup);
                            const center = box.getCenter(new THREE.Vector3());
                            const size = box.getSize(new THREE.Vector3());
                            const maxDim = Math.max(size.x, size.y, size.z);
                            const fov = camera.fov * (Math.PI / 180);
                            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                            cameraZ *= 1.2; // Move closer (was 2)

                            camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
                            camera.lookAt(center);
                            controls.target.copy(center);

                            setTimeout(runVisualCheck, 500);
                        }
                    });

                    function animate() {
                        requestAnimationFrame(animate);
                        controls.update();
                        renderer.render(scene, camera);
                    }
                    animate();

                    window.addEventListener('resize', () => {
                        camera.aspect = window.innerWidth / window.innerHeight;
                        camera.updateProjectionMatrix();
                        renderer.setSize(window.innerWidth, window.innerHeight);
                    });
                </script>
            </body>
            </html>`;
    }
}
