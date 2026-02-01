# Minecraft-like 3D World Rendering

**Status:** Draft
**Version:** 1.0.0
**Effective Date:** 2026-02-01

## 1. Intent

This specification defines the requirements for rendering the codebase as a persistent, traversable 3D voxel world, inspired by Minecraft. The goal is to provide an immersive and spatial way to visualize code structure, where code entities (files, classes, functions) are represented as blocks or structures within a generated terrain.

## 2. Visual Style

### 2.1. Voxel-Based Geometry
- **Everything is a Block:** All rendered objects MUST be cubes or composed of cubes.
- **Unit Scale:** The fundamental unit of measurement is a 1x1x1 block.
- **Grid Alignment:** All blocks MUST be aligned to a global integer grid (x, y, z).
- **No Curves:** Spheres, cylinders, and other curved geometries are PROHIBITED.

### 2.2. Environment
- **Sky:** The background MUST be a dynamic sky (e.g., Sky Blue `#87CEEB`) with a visible Sun.
- **Clouds:** White, blocky clouds MUST be rendered floating above the world.
- **Ground Plane:** A generated "Grass" plane (Green blocks) MUST extend beneath the code structures.
- **Lighting:** Directional sunlight enabling shadows, plus ambient light.

## 3. Interaction

### 3.1. Camera Control
- **Perspective:** First-Person View (Eye level).
- **Controls:**
    - **Movement:** WASD keys to move forward, left, backward, right.
    - **Look:** Mouse movement to look around (Pointer Lock).
    - **Jump:** Spacebar to jump.
    - **Toggle:** detailed controls instructions should be visible on screen.

## 4. Data Contract

### 4.1. Block Definition
The extension MUST communicate scene updates as a collection of blocks.

```typescript
interface Block {
    id: string;
    position: { x: number; y: number; z: number };
    type: BlockType; // e.g., 'grass', 'dirt', 'stone', 'code_file', 'class_block'
    color?: string; // Hex color for simple blocks
    texture?: string; // Texture URI for textured blocks (future)
    metadata?: Record<string, unknown>; // Associated code metadata
}
```

### 4.2. Scene Updates
- The webview MUST accept `UPDATE_SCENE` messages containing exclusively block data.
- The renderer MUST clear previous blocks and re-render the new state upon receiving an update.

## 5. Implementation Details

- **Technology:** Three.js (via existing webview dependency).
- **Performance:**
    - For small scenes (< 5000 blocks), individual `THREE.Mesh` objects are acceptable.
    - For large scenes, `THREE.InstancedMesh` SHOULD be used to reduce draw calls.

## 6. Non-Goals

- **Physics:** No collision detection or gravity is required for the initial implementation.
- **Editing:** The user cannot place or break blocks (read-only visualization).
- **Infinite Terrain:** The world is bounded by the visualized codebase size.
