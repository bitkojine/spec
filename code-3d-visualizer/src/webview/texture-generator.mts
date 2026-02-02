/**
 * @file texture-generator.mts
 * @description Generates textures and materials for the 3D visualizer.
 */
import {
    MeshLambertMaterial,
    CanvasTexture,
    NearestFilter,
    SRGBColorSpace,
    MeshBasicMaterial,
    DoubleSide
} from 'three';

export class TextureGenerator {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 64;
        this.canvas.height = 64;
        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.imageSmoothingEnabled = false;
    }

    private createNoise(baseColor: string, variance: number): void {
        const { width, height } = this.canvas;
        const size = 8;
        this.ctx.fillStyle = baseColor;
        this.ctx.fillRect(0, 0, width, height);

        for (let x = 0; x < width; x += size) {
            for (let y = 0; y < height; y += size) {
                const alpha = Math.random() * variance;
                this.ctx.fillStyle = Math.random() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
                this.ctx.fillRect(x, y, size, size);
            }
        }
    }

    public getGrassMaterial(): MeshLambertMaterial[] {
        this.createNoise('#32CD32', 0.1);
        this.ctx.fillStyle = '#228B22';
        for (let i = 0; i < 20; i++) {
            this.ctx.fillRect(Math.floor(Math.random() * 8) * 8, Math.floor(Math.random() * 8) * 8, 4, 4);
        }

        const top = new CanvasTexture(this.canvas);
        top.magFilter = NearestFilter;
        top.colorSpace = SRGBColorSpace;
        const topMat = new MeshLambertMaterial({ map: top });

        this.createNoise('#8B4513', 0.15);
        this.ctx.fillStyle = '#32CD32';
        this.ctx.fillRect(0, 0, 64, 16);
        for (let x = 0; x < 64; x += 8) {
            if (Math.random() > 0.5) this.ctx.fillRect(x, 16, 8, 8);
        }

        const side = new CanvasTexture(this.canvas);
        side.magFilter = NearestFilter;
        side.colorSpace = SRGBColorSpace;
        const sideMat = new MeshLambertMaterial({ map: side });

        const dirtMat = this.createSimpleMaterial('#8B4513', 0.15);
        return [sideMat, sideMat, topMat, dirtMat, sideMat, sideMat];
    }

    public getCloudTexture(): MeshBasicMaterial {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d')!;
        ctx.clearRect(0, 0, 128, 128);

        for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.2 + 0.1})`;
            ctx.beginPath();
            ctx.arc(Math.random() * 128, Math.random() * 128, Math.random() * 20 + 20, 0, Math.PI * 2);
            ctx.fill();
        }

        const tex = new CanvasTexture(c);
        tex.magFilter = NearestFilter;
        tex.colorSpace = SRGBColorSpace;
        return new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, side: DoubleSide });
    }

    public createSimpleMaterial(color: string, variance: number, border?: string): MeshLambertMaterial {
        const c = document.createElement('canvas');
        c.width = 64; c.height = 64;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 64, 64);

        for (let x = 0; x < 64; x += 8) {
            for (let y = 0; y < 64; y += 8) {
                ctx.fillStyle = Math.random() > 0.5 ? `rgba(0,0,0,${Math.random() * variance})` : `rgba(255,255,255,${Math.random() * variance})`;
                ctx.fillRect(x, y, 8, 8);
            }
        }

        if (border) {
            ctx.strokeStyle = border;
            ctx.lineWidth = 10; // Changed from 8 to 10 for better visibility as a tiny optimization/fix
            ctx.strokeRect(0, 0, 64, 64);
            ctx.fillStyle = border;
            ctx.fillRect(24, 24, 16, 16);
        }

        const tex = new CanvasTexture(c);
        tex.magFilter = NearestFilter;
        tex.colorSpace = SRGBColorSpace;
        return new MeshLambertMaterial({ map: tex });
    }
}

const texGen = new TextureGenerator();
export const MATERIALS = {
    grass: texGen.getGrassMaterial(),
    dirt: texGen.createSimpleMaterial('#8B4513', 0.1),
    stone: texGen.createSimpleMaterial('#808080', 0.1),
    wood: texGen.createSimpleMaterial('#A0522D', 0.1),
    leaf: texGen.createSimpleMaterial('#228B22', 0.2),
    cloudSheet: texGen.getCloudTexture(),
    class: texGen.createSimpleMaterial('#FFD700', 0.2, '#B8860B'),
    function: texGen.createSimpleMaterial('#00CED1', 0.2, '#008B8B')
};
