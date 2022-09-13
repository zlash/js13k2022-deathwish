import { initWebgl } from "./webgl";
import { beginFrame, createCanvases, debugDiv, endFrame, initRenderer, MaxSprites, overlayCtx, setOverlayCtxTextParameters, sortedSpritesArray } from "./renderer";
import { keyHandler, inputUpdate, wasInputPressed } from "./input";

import { assert, floor, min } from "./aliasedFunctions";

import { gameInit, gameRender, gameUpdate } from "./game";
import { DEBUG } from "~autogenerated";
import { sdfsTexture } from "~sdf/sdfRenderer";
import { viewResolution } from "~constants";

import * as Input from "./input";

export const ModeGame = 0;
export const ModeGameOver = 1;
export const ModeTitle = 2;

const ModeInvalid = -1;

type Mode = number;

let lastTimestamp = -1;
let ts = 0;
let curMode: Mode = ModeInvalid;

// setMode(ModeGame, levelIdx)
export const setMode = (mode: Mode, ...params: any) => {
    switch (mode) {
        case ModeGame:
            gameInit(params[0]);
            break;
    }
    curMode = mode;
}

const init = () => {
    //setMode(ModeGame, 10);
    setMode(ModeTitle, 0);
};

const gameOverRender = () => {
    overlayCtx.clearRect(0, 0, viewResolution[0], viewResolution[1]);
    overlayCtx.fillStyle = "white";
    setOverlayCtxTextParameters(80, "Arial, sans-serif", true);
    overlayCtx.fillText(`FIN`, viewResolution[0] - 100, viewResolution[1] - 120);
    setOverlayCtxTextParameters(24, "Arial, sans-serif", false);
    overlayCtx.fillText(`Thank you for playing!`, viewResolution[0] - 160, viewResolution[1] - 80);

};

const titleUpdate = () => {
    if (wasInputPressed(Input.InputUiOk)) {
        setMode(ModeGame, 0);
    }
};

const titleRender = () => {
    overlayCtx.clearRect(0, 0, viewResolution[0], viewResolution[1]);
    overlayCtx.fillStyle = "white";
    setOverlayCtxTextParameters(80, "Arial, sans-serif", true);
    overlayCtx.fillText(`DEATHWISH`, 300, 100);
    setOverlayCtxTextParameters(20, "Arial, sans-serif", false);
    overlayCtx.fillText(`Made for js13kGames 2022.`, 180, 150);
    overlayCtx.fillText(`[ PRESS ENTER TO BEGIN ]`, 400, 300);
    overlayCtx.fillText(`Miguel Ángel Pérez Martínez // @zurashu`, viewResolution[0] - 250, viewResolution[1] - 80);
};


let bafAverage: number[];
let fAverage: number[];

const mainLoop = (timestamp: number) => {
    if (lastTimestamp < 0) {
        lastTimestamp = timestamp - 1000 / 60;
    }

    let debugTimestamp = 0;
    if (DEBUG) {
        debugTimestamp = performance.now();
    }

    inputUpdate();

    let dts = (timestamp - lastTimestamp) / 1000;
    // Don't blow up!
    //dts = min(dts, 1 / 3);

    lastTimestamp = timestamp;
    ts += dts;

    switch (curMode) {
        case ModeGame:
            gameUpdate(dts);
            break;
        case ModeTitle:
            titleUpdate();
            break;
    }

    beginFrame();
    switch (curMode) {
        case ModeGame:
            gameRender();
            break;
        case ModeGameOver:
            gameOverRender();
            break;
        case ModeTitle:
            titleRender();
            break;
    }
    endFrame();

    if (DEBUG) {
        if (!bafAverage) bafAverage = [];
        bafAverage.push(dts * 1000);
        if (bafAverage.length >= 120) {
            bafAverage[0] = bafAverage[bafAverage.length - 1];
            bafAverage.pop();
        }
        const bafAvg = bafAverage.reduce((acc, cur) => acc + cur / bafAverage.length, 0);

        if (!fAverage) fAverage = [];
        fAverage.push(performance.now() - debugTimestamp);
        if (fAverage.length >= 120) {
            fAverage[0] = fAverage[fAverage.length - 1];
            fAverage.pop();
        }
        const fAvg = fAverage.reduce((acc, cur) => acc + cur / fAverage.length, 0);

        debugDiv.innerHTML = `Browser frame avg: ${bafAvg.toFixed(4)} ms 🌊🌊 Own frame avg: ${fAvg.toFixed(4)} ms 🔥🔥 Actual running time: ${(ts).toFixed(4)} s 🏠🏠 Particles ${sortedSpritesArray.length} / ${MaxSprites} 🌊🌊 Tex: ${sdfsTexture.curLayer} / ${sdfsTexture.numLayers}`;
    }

    window.requestAnimationFrame(mainLoop);
};


window.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
        keyHandler(event, true);
    }, true);

    window.addEventListener('keyup', (event: KeyboardEvent) => {
        keyHandler(event, false);
    }, true);

    createCanvases();

    initRenderer().then(() => {
        init();
        window.requestAnimationFrame(mainLoop);
    });
});