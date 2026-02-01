/**
 * @file scene-manager.mts
 * @description Manages the 3D scene, lighting, and object creation.
 */
import * as THREE from 'three';
import { MATERIALS } from './texture-generator.mjs';
import { PHYSICS } from './types.mjs';

export class SceneManager {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public worldGroup: THREE.Group;
    public codeGroup: THREE.Group;

    constructor(canvas: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = PHYSICS.EYE_HEIGHT;

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        this.worldGroup = new THREE.Group();
        this.codeGroup = new THREE.Group();
        this.scene.add(this.worldGroup);
        this.scene.add(this.codeGroup);

        this.setupLights();
    }

    private setupLights(): void {
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(-30, 52.5, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        this.scene.add(dirLight);
    }

    public createBlock(x: number, y: number, z: number, type: string, group: THREE.Group): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        let material: THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[];

        if (type === 'class_block') material = MATERIALS.class;
        else if (type === 'function_block') material = MATERIALS.function;
        else if (type === 'grass') material = MATERIALS.grass;
        else material = MATERIALS.stone;

        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        group.add(cube);
        return cube;
    }
}
