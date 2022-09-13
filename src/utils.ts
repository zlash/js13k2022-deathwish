import { assert, clamp, fract, random, sin, sqrt } from "./aliasedFunctions";

export const indexSquareArray = <T>(width: number, x: number, y: number) => {
    assert(x >= 0 && x < width);
    assert(y >= 0);
    return y * width + x;
};

export const dataObjectClone = (obj: Object) => {
    return JSON.parse(JSON.stringify(obj));
};


export const forRange = (a: number, b: number, cb: (i: number, k: number) => void) => {
    for (let i = a; i < b; ++i) {
        cb(i, (i - a) / (b - a));
    }
};

export const forRangeN = (n: number, cb: (i: number, k: number) => void) => forRange(0, n, cb);

export const arrayRange = <T>(arr: Array<T>, cb: (el: T, i: number, k: number) => void) => {
    forRangeN(arr.length, (i, k) => cb(arr[i], i, k));
};

// you get k [0,1) for free
export const mapRange = <T>(a: number, b: number, cb: (i: number, k: number) => T): Array<T> => {
    const arr: Array<T> = [];
    forRange(a, b, (i, k) => arr.push(cb(i, k)));
    return arr;
};

export const mapN = <T>(n: number, cb: (i: number, k: number) => T): Array<T> => mapRange(0, n, cb);


export const mapRangeAsync = <T>(a: number, b: number, cb: (i: number, k: number) => Promise<T>) => {
    return Promise.all(mapRange(a, b, (i_, k_) => cb(i_, k_)));
};

export const mapNAsync = <T>(n: number, cb: (i: number, k: number) => Promise<T>) => mapRangeAsync(0, n, cb);


export const iterateGrid = (w: number, h: number, cb: (x: number, y: number) => void) => {
    for (let yy = 0; yy < h; ++yy) {
        for (let xx = 0; xx < w; ++xx) {
            cb(xx, yy);
        }
    }
};

export const genArrayFromGrid = <T>(w: number, h: number, cb: (x: number, y: number) => T): Array<T> => {
    const arr = mapRange(0, h, y => mapRange(0, w, x => cb(x, y)));
    return ([] as Array<T>).concat(...arr);
};

export const rgbaToCssString = (r: number, g: number, b: number, a: number) => {
    const nToHex = (n: number) => Math.floor(n * 0xFF).toString(16).padStart(2, "0");
    return "#" + nToHex(r) + nToHex(g) + nToHex(b) + nToHex(a);
};

export const mix = (a: number, b: number, k: number) => {
    return a + (b - a) * k;
};

// common GLSL hash
//  - Rey, On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1,
//    22nd European Meeting of Statisticians and the 7th Vilnius Conference on
//    Probability Theory and Mathematical Statistics, August 1998

export const hash = (x: number, y: number) => {
    return fract(43757.5453 * sin(x * 12.9898 + y * 78.233));
};

// Todo: Replace the rest of the maps with this 

export interface GenericMap<T> {
    w: number;
    h: number;
    data: Array<T>;
    get: (x: number, y: number) => T;
    set: (x: number, y: number, v: T) => void;
};

export const createGenericMap = <T>(w: number, h: number, defaultValue?: T): GenericMap<T> => {
    const map = {
        w,
        h,
        data: Array(w * h).fill(defaultValue) as Array<T>,
        get: (x: number, y: number) => map.data[indexSquareArray(w, x, y)],
        set: (x: number, y: number, v: T) => map.data[indexSquareArray(w, x, y)] = v,
    };

    return map;
};

export const promiseToNextFrame = (cb: () => void) => {
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            cb();
            resolve();
        });
    });
};

export const waitAFrame = () => {
    return promiseToNextFrame(() => { });
}


export const mod = (a: number, b: number) => {
    let r = a % b;
    return r < 0 ? (r + b) : r;
};

export const smoothstep = (a: number, b: number, k: number) => {
    const r = clamp((k - a) / (b - a), 0.0, 1.0);
    return r * r * (3.0 - 2.0 * r);
};

export const smoothstepMix = (a: number, b: number, k: number) => {
    const m = smoothstep(0, 1, k);
    return a * (1 - m) + b * m;
};


let curGoldenSampler = 0;
export const seedGoldenSampler = (x: number) => { curGoldenSampler = fract(x); };

const golden = (1 + sqrt(5)) / 2;

export const goldSample = () => {
    curGoldenSampler = fract(curGoldenSampler + golden);
    return curGoldenSampler;
};


export const zeroOneToMinPlus = (x: number) => x * 2 - 1;
export const minPlusToZeroOne = (x:number) => (x+1)/2;