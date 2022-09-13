import { min } from "./aliasedFunctions";
import { Vec2, vec2, vecMulK, vecAdd, vec2Splay, vecSet } from "./juvec";


export const rectRectCollision = (tlA: Vec2, sizeA: Vec2, tlB: Vec2, sizeB: Vec2, vOut?: Vec2) => {
    const x0 = tlA[0] + sizeA[0] - tlB[0];
    const x1 = tlB[0] + sizeB[0] - tlA[0];
    const y0 = tlA[1] + sizeA[1] - tlB[1];
    const y1 = tlB[1] + sizeB[1] - tlA[1];

    const hit = min(x0, x1, y0, y1) > 0;
    if (hit && vOut) {
        const xMin = min(x0, x1);
        const yMin = min(y0, y1);
        if (xMin < yMin) {
            vOut[0] = xMin == x0 ? x0 : -x1;
            vOut[1] = 0;
        } else {
            vOut[0] = 0;
            vOut[1] = yMin == y0 ? y0 : -y1;
        }
    }
    return hit;
}

// Todo: This needs to be fixed asap
export const rectCircleCollision = (tlA: Vec2, sizeA: Vec2, center: Vec2, r: number, vOut?: Vec2) => {
    return rectRectCollision(tlA, sizeA, vec2(center[0] - r, center[1] - r), vec2Splay(r * 2), vOut);
}