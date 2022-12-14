import { renderQuad, renderSprite, WorldCamera, cameraToScreen, createCamera, overlayCtx, setCameraWorldCenter, setOverlayCtxTextParameters, camera, renderTextureSprite, render2dSdfSprite, renderSdfSprite, renderSdfSpriteFrame, updateCameraBounds, pushColor, popColor } from "./renderer";
import { setMode, ModeGame, ModeGameOver } from "./index";
import { viewResolution } from "./constants";
import { Vec2, vec2, vecMulK, vecAdd, vec2Splay, vecSet, vec2Copy, vec3, vecFloor } from "./juvec";
import { TwoPi, assert, min, max, floor, sin, abs } from "./aliasedFunctions";
import { rectCircleCollision } from "./geom";
import { arrayRange, createGenericMap, forRangeN, GenericMap, goldSample, indexSquareArray, iterateGrid, mix, mod, rgbaToCssString, seedGoldenSampler, smoothstep } from "./utils";
import { Level, getLevel, isLastLevel } from "./level";

import { isInputDown, wasAnyKeyPressed, wasInputPressed } from "./input";
import * as Input from "./input";

import * as MapTiles from "./mapTileConstants";
import * as SdfIdsDumb from "./sdf/sdfIds";

import { GameObject, GameObjectTypePlayer, MsgTogglePillars } from "./gameObject";
import { Player, createPlayer, PlayerPowerCrosessWalls, PlayerPowerHomeOwner, PlayerPowerImmortal, PlayerPowerSwims, PlayerPowerLiquid, killPlayer, DeathReasonNone, setPower, inflictPlayerWith, InflictionSpikes } from "./objects/player";
import { DEBUG } from "./autogenerated";
import { doCollisions, getFixturePos, objectsAtShape, ShapeCircle, ShapeRect } from "./collisions";
import { createKey } from "./objects/key";
import { createDoor } from "./objects/goalDoor";
import { createToggle, ToggleTypeAB, ToggleTypeWheel } from "./objects/toggle";
import * as Wish from "./wishes";
import { createFire } from "./objects/fire";
import { createTree } from "./objects/tree";
import { createWheel } from "./objects/wheel";
import { levels } from "~levelDefinitions";
import { SdfOrthoViewScale } from "~sdf/sdfConstants";

import * as AssetIds from "./sdf/sdfAssetsIds";
import * as Palette from "./palette";
import { renderSdf } from "~sdf/sdfRenderer";
import { createPillar } from "~objects/pillar";
import { createSkull } from "~objects/skull";

export const DeathFadeDuration = 0.5;

export interface Map {
    sz: Vec2;
    tilesStr: string;
    tiles: Array<MapTiles.MapTile>;
};

interface DeadState {
    wishIdx: number;
    ts: number;
    dialogCharPos: number;
    dialogs: string[];
    curDialog: number;
    state: number;
    selectionK: number;
    selectionDirection: number;
    selectorTransition: number;
};

type Tickable = [((dts: number) => boolean) | null, (() => void) | null]; // returns true on keep updating

interface ParticleSystemDefinition {
    count: number;
    rate: number;
    max: number;
    spawn: () => any;
    update: (p: any, dt: number) => boolean; // true == keep alive
    draw: (p: any) => void;
}

interface ParticleSystem extends ParticleSystemDefinition {
    _globalCount: number;
    _spawnTimer: number;
    _particles: any[];
}

interface GameState {
    tts: number; // Total time seconds
    fadePos: number;
    fadeSpeed: number;
    player: Player;
    level: Level;
    numKeys: number;
    numRenderedKeys: number;
    deadState: DeadState;
    levelIdx: number;
    isSolidTileA: boolean;
    objects: GameObject[];
    doIntro: boolean;
    doOutro: boolean;
    tickables: Tickable[];
    particleSystems: ParticleSystem[];
    finalWished: boolean;
    respawnPs: any;
};

export const state = {} as GameState;

export const mapGet = (x: number, y: number) => {
    const map = state.level.levelMap;
    assert(y < map.sz[1]);
    return map.tiles[indexSquareArray(map.sz[0], x, y)];
};

export const mapGetFloat = (x: number, y: number) => {
    return mapGet(floor(x), floor(y));
};

export const mapSet = (x: number, y: number, value: Map["tiles"][0]) => {
    const map = state.level.levelMap;
    assert(y < map.sz[1]);
    map.tiles[indexSquareArray(map.sz[0], x, y)] = value;
};

export const addObject = (obj: GameObject) => {
    state.objects.push(obj);
};

export const sendAndRunMessages = (msg: number) => {
    for (let obj of state.objects) {
        obj.handleMessage?.(obj, msg);
    }
};

export const isPosClear = (x: number, y: number, r: number) => {
    // Check tile
    const tile = mapGetFloat(x, y);
    if (tile == MapTiles.Block || tile == MapTiles.Goal || tile == MapTiles.Wall || tile == MapTiles.Spikes || tile == MapTiles.Wall || tile == MapTiles.ToggleableA || tile == MapTiles.ToggleableB || tile == MapTiles.FertileEarth) {
        return false;
    }
    const objs = objectsAtShape(state.objects, ShapeCircle, vec2(x, y), vec2(r, r));
    return objs.length == 0;
};

// TODO: Add extra objects outside of map.
// TODO: Create render map with auto-tiles

export const parseMap = () => {
    const map = state.level.levelMap;

    for (let y = 0; y < map.sz[1]; ++y) {
        for (let x = 0; x < map.sz[0]; ++x) {
            const tile = mapGet(x, y);
            let clearTile = true;
            const centerPos = vec2(x + 0.5, y + 0.5);
            switch (tile) {
                case MapTiles.Key:
                    addObject(createKey(centerPos));
                    break;
                case MapTiles.Goal:
                    addObject(createDoor(vec2(x + 0.5, y + 0.1)));
                    break;
                case MapTiles.Toggle:
                    addObject(createToggle(centerPos, ToggleTypeAB));
                    break;
                case MapTiles.WheelSwitch:
                    addObject(createToggle(centerPos, ToggleTypeWheel));
                    break;
                case MapTiles.Wheel:
                    addObject(createWheel(centerPos));
                    break;
                case MapTiles.Fire:
                    addObject(createFire(centerPos));
                    break;
                case MapTiles.Skull:
                    addObject(createFire(centerPos));
                    addObject(createSkull(centerPos));
                    break;
                case MapTiles.Tree:
                    addObject(createTree(centerPos));
                    mapSet(x, y, MapTiles.FertileEarth);
                    clearTile = false;
                    break;
                case MapTiles.ToggleableA:
                case MapTiles.ToggleableB:
                    addObject(createPillar(centerPos, tile == MapTiles.ToggleableB));
                    break;
                default:
                    clearTile = false;
                    break;
            }
            if (clearTile) {
                mapSet(x, y, MapTiles.Empty);
            }
        }
    }
};

export const addParticleSystem = (psd: ParticleSystemDefinition) => {
    const ps = psd as ParticleSystem;
    ps._globalCount = 0;
    ps._spawnTimer = 0;
    ps._particles = [];
    state.particleSystems.push(ps);
};

const initPsTickable = () => {
    // Pongo el PS en un tickable, que groso soy
    state.tickables.push([(dts: number) => {
        arrayRange(state.particleSystems, (ps, psi) => {
            ps._spawnTimer += dts * ps.rate;

            while ((ps.max < 0 || ps._globalCount < ps.max)
                && ps._particles.length < ps.count && ps._spawnTimer > 0) {
                ps._spawnTimer -= dts;
                ps._particles.push(ps.spawn());
                ps._globalCount++;
            }

            arrayRange(ps._particles, (p, i) => {
                if (!ps.update(p, dts)) {
                    ps._particles[i] = null;
                }
            });

            ps._particles = ps._particles.filter(x => x != null);
            if (ps._particles.length == 0 && ps.max >= 0) {
                state.particleSystems[psi] = null as any;
            }

        });
        state.particleSystems = state.particleSystems.filter(x => x != null);
        return true;
    }, () => {
        arrayRange(state.particleSystems, (ps) => {
            arrayRange(ps._particles, (p) => {
                ps.draw(p);
            });
        });
    }]);
};

export const gameInit = (numLevel: number) => {
    state.tts = 0;
    state.objects = [];
    state.particleSystems = [];
    state.tickables = [];

    //numLevel = levels.length - 1;
    //numLevel = 3;
    state.level = getLevel(numLevel);

    parseMap();

    state.numKeys = 0;
    state.numRenderedKeys = 0;
    state.levelIdx = numLevel;
    state.isSolidTileA = false;
    Input.lockUntilReleased();

    updateCameraBounds(state.level.levelMap.sz[0], state.level.levelMap.sz[1]);

    state.doIntro = numLevel < 3;
    state.doOutro = numLevel == levels.length - 1;
    state.finalWished = false;

    if (state.doOutro) {
        state.level.neededKeys = 1;
    }

    state.respawnPs = null;

    state.fadeSpeed = -4.0;
    state.fadePos = 0.999;

    state.player = createPlayer();
    addObject(state.player);

    initPsTickable();

    // Debug kill
    //killPlayer(DeathReasonNone);

    camera.locked = true;
    camera.worldCenter = vec3(state.level.levelMap.sz[0] / 2, 0, state.level.levelMap.sz[1] / 2);
};

export const goalIsOpen = () => {
    return state.numKeys >= state.level.neededKeys;
}

export const isSolid = (x: number, y: number) => {
    const t = mapGet(x, y);
    const pStatus = state.player.power;
    return t == MapTiles.Block || t == MapTiles.TallBlock
        || (t == MapTiles.Wall && pStatus != PlayerPowerCrosessWalls);
};

export const mapCircleSolidCollision = (pos: Vec2, r: number) => {
    const map = state.level.levelMap;
    for (let y = 0; y < map.sz[1]; ++y) {
        for (let x = 0; x < map.sz[0]; ++x) {
            const tile = mapGet(x, y);
            if (rectCircleCollision(vec2(x, y), vec2(1, 1), pos, r) && isSolid(x, y)) {
                return true;
            }
        }
    }
    return false;
};

const playerStatusFromWish = (wish: number) => {
    switch (wish) {
        case Wish.Key:
            state.numKeys = state.numRenderedKeys = 1;
            break;
        case Wish.End:
            killPlayer(DeathReasonNone);
            break;
        case Wish.Job:
            sendAndRunMessages(MsgTogglePillars);
            setPower(Wish.Immortality);
            break;
        default:
            setPower(wish);
            break;
    }
};


export const goBackToLife = () => {
    vecSet(state.player.pos, state.player.nextPos);

    if (state.player.power == PlayerPowerHomeOwner) {
        vecSet(state.player.pos, state.level.housePosition);
    }

    state.player.tilePositions = [vecFloor(state.player.pos, vec2Splay(0))];

    if (state.respawnPs != null) {
        state.respawnPs.max = 0;
    }

    camera.locked = true;

    // Move it to the center of the tile
    vecAdd(state.player.pos, vec2Splay(0.5), state.player.pos);

    state.player.wishMarkerPos = vec2Copy(state.player.pos);
    state.player.isDead = false;

};

export const gameUpdate = (dts: number) => {
    state.tts += dts;

    if (camera.shakeA > 0) {
        camera.shakeA = max(0, camera.shakeA - dts);
    }

    if (state.fadePos > 0) {
        state.fadePos += state.fadeSpeed * dts;
        if (state.fadePos >= 1 || state.fadePos <= 0) {
            if (state.fadeSpeed > 0) {
                if (state.levelIdx == levels.length - 1) {
                    setMode(ModeGameOver);
                } else {
                    setMode(ModeGame, state.levelIdx + 1);
                }
            }
            state.fadePos = -1;
        }
    }


    // Detect a tickable explosion xD
    assert(state.tickables.length < 100);
    arrayRange(state.tickables, (el, i) => {
        if (el[0] && !el[0](dts)) {
            state.tickables[i] = null as unknown as Tickable;
        }
    });

    state.tickables = state.tickables.filter(x => x != null);

    if (!state.player.isDead) {
        setCameraWorldCenter(vec3(state.player.pos[0], 0, state.player.pos[1]));
    } else {
        setCameraWorldCenter(vec3(state.player.nextPos[0] - 0.5, 0, state.player.nextPos[1] + 3));
    }

    if (DEBUG) {
        if (wasInputPressed(Input.InputS)) {
            setMode(ModeGame, (state.levelIdx + 1) % levels.length);
        }
    }

    if (wasInputPressed(Input.InputR)) {
        setMode(ModeGame, state.levelIdx);
    }

    if (state.player.isDead) {
        updateDeadScreen(dts);
        return;
    }

    const objs = state.objects;

    for (let obj of objs) {
        !obj.toDelete && obj.tick && obj.tick(obj, dts);
    }

    doCollisions(objs);

    for (let i = objs.length - 1; i >= 0; --i) {
        const obj = objs[i];
        if (obj.toDelete) {
            obj.onKill && obj.onKill(obj);
            objs[i] = objs[objs.length - 1];
            objs.pop();
        }
    }


};

const drawLabel = (str: string, x: number, y: number, fillStyle = "white", size = 16, bg = "#00000044") => {
    setOverlayCtxTextParameters(size);
    const metrics = overlayCtx.measureText(str);
    overlayCtx.fillStyle = bg;

    const m = 10;

    overlayCtx.fillRect(
        x - metrics.actualBoundingBoxLeft - m,
        y - metrics.actualBoundingBoxAscent - m,
        metrics.width + 2 * m,
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 2 * m);

    overlayCtx.fillStyle = fillStyle;

    overlayCtx.fillText(str, x, y);
};

export const DialogIntro = 0;
export const DialogBarTooLow = 1;
export const DialogDiedAgain = 2;
export const DialogSunkForever = 3;
export const DialogDrown = 4;
export const DialogNurturedNature = 5;
export const DialogDiluted = 6;
export const DialogMelted = 7;
export const DialogWheel = 8;
export const DialogOutro = 9;
export const DialogOutroGuest = 10;

export const dialogs = [
    [
        "YOU ARE DEAD...",
        "But congratulations!\nYou are the dead person N??\n100,000,000,000!",
        "I'll grant you any wish you want!"
    ],
    [
        "Ok, I set the bar too low.\nThat one's on me.\nYou still have one wish."
    ],
    [
        "YOU DIED AGAIN."
    ],
    [
        "You spend the rest of your immortality\nin the dark embrace of the depths."
    ],
    [
        "It's clear to me that you can't swim."
    ],
    [
        "You gave your life so nature can blossom."
    ],
    [
        "You dilute in water.\nForever.",
    ],
    [
        "You melted an unique key.\nYou are trapped here forever.",
    ],
    [
        "You are no Indy, my friend."
    ],
    [
        "You are finally here.\nWelcome.",
        "I suppose you are here for a real wish?",
        "Be my guest.\nWhat do you wish for?",
    ],
    [
        "Be my guest.\nWhat do you wish for?",
    ],
];

export const DeadStateHearing = 0;
export const DeadStateAnswering = 1;
export const DeadStateDemoAnswering = 2;

export const setDialog = (idx: number) => {
    state.deadState.dialogCharPos = 0;
    state.deadState.curDialog = 0;
    state.deadState.dialogs = dialogs[idx];
};

const updateDeadScreen = (dts: number) => {
    const deadState = state.deadState;
    deadState.ts += dts;

    const curDialogStringLength = deadState.dialogs[deadState.curDialog].length;

    deadState.selectionK = max(0, deadState.selectionK - dts * 5.0);

    const finalDialog = deadState.curDialog >= deadState.dialogs.length - 1;
    if (finalDialog) {
        deadState.state = DeadStateAnswering;
    }

    const currentDialogLineFinished = deadState.dialogCharPos >= curDialogStringLength;

    if (deadState.state == DeadStateHearing) {
        if (wasAnyKeyPressed()) {
            if (!currentDialogLineFinished) {
                deadState.dialogCharPos = curDialogStringLength;
            } else {
                if (!finalDialog) {
                    ++deadState.curDialog;
                    deadState.dialogCharPos = 0;
                }
            }
        }

    } else if (deadState.state == DeadStateAnswering) {

        deadState.selectorTransition = min(deadState.selectorTransition + dts * ((state.doIntro || state.doOutro) ? 1 : 4), 1);

        if (wasInputPressed(Input.InputUp)) {
            --deadState.wishIdx;
            deadState.selectionDirection = -1;
            deadState.selectionK = 1;
        }

        if (wasInputPressed(Input.InputDown)) {
            ++deadState.wishIdx;
            deadState.selectionDirection = 1;
            deadState.selectionK = 1;
        }

        const wishes = state.level.availableWishes;
        deadState.wishIdx = (wishes.length == 0 || state.doIntro) ? -1 : mod(deadState.wishIdx, wishes.length);

        if (wasInputPressed(Input.InputUiOk)) {
            if (deadState.wishIdx < 0) {
                if (state.doIntro) {
                    setDialog(DialogBarTooLow);
                    state.doIntro = false;
                    state.deadState.selectorTransition = 0;
                } else if (state.doIntro) {
                    setDialog(DialogOutroGuest);
                    state.deadState.selectorTransition = 0;
                } else {
                    setMode(ModeGame, state.levelIdx);
                }
            } else {
                if (state.doOutro) {
                    state.finalWished = true;
                }
                playerStatusFromWish(wishes[deadState.wishIdx]);
                wishes.splice(deadState.wishIdx, 1);
                goBackToLife();
            }
        }
    }

    const textSpeed = 20;
    deadState.dialogCharPos = min(deadState.dialogCharPos + dts * textSpeed, curDialogStringLength);
}

export const goToNextLevel = () => {
    state.fadeSpeed = state.finalWished ? 0.2 : 2;
    state.fadePos = 0.001;
    state.player.tick = () => { };
    state.player.handleCollision = () => { };
};


const centeredText = (str: string, x: number, y: number, size: number, font?: string | null, bold?: boolean, strokeToo?: boolean) => {
    setOverlayCtxTextParameters(size, font, bold);
    overlayCtx.fillText(str, x, y);
    if (strokeToo) {
        overlayCtx.strokeText(str, x, y);
    }
};

const drawDeadScreen = () => {
    const deadState = state.deadState;


    const fontSize = 25;
    let textY = 200;

    overlayCtx.fillStyle = Palette.WhiteCss;
    overlayCtx.lineWidth = 1;
    setOverlayCtxTextParameters(fontSize);
    deadState.dialogs[deadState.curDialog].substring(0, floor(deadState.dialogCharPos)).split("\n").forEach(str => {
        centeredText(str, viewResolution[0] / 2, textY, fontSize, null, true, true);
        textY += fontSize * 1.5;
    });

    const selectorX = 400;
    const selectorHalfW = 250;
    const selectorHalfH = 85;
    const gearScale = 250;

    // SKULLEY!
    const skullMod = smoothstep(0, 0.8, min(1, deadState.ts));
    pushColor([skullMod, skullMod, skullMod, skullMod * 0.6]);
    render2dSdfSprite(AssetIds.Skull, selectorX, 170, 50, 120 + 15 * sin(0.9 * state.tts) + 260 * skullMod, abs(sin(state.tts * 12)), 0);
    popColor();

    // Tubisor
    const ctx = overlayCtx;

    const selectorY = 430 + 300 * (1 - deadState.selectorTransition);

    forRangeN(2, side =>
        forRangeN(2, (i) => {
            const ratio = i == 0 ? 1 : 0.7;
            const sign = i == 0 ? -1 : 1;
            const sideSign = side == 0 ? -1 : 1;
            const curScale = gearScale * ratio;
            const sideOffset = 30;
            const time = sign * deadState.selectionK * deadState.selectionDirection / ratio;
            render2dSdfSprite(AssetIds.MenuGear, selectorX + sideSign * (selectorHalfW + sideOffset + 38 * i), selectorY, 50 - i * 10, curScale * -sideSign, time, 0, curScale);
        })
    );

    render2dSdfSprite(AssetIds.Tubisor, selectorX, selectorY, 100, 600, 0, 0);

    const visorHalfW = 210;
    const visorHalfH = 50;

    // Viewer clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(selectorX - visorHalfW, selectorY - visorHalfH, visorHalfW * 2, visorHalfH * 2);
    ctx.clip();

    const strings = state.doIntro ? ["I wish to go back to life."] : state.level.availableWishes.map(x => Wish.wishStrings[x]);

    if (strings.length == 0) strings.push("I wish to begin anew.");

    forRangeN(5, (i) => {
        const sign = i - 2;
        ctx.fillStyle = sign == 0 ? Palette.DarkPurpleCss : Palette.BlackCss;
        const textIdx = mod(deadState.wishIdx + sign, strings.length);
        const offset = deadState.selectionK * deadState.selectionDirection;
        centeredText(strings[textIdx], selectorX, selectorY + (sign + offset) * 50, 26);
    });

    ctx.restore(); //To reset clip 

};

const drawOverlayCircle = (center: Vec2, r: number, color: string) => {
    overlayCtx.fillStyle = color;
    overlayCtx.beginPath();
    overlayCtx.ellipse(center[0], center[1], r, r, 0, 0, TwoPi);
    overlayCtx.fill();
};

const drawOverlayRect = (center: Vec2, r: Vec2, color: string) => {
    overlayCtx.fillStyle = color;
    overlayCtx.fillRect(center[0] - r[0], center[1] - r[1], 2 * r[0], 2 * r[1]);
};


export const drawCollisionFixtures = () => {
    for (let obj of state.objects) {
        if (obj.fixtures) {
            for (let f of obj.fixtures) {
                const worldPos = getFixturePos(f, vec2Splay(0));
                const wp3d = vec3(worldPos[0], 0, worldPos[1]);
                const screenPos = cameraToScreen(wp3d);
                switch (f.typeId) {
                    case ShapeCircle: {
                        const scale = camera.zoom;
                        drawOverlayCircle(screenPos, f.radius[0] * scale, "#FF00FF88");
                        break;
                    }
                    case ShapeRect: {
                        const scale = camera.zoom;
                        const r = vecMulK(f.radius, scale, vec2Splay(0));
                        drawOverlayRect(screenPos, r, "#FF00FF88");
                        break;
                    }
                }
            }
        }
    }
};


export const getKeyUiPos = (n: number) => {
    const keysUiX = 50;
    const keysUiY = 550;
    return vec2(keysUiX + n * 50, keysUiY);
};

export const gameRender = () => {
    const map = state.level.levelMap;

    const player = state.player;

    seedGoldenSampler(0);
    /*
        forRangeN(4, i => {
            renderSdfSpriteFrame(AssetIds.TwistBaseColumn, 2, -1.5 - i * 3.8, map.sz[1], 0, 0);
        });
        */

    if (player.isDead) {
        const darkColor = mix(1, 0.2, min(1, state.deadState.ts * 0.8));
        pushColor([darkColor, darkColor, darkColor, 1.0]);
    }

    for (let y = 0; y < map.sz[1]; ++y) {
        for (let x = 0; x < map.sz[0]; ++x) {
            const tile = mapGet(x, y);

            if (tile == MapTiles.Water) {
                renderSdfSprite(AssetIds.WaterTile, x + 0.5, -0.5, y + 0.5, state.tts, 0);
            } else if (tile == MapTiles.FertileEarth) {
                renderSdfSprite(AssetIds.DirtTile, x + 0.5, -0.5, y + 0.5, state.tts, 0);
            } else if (tile == MapTiles.CarpetCenter
                || tile == MapTiles.CarpetLeft
                || tile == MapTiles.CarpetRight) {
                renderSdfSpriteFrame(AssetIds.Carpet, x + 0.5, -0.5, y + 0.5, tile - MapTiles.CarpetLeft, 0);
            }
            else {
                renderSdfSpriteFrame(AssetIds.FloorTile, x + 0.5, -0.5, y + 0.5, goldSample() > 0.85 ? 1 : 0, floor(4 * goldSample()));
                if (x == 0 || y == 0) {
                    const xx = x == 0 ? x + 1 : x - 0.5;
                    const yy = (x == 0 ? y + 0.5 : y + 1);
                    renderSdfSpriteFrame(AssetIds.WallWoodDeco, xx, 0, yy, floor(goldSample() * 3), x == 0 ? 0 : 1);
                }
            }
            /*
                        forRangeN(10, (iy) => {
                            renderSdfSpriteFrame(AssetIds.DirtTile, x + 0.5, -0.5 - iy -1, y + 0.5, 0, 0);
                        })
            */
            switch (tile) {
                case MapTiles.TallBlock:
                case MapTiles.Block:
                    renderSdfSprite((tile == MapTiles.TallBlock || x == 0 || y == 0) ? AssetIds.TallWall : AssetIds.Wall, x + 0.5, 0, y + 0.5, 0, 0);
                    break;
                case MapTiles.Spikes:
                    renderSdfSpriteFrame(AssetIds.Spikes, x + 0.5, 0, y + 0.5, floor(goldSample() * 3), 0);
                    break;
                case MapTiles.House:
                    renderSdfSprite(AssetIds.House, x + 0.5, 0, y - 0.5, 0, 0);
                    break;
                case MapTiles.Wall:
                    renderSdfSpriteFrame(AssetIds.Bars, x + 0.5, 0, y + 0.5, player.power == PlayerPowerCrosessWalls ? 1 : 0, 0);
                    break;
            }
        }
    }

    for (let obj of state.objects) {
        !obj.toDelete && obj.draw?.(obj);
    }

    if (player.isDead) {
        popColor();
    }

    arrayRange(state.tickables, (el, i) => {
        if (el[1]) {
            el[1]();
        }
    });

    if (state.fadePos > 0) {
        overlayCtx.fillStyle = rgbaToCssString(0, 0, 0, state.fadePos);
        overlayCtx.fillRect(0, 0, 800, 600);
    }

    // Lets UI Yeah!
    // Show needed later
    forRangeN(state.level.neededKeys, i => {
        const pos = getKeyUiPos(i);
        const missing = i + 1 > state.numRenderedKeys;
        const s = missing ? 150 : 350;
        const id = missing ? AssetIds.Lock : AssetIds.Key;
        render2dSdfSprite(id, pos[0], pos[1], 50, s, 0, 0);
    });

    if (DEBUG) {
        //drawCollisionFixtures();

        /*
        const statusLabels = [
            "normal",
            "immortal",
            "swims",
            "through walls",
            "homeowner",
            "liquid",
            "on fire",
        ];

        const pos = cameraToScreen(vec3(player.pos[0], 0, player.pos[1]));
        drawLabel(statusLabels[player.power], pos[0], pos[1] - 30);
        */
    }

    drawLabel("(R) To RETRY level", 100, 40, "white", 14);
    //drawLabel("(S) To SKIP level", 70, 45, "white", 12);

    if (state.player.isDead) {
        drawDeadScreen();
    }

};