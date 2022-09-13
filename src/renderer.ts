import { gl, createProgram, setFramebuffer, WebGLShaderBundle, getUniformLocation, createTextureArray, TextureArray, initWebgl } from "./webgl";
import { spritesVert, spritesFrag } from "./shaders/bundle";
import { viewResolution } from "./constants";

import * as glEnum from "./webglEnums";

import * as Sdf from "./sdf/sdfRenderer";
import { Mat4, mat4Vec4Mul, quatFromDirection, quatRotateVector, Vec2, vec2, vec2Copy, vec2Splay, vec3, Vec3, vec3Splay, vec4, Vec4, vec4Splay, vecAdd, vecClamp, vecLength, vecMix, vecMulK, vecNormalizeSafe, vecSet, vecSub, zeroVector } from "./juvec";
import { DEBUG } from "./autogenerated";
import { floor, min, Deg, sin, cos, assert, fract, TwoPi, PiHalf, clamp, Pi } from "./aliasedFunctions";
import { mod, promiseToNextFrame, waitAFrame } from "./utils";
import { SdfOrthoViewScale } from "./sdf/sdfConstants";
import { sdfsTexture } from "./sdf/sdfRenderer";
import { sdfSprites } from "~sdf/sdfSprite";
import { BlackCss, BlackFloat } from "~palette";
import { createSvgTextures } from "~svgTextures";

let spritesProgram: WebGLShaderBundle;
let spritesBuffer: WebGLBuffer;
let spritesArrayBuffer: Float32Array;
let spritesVao: WebGLVertexArrayObject;

export let debugDiv: HTMLDivElement;

export const MaxSprites = 8000;

interface SortedSprite {
    x: number;
    y: number;
    z: number;
    w: number;
    h: number;
    color: Vec4;
    layer: number;
};

export let sortedSpritesArray: SortedSprite[];

const spriteVertexSizeInFloats = 10;

export let overlayCtx: CanvasRenderingContext2D;
/*
export const centerElement = (style: CSSStyleDeclaration, top?: string) => {
    style.transform = `translate(-50%,-50%)`;
    style.position = "absolute";
    style.top = top ? top : "50%";
    style.left = "50%";
};
*/
const createViewCanvas = () => {
    // Todo: make this work
    const upscale = 1;

    const canvas = document.createElement("canvas");
    canvas.width = viewResolution[0] * upscale;
    canvas.height = viewResolution[1] * upscale;

    /* const canvasStyle = canvas.style;
     canvasStyle.top = "50%";
     canvasStyle.left = "50%";
     canvasStyle.position = "absolute";
 
     const scaleX = 0.9 * window.innerWidth / canvas.width;
     const scaleY = 0.9 * window.innerHeight / canvas.height;
 
     canvasStyle.transform = `translate(-50%,-50%) scale(${min(scaleX, scaleY)}) `;
 */
    return canvas;
};

export interface WorldCamera {
    pos: Vec3,
    zoom: number,
    screenOffset: Vec2,
    worldCenter: Vec3,
    viewProjection: Float32Array,
    boundsTL: Vec2;
    boundsBR: Vec2;
    shakeA: number;
    locked: boolean;
};

export let camera: WorldCamera;

export const setCameraWorldCenter = (pos: Vec3) => {
    vecMix(camera.worldCenter, pos, 0.25, camera.worldCenter);
    vecSet(camera.screenOffset, zeroVector);
    camera.screenOffset = cameraToScreen(camera.worldCenter);

    // TODO: Change with proper vector stuff
    camera.screenOffset[0] -= viewResolution[0] / 2;
    camera.screenOffset[1] -= viewResolution[1] / 2;

    // Clamp to bounds 
    if (camera.locked) {
        vecClamp(camera.screenOffset, camera.boundsTL, camera.boundsBR, camera.screenOffset);
    }
};

export const updateCameraBounds = (w: number, h: number) => {
    const mapTL = worldToScreen(vec3(0, 2, 0));
    const mapBL = worldToScreen(vec3(-0.25, -2, h + 0.25));
    const mapTR = worldToScreen(vec3(w + 0.25, 2, -0.25));
    const mapBR = worldToScreen(vec3(w, -2, h));
    camera.boundsTL = vec2(mapBL[0], mapTL[1]);
    camera.boundsBR = vec2(mapTR[0] - viewResolution[0], mapBR[1] - viewResolution[1]);
};

let cameraStack: Float32Array[] = [];
export const pushCameraAngle = (cameraPitch: number, cameraYaw: number) => {
    cameraStack.unshift(camera.viewProjection);

    const sP = sin(cameraPitch);
    const cP = cos(cameraPitch);
    const sY = sin(cameraYaw);
    const cY = cos(cameraYaw);
    const z = -10;

    const mat = new Float32Array([
        cY, sP * sY, -cP * sY, 0,
        0, cP, sP, 0,
        sY, -sP * cY, cP * cY, 0,
        0, 0, z, 1,
    ]);

    camera.viewProjection = mat;
}

export const popCameraAngle = () => {
    assert(cameraStack.length > 0);
    camera.viewProjection = cameraStack.shift() as Float32Array;
}

export const createCamera = () => {
    const cameraPitch = 45 * Deg;
    const cameraYaw = -45 * Deg;

    camera = {
        pos: vec3Splay(0),
        worldCenter: vec3Splay(0),
        screenOffset: vec2Splay(0),
        zoom: 70,
        boundsTL: vec2Splay(0),
        boundsBR: vec2Splay(0),
        shakeA: 0,
        locked: true,
    } as WorldCamera;

    pushCameraAngle(cameraPitch, cameraYaw);
};

export const worldToScreen = (pos: Vec3) => {
    const screenScale = camera.zoom;
    const proj = mat4Vec4Mul(camera.viewProjection as any, vec4(pos[0], pos[1], pos[2], 1), vec4Splay(0));
    return vec3(proj[0] * screenScale, -proj[1] * screenScale, proj[2]);
};


export const cameraToScreen = (pos: Vec3) => {
    const proj = worldToScreen(pos);
    return vec3(proj[0] - camera.screenOffset[0], proj[1] - camera.screenOffset[1], proj[2]);
};

const spriteColors: Vec4[] = [vec4(1, 1, 1, 1)];

export const pushColor = (c: Vec4) => {
    spriteColors.unshift(c);
};

export const popColor = () => spriteColors.shift();

export const renderQuad = (x: number, y: number, z: number, w: number, h: number, layer: number) => {
    const cc = vec4(1, 0, 0, 1);
    sortedSpritesArray.push({
        x: x + 40 * camera.shakeA * sin(60 * camera.shakeA), y, z, w, h, layer, color: [...spriteColors[0]],
    })
};

export const renderSprite = (x: number, y: number, z: number, w: number, h: number, n: number) => {
    renderQuad(x - w / 2, y - h / 2, z, w, h, n);
};

export const renderTextureSprite = (x: number, y: number, z: number, n: number, extraScale?: number) => {
    const pos3 = vec3(x, y, z);
    const pos = cameraToScreen(pos3);
    const scale = camera.zoom * SdfOrthoViewScale * 2 * (extraScale || 1);

    renderSprite(pos[0], pos[1], pos[2], scale, scale, n);
};

export const render2dSdfSpriteFrame = (id: number, x: number, y: number, z: number, scale: number, frameNum: number, rotationId: number, scaleY?: number) => {
    const spr = sdfSprites[id];
    const frames = spr.frames[rotationId];
    const tex = frames[frameNum].texture;
    renderSprite(x, y, z, scale, scaleY || scale, tex);
};

export const render2dSdfSprite = (id: number, x: number, y: number, z: number, scale: number, ts: number, angleRad: number, scaleY?: number) => {
    const spr = sdfSprites[id];

    const rotationId = floor(fract(fract((-angleRad + PiHalf) / TwoPi)) * spr.frames.length);

    const frames = spr.frames[rotationId];

    const frameFromTime = spr.durationSeconds ? floor(frames.length * ts / spr.durationSeconds) : 0;
    const frameNum = mod(frameFromTime, frames.length);

    render2dSdfSpriteFrame(id, x, y, z, scale, frameNum, rotationId, scaleY);
};


const renderSdfScale: number[] = [1];

export const pushRenderSdfScale = (s: number) => {
    renderSdfScale.unshift(s);
};

export const popRenderSdfScale = () => {
    renderSdfScale.shift();
};

export const renderSdfSpriteFrame = (id: number, x: number, y: number, z: number, frameNum: number, rotationId: number) => {

    const pos3 = vec3(x, y, z);
    const pos = cameraToScreen(pos3);
    const scale = renderSdfScale[0] * camera.zoom * SdfOrthoViewScale * 2;

    render2dSdfSpriteFrame(id, pos[0], pos[1], pos[2], scale, frameNum, rotationId);
};

export const renderSdfSprite = (id: number, x: number, y: number, z: number, ts: number, angleRad: number) => {

    const pos3 = vec3(x, y, z);
    const pos = cameraToScreen(pos3);
    const scale = renderSdfScale[0] * camera.zoom * SdfOrthoViewScale * 2;

    render2dSdfSprite(id, pos[0], pos[1], pos[2], scale, ts, angleRad);
};


export const beginFrame = () => {
    // This feels terrible
    sortedSpritesArray = [];
    setFramebuffer(null, viewResolution[0], viewResolution[1]);

    gl.clearColor(BlackFloat[0], BlackFloat[1], BlackFloat[2], 1);
    gl.clear(glEnum.COLOR_BUFFER_BIT | glEnum.DEPTH_BUFFER_BIT);

    overlayCtx.clearRect(0, 0, viewResolution[0], viewResolution[1]);
};

export const endFrame = () => {
    const nSprites = sortedSpritesArray.length;
    assert(nSprites < MaxSprites, "Max sprites exceeded!!!");
    if (nSprites == 0) return;

    // Sort, fill buffer and dispatch
    sortedSpritesArray.sort((a, b) => a.z - b.z);

    for (let i = 0; i < nSprites; ++i) {
        const spr = sortedSpritesArray[i];
        const { x, y, z, w, h, layer, color } = spr;
        spritesArrayBuffer.set([
            x, y, z, 0, 0, layer, ...color,
            x, y + h, z, 0, 1, layer, ...color,
            x + w, y, z, 1, 0, layer, ...color,
            x + w, y, z, 1, 0, layer, ...color,
            x, y + h, z, 0, 1, layer, ...color,
            x + w, y + h, z, 1, 1, layer, ...color,
        ], i * 6 * spriteVertexSizeInFloats);
    }

    gl.useProgram(spritesProgram.program);

    //gl.enable(glEnum.DEPTH_TEST);
    gl.enable(glEnum.BLEND);

    gl.blendFunc(glEnum.ONE, glEnum.ONE_MINUS_SRC_ALPHA);
    //gl.blendFunc(glEnum.SRC_ALPHA, glEnum.ONE_MINUS_SRC_ALPHA);

    gl.activeTexture(glEnum.TEXTURE0);
    gl.bindTexture(glEnum.TEXTURE_2D_ARRAY, sdfsTexture.tex);

    gl.bindBuffer(glEnum.ARRAY_BUFFER, spritesBuffer);
    gl.bufferSubData(glEnum.ARRAY_BUFFER, 0, spritesArrayBuffer);
    gl.bindVertexArray(spritesVao);
    gl.drawArrays(glEnum.TRIANGLES, 0, 6 * nSprites);
};

const LoadingInit = 0.03;
const LoadingBase = 0.07 + LoadingInit;
const LoadingShaders = 0.14 + LoadingBase;
export const LoadingSdf = 1.0 - LoadingShaders;


export const setOverlayCtxTextParameters = (size: number, font?: string | null, bold?: boolean) => {
    overlayCtx.textAlign = "center";
    overlayCtx.textBaseline = "middle";
    overlayCtx.font = `${bold ? "bold" : ""} ${size}px ${font ? font : "monospace"}`;
};

export const drawLoadingScreen = (n: number) => {
    overlayCtx.fillStyle = BlackCss;
    overlayCtx.fillRect(0, 0, viewResolution[0], viewResolution[1]);
    setOverlayCtxTextParameters(42);
    overlayCtx.fillStyle = "white";
    overlayCtx.fillText(`Loading ${floor(n * 99)}%`, viewResolution[0] / 2, viewResolution[1] / 2);
};

let glCanvas: HTMLCanvasElement;

export const createCanvases = () => {
    const body = document.body;
    glCanvas = createViewCanvas();
    body.appendChild(glCanvas);

    const overlayCanvas = createViewCanvas();
    overlayCtx = overlayCanvas.getContext('2d') as CanvasRenderingContext2D;
    body.appendChild(overlayCanvas);
}

export const initRenderer = async () => {
    const body = document.body;
    body.style.backgroundColor = BlackCss;

    initWebgl(glCanvas);


    drawLoadingScreen(LoadingInit);
    await waitAFrame();

    spritesProgram = createProgram(spritesVert, spritesFrag);

    createCamera();

    getUniformLocation(spritesProgram, "tex");
    gl.useProgram(spritesProgram.program);
    gl.uniform1i(spritesProgram.uniforms["tex"], 0);

    spritesBuffer = gl.createBuffer() as WebGLBuffer;

    gl.bindBuffer(glEnum.ARRAY_BUFFER, spritesBuffer);

    spritesArrayBuffer = new Float32Array(spriteVertexSizeInFloats * 6 * MaxSprites);

    gl.bufferData(glEnum.ARRAY_BUFFER, spritesArrayBuffer, glEnum.DYNAMIC_DRAW);

    const posAttrib = 0;
    const uvAttrib = 1;
    const cAttrib = 2;

    spritesVao = gl.createVertexArray() as WebGLVertexArrayObject;
    gl.bindVertexArray(spritesVao);
    gl.vertexAttribPointer(posAttrib, 3, glEnum.FLOAT, false, spriteVertexSizeInFloats * 4, 0);
    gl.vertexAttribPointer(uvAttrib, 3, glEnum.FLOAT, false, spriteVertexSizeInFloats * 4, 3 * 4);
    gl.vertexAttribPointer(cAttrib, 4, glEnum.FLOAT, false, spriteVertexSizeInFloats * 4, 6 * 4);

    gl.enableVertexAttribArray(posAttrib);
    gl.enableVertexAttribArray(uvAttrib);
    gl.enableVertexAttribArray(cAttrib);

    if (DEBUG) {
        debugDiv = document.createElement("div");

        const style = debugDiv.style;
        style.top = "0";
        style.left = "0";
        style.position = "absolute";
        style.backgroundColor = "black";
        style.color = "white";

        debugDiv.innerHTML = "Debug data here";

        document.body.appendChild(debugDiv);
    }

    if (DEBUG) {
        // Do stuff with the texture imgs

        var style = document.createElement('style');
        style.appendChild(document.createTextNode(`
            img {
                display: none;
            }
            svg {
                display: none;
            }
        `));
        document.getElementsByTagName('head')[0].appendChild(style);
    }


    drawLoadingScreen(LoadingBase);
    await waitAFrame();


    Sdf.init();

    drawLoadingScreen(LoadingShaders);

    //await createSvgTextures();
    await Sdf.createSdfData();

    gl.generateMipmap(glEnum.TEXTURE_2D_ARRAY);
}