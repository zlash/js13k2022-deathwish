import { spritesFrag } from "~shaders/bundle";
import { mapN, mapNAsync } from "../utils";
import { SdfBuilder } from "./sdfBuilder";
import { renderSdf, SdfRender } from "./sdfRenderer";


// Hacer que la duracion sea framerate independent
export interface SdfSprite {
    durationSeconds: number;
    id: number;
    frames: SdfRender[][]; // For frames[direction][nFrames].
    // Please use the same ammount of frames in each direction
}

export const sdfSprites: SdfSprite[] = [];

export const generateSprite = async (id: number, durationSeconds: number, rotations: number, frames: number, cb: (angle: number, frameK: number, fn: number) => SdfBuilder) => {
    const spr = {
        id,
        durationSeconds,
        frames: await mapNAsync(rotations, async (_, angleK) => {
            return await mapNAsync(frames, async (frameN, frameK) => {
                return await renderSdf(cb(angleK * 360, frameK, frameN));
            });
        }),
    } as SdfSprite;
    sdfSprites[id] = spr;
    return spr;
};
