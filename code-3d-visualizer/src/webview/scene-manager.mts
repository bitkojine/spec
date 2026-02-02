/**
 * @file scene-manager.mts
 * @description Manages the 3D scene, lighting, and object creation.
 */
import {
    Scene,
    Color,
    PerspectiveCamera,
    WebGLRenderer,
    Group,
    HemisphereLight,
    DirectionalLight,
    BoxGeometry,
    MeshLambertMaterial,
    Mesh,
    PlaneGeometry,
    RepeatWrapping
} from 'three';
import { MATERIALS } from './texture-generator.mjs';
import { PHYSICS } from './types.mjs';

export class SceneManager {
    public scene: Scene;
    public camera: PerspectiveCamera;
    public renderer: WebGLRenderer;
    public worldGroup: Group;
    public codeGroup: Group;

    constructor(canvas: HTMLCanvasElement) {
        this.scene = new Scene();
        this.scene.background = new Color(0x87CEEB);

        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = PHYSICS.EYE_HEIGHT;

        this.renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        this.worldGroup = new Group();
        this.codeGroup = new Group();
        this.scene.add(this.worldGroup);
        this.scene.add(this.codeGroup);

        this.setupLights();
    }

    private setupLights(): void {
        const hemiLight = new HemisphereLight(0xffffff, 0xffffff, 0.6);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        const dirLight = new DirectionalLight(0xffffff, 1);
        dirLight.position.set(-30, 52.5, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        this.scene.add(dirLight);
    }

    public createBlock(x: number, y: number, z: number, type: string, group: Group): Mesh {
        const geometry = new BoxGeometry(1, 1, 1);
        let material: MeshLambertMaterial | MeshLambertMaterial[];

        if (type === 'class_block') material = MATERIALS.class;
        else if (type === 'function_block') material = MATERIALS.function;
        else if (type === 'grass') material = MATERIALS.grass;
        else material = MATERIALS.stone;

        const cube = new Mesh(geometry, material);
        cube.position.set(x, y, z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        group.add(cube);
        return cube;
    }

    public createGroundPlane(size: number): void {
        const geometry = new PlaneGeometry(size, size);
        const baseMaterial = MATERIALS.grass[2]; // Use the top texture only

        // Clone material and texture to modify repeat wrapping without affecting other blocks
        const material = baseMaterial.clone();
        if (material.map) {
            material.map = material.map.clone();
            material.map.wrapS = RepeatWrapping;
            material.map.wrapT = RepeatWrapping;
            material.map.repeat.set(size, size);
            material.map.needsUpdate = true;
        }

        const plane = new Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.501; // Slightly lower than -0.5 to avoid z-fighting if blocks are placed exactly
        plane.receiveShadow = true;
        this.worldGroup.add(plane);
    }
}
