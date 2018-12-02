export function randomNumber([min, max]: number[]): number {
    return Math.random() * (max - min) + min;
}

export interface RGBRange { rangeR?: number[], rangeG?: number[], rangeB?: number[] }

export class RGB {
    constructor(public r: number, public g: number, public b: number, public a?: number) {
    }

    public get xyz() {
        return RGBtoXYZ(this);
    }

    public get xy() {
        return this.xyz.xy;
    }

    public static random({ rangeR, rangeG, rangeB }: RGBRange = {}) {
        rangeR = rangeR || [0, 256];
        rangeG = rangeG || [0, 256];
        rangeB = rangeB || [0, 256];
        return new RGB(randomNumber(rangeR), randomNumber(rangeG), randomNumber(rangeB));
    }
}

function pivotRgb(n: number) {
    return (n > 0.04045 ? Math.pow((n + 0.055) / 1.055, 2.4) : n / 12.92) * 100.0;
}

export function RGBtoXYZ(color: RGB) {
    let r = pivotRgb(color.r / 255.0);
    let g = pivotRgb(color.g / 255.0);
    let b = pivotRgb(color.b / 255.0);

    // Observer. = 2°, Illuminant = D65
    let x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    let z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    return new XYZ(x, y, z);
}

export class XYZ {
    constructor(public x: number, public y: number, public z: number) {
    }

    public get xy(): [number, number] {
        const { x, y, z } = this;
        const sum = x + y + z;
        return [x / sum, y / sum];
    }
}
