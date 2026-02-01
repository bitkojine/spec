/**
 * @file input-manager.mts
 * @description Manages user input and camera controls.
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { PHYSICS } from './types.mjs';

export class InputManager {
    public controls: PointerLockControls;
    public moveForward = false;
    public moveBackward = false;
    public moveLeft = false;
    public moveRight = false;
    public canJump = false;
    public velocity = new THREE.Vector3();
    public direction = new THREE.Vector3();

    constructor(camera: THREE.Camera, domElement: HTMLElement) {
        this.controls = new PointerLockControls(camera, domElement);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        const onKeyDown = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': this.moveForward = true; break;
                case 'ArrowLeft': case 'KeyA': this.moveLeft = true; break;
                case 'ArrowDown': case 'KeyS': this.moveBackward = true; break;
                case 'ArrowRight': case 'KeyD': this.moveRight = true; break;
                case 'Space': if (this.canJump) this.velocity.y += PHYSICS.JUMP_IMPULSE; this.canJump = false; break;
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': this.moveForward = false; break;
                case 'ArrowLeft': case 'KeyA': this.moveLeft = false; break;
                case 'ArrowDown': case 'KeyS': this.moveBackward = false; break;
                case 'ArrowRight': case 'KeyD': this.moveRight = false; break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.addEventListener('click', () => this.controls.lock());
        }

        this.controls.addEventListener('lock', () => {
            const blocker = document.getElementById('blocker');
            if (blocker) blocker.style.display = 'none';
            if (instructions) instructions.style.display = 'none';
        });

        this.controls.addEventListener('unlock', () => {
            const blocker = document.getElementById('blocker');
            if (blocker) blocker.style.display = 'flex';
            if (instructions) instructions.style.display = '';
        });
    }

    public update(delta: number): void {
        if (!this.controls.isLocked) return;

        this.velocity.x -= this.velocity.x * PHYSICS.DAMPING * delta;
        this.velocity.z -= this.velocity.z * PHYSICS.DAMPING * delta;
        this.velocity.y -= PHYSICS.GRAVITY * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * PHYSICS.MOVEMENT_SPEED * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * PHYSICS.MOVEMENT_SPEED * delta;

        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);

        const obj = this.controls.getObject();
        obj.position.y += (this.velocity.y * delta);

        if (obj.position.y < PHYSICS.EYE_HEIGHT) {
            this.velocity.y = 0;
            obj.position.y = PHYSICS.EYE_HEIGHT;
            this.canJump = true;
        }
    }
}
