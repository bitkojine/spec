/**
 * @file webview-script.ts
 * @description Bundled script for the 3D visualizer webview.
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// VSCode API
declare function acquireVsCodeApi(): any;
const vscode = acquireVsCodeApi();

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// Physics Constants (Minecraft-like)
// 1 unit = 1 block = 1 meter
const MOVEMENT_SPEED = 50.0;
const DAMPING = 10.0;
const GRAVITY = 30.0;
const JUMP_IMPULSE = 12.0;
const EYE_HEIGHT = 1.6;

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue
// scene.fog = new THREE.Fog(0x87CEEB, 10, 60); // Distance fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = EYE_HEIGHT; // Eye level

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// --- Lights ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
hemiLight.color.setHSL(0.6, 1, 0.6);
hemiLight.groundColor.setHSL(0.095, 1, 0.75);
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(-1, 1.75, 1);
dirLight.position.multiplyScalar(30);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// --- World Generation ---
// --- World Generation ---
const worldGroup = new THREE.Group(); // Static (Ground, Clouds)
const codeGroup = new THREE.Group();  // Dynamic (Code blocks)
scene.add(worldGroup);
scene.add(codeGroup);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const objects: THREE.Object3D[] = []; // For collision detection later if needed

// --- Texture Generation ---
class TextureGenerator {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 64; // Higher res for crisp pixel art
        this.canvas.height = 64;
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false;
    }

    private createNoise(baseColor: string, variance: number): void {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const size = 8; // Pixel size

        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(0, 0, width, height);

        for (let x = 0; x < width; x += size) {
            for (let y = 0; y < height; y += size) {
                if (Math.random() > 0.5) {
                    this.ctx.fillStyle = `rgba(0,0,0,${Math.random() * variance})`;
                } else {
                    this.ctx.fillStyle = `rgba(255,255,255,${Math.random() * variance})`;
                }
                this.ctx.fillRect(x, y, size, size);
            }
        }
    }

    public getGrassMaterial(): THREE.MeshLambertMaterial[] {
        // Top: Green grass
        this.createNoise('#32CD32', 0.1);
        // Add some "blades"
        this.ctx.fillStyle = '#228B22';
        for (let i = 0; i < 20; i++) {
            const x = Math.floor(Math.random() * 8) * 8;
            const y = Math.floor(Math.random() * 8) * 8;
            this.ctx.fillRect(x, y, 4, 4);
        }

        // Clone for top texture
        const topCanvas = document.createElement('canvas');
        topCanvas.width = 64; topCanvas.height = 64;
        topCanvas.getContext('2d')!.drawImage(this.canvas, 0, 0);

        const top = new THREE.CanvasTexture(topCanvas);
        top.magFilter = THREE.NearestFilter;
        top.colorSpace = THREE.SRGBColorSpace;
        const topMat = new THREE.MeshLambertMaterial({ map: top });

        // Side: Dirt with grass top
        this.createNoise('#8B4513', 0.15); // Dirt base
        this.ctx.fillStyle = '#32CD32'; // Grass top strip
        this.ctx.fillRect(0, 0, 64, 16);
        // Grass drip
        for (let x = 0; x < 64; x += 8) {
            if (Math.random() > 0.5) this.ctx.fillRect(x, 16, 8, 8);
        }

        // Clone canvas for side texture
        const sideCanvas = document.createElement('canvas');
        sideCanvas.width = 64; sideCanvas.height = 64;
        sideCanvas.getContext('2d')!.drawImage(this.canvas, 0, 0);
        const side = new THREE.CanvasTexture(sideCanvas);
        side.magFilter = THREE.NearestFilter;
        side.colorSpace = THREE.SRGBColorSpace;
        const sideMat = new THREE.MeshLambertMaterial({ map: side });

        // Bottom: Dirt (handled in return)

        // RE-IMPLEMENTATION for safety:
        return [sideMat, sideMat, topMat, this.createSimpleMaterial('#8B4513', 0.15), sideMat, sideMat];
    }

    public getCloudTexture(): THREE.MeshBasicMaterial {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128; // Larger for smoother clouds
        const ctx = c.getContext('2d')!;

        ctx.fillStyle = 'rgba(0,0,0,0)'; // Transparent
        ctx.clearRect(0, 0, 128, 128);

        // Simple cloud noise
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const size = Math.random() * 20 + 20;
            const alpha = Math.random() * 0.2 + 0.1;

            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(c);
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;

        return new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
    }

    public createSimpleMaterial(color: string, variance: number, border?: string): THREE.MeshLambertMaterial {
        const c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        const ctx = c.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        // Noise
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 64, 64);
        const size = 8;
        for (let x = 0; x < 64; x += size) {
            for (let y = 0; y < 64; y += size) {
                ctx.fillStyle = Math.random() > 0.5 ? `rgba(0,0,0,${Math.random() * variance})` : `rgba(255,255,255,${Math.random() * variance})`;
                ctx.fillRect(x, y, size, size);
            }
        }

        if (border) {
            ctx.strokeStyle = border;
            ctx.lineWidth = 8;
            ctx.strokeRect(0, 0, 64, 64);
            // Inner detail
            ctx.fillStyle = border;
            ctx.fillRect(24, 24, 16, 16);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.magFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshLambertMaterial({ map: tex });
    }
}

const texGen = new TextureGenerator();
const materials = {
    grass: texGen.getGrassMaterial(), // Array of 6
    dirt: texGen.createSimpleMaterial('#8B4513', 0.1),
    stone: texGen.createSimpleMaterial('#808080', 0.1),
    wood: texGen.createSimpleMaterial('#A0522D', 0.1),
    leaf: texGen.createSimpleMaterial('#228B22', 0.2),
    cloudSheet: texGen.getCloudTexture(),
    // Code blocks
    class: texGen.createSimpleMaterial('#FFD700', 0.2, '#B8860B'), // Gold with dark gold border
    function: texGen.createSimpleMaterial('#00CED1', 0.2, '#008B8B') // Turquoise with dark cyan border
};

function createBlock(x: number, y: number, z: number, type: string, group: THREE.Group) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    let material: THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[];

    // Select material based on type
    if (type === 'class_block') material = materials.class;
    else if (type === 'function_block') material = materials.function;
    else if (type === 'grass') material = materials.grass;
    else material = materials.stone; // Fallback

    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x, y, z);
    cube.castShadow = true;
    cube.receiveShadow = true;
    group.add(cube);
    if (group === codeGroup) {
        objects.push(cube); // Only collide with code blocks for now? Or maybe ground too?
        // Actually, for now let's just track code blocks in 'objects' for potential interaction.
        // If we want collision with ground, we need to add ground blocks to collision list or handle ground separately.
    }
    return cube;
}

// Ground
const groundSize = 100;
for (let x = -groundSize / 2; x < groundSize / 2; x += 1) { // 1x1 blocks for better terrain feel
    for (let z = -groundSize / 2; z < groundSize / 2; z += 1) {
        createBlock(x, -1, z, 'grass', worldGroup);
    }
}

// Clouds (Sheets)
function createCloudLayer() {
    const geometry = new THREE.PlaneGeometry(30, 30); // Smaller individual cloud sheets
    const material = materials.cloudSheet;

    // Grid layout to prevent overlap
    const gridSize = 60; // Safe distance (Cloud diagonal ~43)
    const range = 5; // Cover a good area

    for (let x = -range; x <= range; x++) {
        for (let z = -range; z <= range; z++) {
            // 40% chance to have a cloud in this cell to keep it sparse
            if (Math.random() > 0.6) continue;

            const cloud = new THREE.Mesh(geometry, material);
            cloud.rotation.x = -Math.PI / 2;

            // Position in center of grid cell with slight random offset
            const posX = x * gridSize + (Math.random() - 0.5) * 10;
            const posZ = z * gridSize + (Math.random() - 0.5) * 10;
            const posY = 60 + (Math.random() * 10);

            cloud.position.set(posX, posY, posZ);
            cloud.rotation.z = Math.random() * Math.PI * 2;
            worldGroup.add(cloud);
        }
    }
}
createCloudLayer();

// Sun
function createSun() {
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Gold/Yellow (Unlit)
    const sun = new THREE.Mesh(geometry, material);
    sun.position.set(50, 80, -50);
    sun.rotation.z = Math.PI / 4;
    sun.rotation.x = Math.PI / 4;
    worldGroup.add(sun);
}
createSun();


// --- Controls ---
const controls = new PointerLockControls(camera, document.body);
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');

if (instructions) {
    instructions.addEventListener('click', function () {
        controls.lock();
    });
}

controls.addEventListener('lock', function () {
    if (instructions) instructions.style.display = 'none';
    if (blocker) blocker.style.display = 'none';
});

controls.addEventListener('unlock', function () {
    if (blocker) blocker.style.display = 'flex';
    if (instructions) instructions.style.display = '';
});

scene.add(controls.getObject());

const onKeyDown = function (event: KeyboardEvent) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = true; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = true; break;
        case 'ArrowDown': case 'KeyS': moveBackward = true; break;
        case 'ArrowRight': case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump === true) velocity.y += JUMP_IMPULSE; canJump = false; break;
    }
};

const onKeyUp = function (event: KeyboardEvent) {
    switch (event.code) {
        case 'ArrowUp': case 'KeyW': moveForward = false; break;
        case 'ArrowLeft': case 'KeyA': moveLeft = false; break;
        case 'ArrowDown': case 'KeyS': moveBackward = false; break;
        case 'ArrowRight': case 'KeyD': moveRight = false; break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// --- Logic ---

function runVisualCheck() {
    const gl = renderer.getContext();
    const pixels = new Uint8Array(4 * gl.drawingBufferWidth * gl.drawingBufferHeight);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let coloredPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]; // check for not sky blue
        // rudimentary check
        if (Math.abs(r - 135) > 10) {
            coloredPixels++;
            if (coloredPixels > 100) break;
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

window.addEventListener('message', event => {
    const message = event.data;
    const statusEl = document.getElementById('status');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');

    if (message.type === 'PROGRESS') {
        if (progressContainer) progressContainer.style.display = 'block';
        if (statusEl) statusEl.textContent = message.payload.message;
        if (message.payload.totalFiles && progressBar) {
            const percent = (message.payload.currentFile / message.payload.totalFiles) * 100;
            progressBar.style.width = `${percent}%`;
        }
    }

    if (message.type === 'UPDATE_SCENE') {
        if (progressContainer) progressContainer.style.display = 'none';
        if (statusEl) statusEl.textContent = `World Loaded: ${message.payload.originFile}`;

        // Remove old blocks (keep static ground/clouds for now, simply remove children > index X if needed, but for now clear group)
        while (codeGroup.children.length > 0) {
            codeGroup.remove(codeGroup.children[0]);
        }
        objects.length = 0; // Clear collision array

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message.payload.blocks.forEach((block: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const type = (block as any).type || 'stone';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createBlock((block as any).position.x, (block as any).position.y, (block as any).position.z, type, codeGroup);
        });

        setTimeout(runVisualCheck, 500);
    }
});

// Report READY
vscode.postMessage({ type: 'READY' });

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    if (controls.isLocked === true) {
        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * DAMPING * delta;
        velocity.z -= velocity.z * DAMPING * delta;
        velocity.y -= GRAVITY * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * MOVEMENT_SPEED * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * MOVEMENT_SPEED * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        controls.getObject().position.y += (velocity.y * delta);

        // Ground collision (simple flat plane at y=0)
        if (controls.getObject().position.y < EYE_HEIGHT) {
            velocity.y = 0;
            controls.getObject().position.y = EYE_HEIGHT;
            canJump = true;
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
