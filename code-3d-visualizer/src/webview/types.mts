/**
 * @file types.mts
 * @description Type definitions for the 3D visualizer webview.
 */
import { WebviewToExtensionMessage } from '../common/contract.cjs';

export interface VSCodeApi {
    postMessage(message: WebviewToExtensionMessage): void;
}

export interface PhysicsConstants {
    MOVEMENT_SPEED: number;
    DAMPING: number;
    GRAVITY: number;
    JUMP_IMPULSE: number;
    EYE_HEIGHT: number;
}

export const PHYSICS: PhysicsConstants = {
    MOVEMENT_SPEED: 50.0,
    DAMPING: 10.0,
    GRAVITY: 30.0,
    JUMP_IMPULSE: 12.0,
    EYE_HEIGHT: 1.6
};
