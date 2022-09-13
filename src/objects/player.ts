import { assert, atan2, cos, floor, randomRange, sin, TwoPi } from "../aliasedFunctions";
import { rectCircleCollision } from "../geom";
import { setMode, ModeGame } from "../index";
import { isInputDown } from "../input";
import { isLastLevel } from "../level";
import { addObject, addParticleSystem, DeadStateAnswering, DeadStateHearing, DeathFadeDuration, DialogDiedAgain, DialogDiluted, DialogDrown, DialogIntro, DialogMelted, DialogNurturedNature, DialogOutro, dialogs, DialogSunkForever, DialogWheel, goalIsOpen, goToNextLevel, isPosClear, isSolid, mapCircleSolidCollision, mapGet, mapSet, setDialog, state } from "../game";
import { GameObject, GameObjectTypeFire, GameObjectTypeGoalDoor, GameObjectTypeKey, GameObjectTypePillar, GameObjectTypePlayer, GameObjectTypeTree, GameObjectTypeWheel } from "../gameObject";
import { vec2, Vec2, vec2Copy, vec2Splay, Vec3, vec3, vec3Splay, vec4, vecAdd, vecEq, vecFloor, vecMulK, vecNormalizeSafe, vecSet, vecSub } from "../juvec";

import * as Input from "../input";
import * as MapTiles from "../mapTileConstants";
import { CollisionCatHazard, CollisionCatItem, CollisionCatPlayer, CollisionCatSolid, CollisionFixture, objectsAtShape, ShapeCircle } from "../collisions";
import { Key, pickKey } from "./key";
import { forRangeN, indexSquareArray } from "~utils";
import { castObjAsTree, createTree } from "./tree";
import { camera, popColor, popRenderSdfScale, pushColor, pushRenderSdfScale, renderSdfSprite, renderTextureSprite } from "../renderer";
import * as AssetIds from "~sdf/sdfAssetsIds";
import { Pillar } from "./pillar";
import { SvgTextureFbmParticle } from "~svgTextures";
import { createFirePS } from "./fire";
import { pushScale } from "~sdf/sdfBuilder";

import * as Wish from "../wishes";

export const PlayerPowerImmortal = 0;
export const PlayerPowerCrosessWalls = 1;
export const PlayerPowerSwims = 2;
export const PlayerPowerHomeOwner = 3;
export const PlayerPowerLiquid = 4;
export const PlayerPowerOnFire = 5;
export const PlayerPowerNone = 6;
export const PlayerPowerCount = 7;


type PlayerStatus = number;


export const DeathReasonNone = 0;
export const DeathReasonFire = 1;

export const DeathReasonSunkForever = 3;
export const DeathReasonDrowned = 4;
export const DeathReasonTreesGrew = 5;
export const DeathReasonDiluted = 6;
export const DeathReasonNoMoreKey = 7;
export const DeathReasonWheel = 8;

export const InflictionNone = 0;
export const InflictionSpikes = 1;
export const InflictionFire = 2;
export const InflictionDeepWater = 3;
export const InflictionWheel = 4;
export const InflictionMeltedKey = 5;
export const InflictionNurturedNature = 6;

export const CollisionMaskPlayer = CollisionCatSolid | CollisionCatHazard | CollisionCatItem;

export interface Player extends GameObject {
    tilePositions: Vec2[];
    wishMarkerPos: Vec2;
    radius: number;
    isDead: boolean;
    power: PlayerStatus;
    deathReason: number;
    lastInfliction: number;
    lostForever: boolean;
    lastAngle: number;
    walked: boolean;
    ps: any;
    nextPos: Vec2
};

export const createPlayer = (): Player => {
    const radius = 0.15;

    const fixture: CollisionFixture = {
        typeId: ShapeCircle,
        radius: vec2Splay(radius),
        offset: vec2Splay(0),
        collisionCategory: CollisionCatPlayer,
        collisionMask: CollisionMaskPlayer,
    };

    const player = {
        typeId: GameObjectTypePlayer,
        pos: vec2(state.level.startPosition[0] + 0.5, state.level.startPosition[1] + 0.5),
        radius, //Todo: Deleteme
        isDead: false,
        power: PlayerPowerNone,
        reallyDead: false,
        tilePositions: [vecFloor(state.level.startPosition, vec2Splay(0))],
        fixtures: [fixture],
        toDelete: false,
        tick: tickPlayer,
        draw: drawPlayer,
        handleCollision: handlePlayerCollision,
        deathReason: DeathReasonNone,
        lastInfliction: InflictionNone,
        lostForever: false,
        lastAngle: 0,
        walked: false,
        ps: null,
        nextPos: vec2Splay(0),
    } as any;

    player.wishMarkerPos = vec2Copy(player.pos);
    fixture.parent = player;

    return player;
};


const drawPlayer = (player: Player) => {

    if (state.fadePos >= 0 && state.fadeSpeed > 0) {
        return;
    }

    if (player.power == PlayerPowerOnFire) {
        pushColor(vec4(0, 0, 0, 1));
    }

    if (!player.isDead && player.power != PlayerPowerLiquid) {
        renderSdfSprite(player.walked ? AssetIds.TipitoWalk : AssetIds.TipitoStand, player.pos[0], 0.5, player.pos[1], player.walked ? state.tts : 0, player.lastAngle);
    }

    if (player.power == PlayerPowerOnFire) {
        popColor();
    }


    let wishMarkerId = -1;
    let fts = 0;
    switch (player.power) {
        case PlayerPowerImmortal:
            wishMarkerId = AssetIds.Infinity;
            break;
        case PlayerPowerHomeOwner:
            wishMarkerId = AssetIds.TopHat;
            break;
        case PlayerPowerSwims:
            wishMarkerId = AssetIds.Patito;
            fts = state.tts;
            break;
    }

    if (wishMarkerId >= 0) {
        renderSdfSprite(wishMarkerId, player.wishMarkerPos[0], 1.0, player.wishMarkerPos[1], fts, state.tts * 4);
    }

};

const forMapFill = (x: number, y: number, cb: (x: number, y: number) => void) => {
    const curTile = mapGet(x, y);
    const map = state.level.levelMap;
    const mapWidth = map.sz[0];
    const visitMap = Array(map.tiles.length) as boolean[];

    const toVisit = [[x, y]];

    const checkAndPush = (xx: number, yy: number) => {
        if (!visitMap[indexSquareArray(mapWidth, xx, yy)] && mapGet(xx, yy) == curTile) {
            toVisit.push([xx, yy]);
        }
    };

    while (toVisit.length > 0) {
        const curVisit = toVisit.pop() as number[];
        const xx = curVisit[0];
        const yy = curVisit[1];
        cb(xx, yy);
        visitMap[indexSquareArray(mapWidth, xx, yy)] = true;
        checkAndPush(xx + 1, yy);
        checkAndPush(xx - 1, yy);
        checkAndPush(xx, yy - 1);
        checkAndPush(xx, yy + 1);
    }

};

/*
const indexedDirections = [
    vec2Splay(0),
    vec2(-1, 1),
    vec2(1, -1),
    vec2(-1, -1),
    vec2(-1, 0),
    vec2(0, -1),
    vec2(1, 1),
    vec2(0, 1),
    vec2(1, 0),
];
*/


const tickPlayer = (player: Player, dt: number) => {
    //let idx = 0;

    const dirVec = vec2Splay(0);
    if (isInputDown(Input.InputLeft)) {
        //idx += 1;
        dirVec[0] = -1;
    } else if (isInputDown(Input.InputRight)) {
        //idx += 2;
        dirVec[0] = 1;
    }

    if (isInputDown(Input.InputUp)) {
        //idx += 3
        dirVec[1] = -1;
    }
    else if (isInputDown(Input.InputDown)) {
        //idx += 6;
        dirVec[1] = 1;
    }

    //  const dirVec = vec2Copy(indexedDirections[idx]);

    player.walked = dirVec[0] != 0 || dirVec[1] != 0;
    if (player.walked) {
        player.lastAngle = atan2(dirVec[1], dirVec[0]);
        vecNormalizeSafe(dirVec, dirVec);
        const moveSpeed = 3 * dt;
        vecMulK(dirVec, moveSpeed, dirVec);

        forRangeN(2, (i) => {
            let newPos = vec2Copy(player.pos);
            newPos[i] += dirVec[i];
            if (!mapCircleSolidCollision(newPos, player.radius)) {
                vecSet(player.pos, newPos);
            }
        });
    }

    // Punga y movement check 




    const map = state.level.levelMap;

    // if the tile is safe ...

    for (let y = 0; y < map.sz[1]; ++y) {
        for (let x = 0; x < map.sz[0]; ++x) {
            const tile = mapGet(x, y);
            // Point in tile for this ones active
            if (floor(player.pos[0]) == x && floor(player.pos[1]) == y) {
                if (tile == MapTiles.Water) {
                    inflictPlayerWith(player, InflictionDeepWater);
                }

                if (tile == MapTiles.Spikes) {
                    inflictPlayerWith(player, InflictionSpikes);
                }

                if (tile == MapTiles.FertileEarth) {
                    if (player.power == PlayerPowerLiquid) {
                        // Todo: ADD * RECT * SHAPES!
                        if (!objectsAtShape(state.objects, ShapeCircle, vec2(x + 0.5, y + 0.5), vec2Splay(0.5))
                            .find(obj => castObjAsTree(obj))) {
                            forMapFill(x, y, (xx, yy) => {
                                addObject(createTree(vec2(xx + 0.5, yy + 0.5)));
                            });
                        }
                        player.lastInfliction = InflictionNurturedNature;
                        killPlayer(DeathReasonTreesGrew);
                    }
                }
            }
        }
    }

    if (!player.isDead) {
        const curTilePos = vecFloor(player.pos, vec2Splay(0));
        if (!vecEq(player.tilePositions[0], curTilePos)) {
            player.tilePositions.unshift(curTilePos);
        }
    }

    const wishMarkerDir = vecSub(player.pos, player.wishMarkerPos, vec2Splay(0));
    vecMulK(wishMarkerDir, 0.1, wishMarkerDir);
    vecAdd(player.wishMarkerPos, wishMarkerDir, player.wishMarkerPos);

};

const particleExplosionAtPlayer = (assetId: number, velK: number, num: number) => {
    forRangeN(num, (nPs) => {
        const vecTmp = vec3Splay(0);
        const vecGravity = vec3(0, -9, 0);
        addParticleSystem({
            count: 50,
            rate: 100,
            max: 50,
            spawn: () => {
                const pos = vec3(state.player.pos[0], 0.25 + nPs * 0.5, state.player.pos[1]);
                const v = vec3(randomRange(-1, 1), 1, randomRange(-1, 1));
                vecNormalizeSafe(v, v);
                vecMulK(v, randomRange(0.3, 4 * velK), v);
                return {
                    v,
                    pos,
                    lifetime: 5,
                    s: randomRange(0.02, 0.06),
                };
            },
            update: (p: any, dt: number) => {
                const a = vecMulK(vecGravity, dt, vecTmp);
                vecAdd(p.v, a, p.v);
                const v = vecMulK(p.v, dt, vecTmp);
                vecAdd(p.pos, v, p.pos);
                p.lifetime -= dt;
                return p.lifetime > 0;
            },
            draw: (p: any) => {
                pushRenderSdfScale(p.s);
                renderSdfSprite(assetId, p.pos[0], p.pos[1], p.pos[2], 0, 0);
                popRenderSdfScale();
            },
        });
    });
};

const replacePs = (ps: any) => {
    const player = state.player;
    if (player.ps != null) {
        player.ps.max = 0;
        player.ps = null;
    }
    player.ps = ps;
    if (ps) {
        addParticleSystem(ps);
    }
}

export const killPlayer = (reason: number) => {
    const player = state.player;
    state.deadState = {
        wishIdx: 0,
        ts: 0,
        state: DeadStateHearing,
        selectionK: 0,
        selectionDirection: 0,
        selectorTransition: 0,
    } as any;

    // Drain wishes for terminal status
    if (reason == DeathReasonDiluted || reason == DeathReasonNoMoreKey || reason == DeathReasonSunkForever) {
        state.level.availableWishes = [];
        player.lostForever = true;
    }

    const bloodExplosion = reason == DeathReasonNone || reason == DeathReasonWheel;

    if (bloodExplosion) {
        particleExplosionAtPlayer(AssetIds.RedBall, 1, 2);
    }

    const waterExplosion = reason == DeathReasonDrowned || reason == DeathReasonSunkForever;

    if (waterExplosion) {
        particleExplosionAtPlayer(AssetIds.BlueBall, 0.3, 1);
    }

    replacePs(null);

    if (state.finalWished) {
        state.fadeSpeed = 0.2;
        state.fadePos = 0.01;
        player.tick = () => { };
        return;
    }

    // Respawn ps

    while (state.player.tilePositions.length > 0) {
        const pos = state.player.tilePositions.shift() as number[];
        if (isPosClear(pos[0] + 0.5, pos[1] + 0.5, 0.2)) {
            vecSet(state.player.nextPos, pos);
            break;
        }
    }


    if (state.level.availableWishes.length > 0) {
        if (state.respawnPs != null) {
            state.respawnPs.max = 0;
        }
        const fPos = vec2(0.3, 0.3);
        vecAdd(fPos, state.player.nextPos, fPos);
        state.respawnPs = createFirePS(fPos, 0.5, 0.2, vec4(0.4, 0.4, 0.3, 0.3));
        addParticleSystem(state.respawnPs);
        camera.locked = false;
    }

    // TODO: Select correct dialog
    // TODO: Match dialogs with reason

    if (state.doIntro) {
        setDialog(DialogIntro);
    } else if (state.doOutro) {
        state.level.availableWishes = [Wish.Key, Wish.End, Wish.Job];
        setDialog(DialogOutro);
    } else {
        setDialog(reason >= DeathReasonSunkForever ? reason : DialogDiedAgain);
    }

    Input.lockUntilReleased();

    player.deathReason = reason;
    player.isDead = true;
}

const charcoSystem = (pos: Vec2) => {
    return {
        count: 120,
        rate: 2,
        max: -1,
        spawn: () => {
            const r = randomRange(0, 0.5);
            const alpha = randomRange(0, TwoPi);
            const off = vec2(r * cos(alpha), r * sin(alpha));
            const pPos = vecAdd(pos, off, off);
            const s = randomRange(0.25, 1) * (1.05 - r / 0.5);
            const lifetime = 1;
            return {
                pos: pPos,
                lifetime,
                s,
            };
        },
        update: (p: any, dt: number) => {
            p.lifetime -= dt;
            return p.lifetime > 0;
        },
        draw: (p: any) => {
            pushRenderSdfScale(p.s * p.lifetime);
            renderSdfSprite(AssetIds.LiquidTipito, p.pos[0], 0.1, p.pos[1], 0, 0);
            popRenderSdfScale();
        },
    };
};


export const setPower = (power: number) => {
    const player = state.player;

    switch (power) {
        case PlayerPowerOnFire: {
            replacePs(createFirePS(player.pos, 1.5, 0.2));
            break;
        }
        case PlayerPowerLiquid: {
            replacePs(charcoSystem(player.pos));
            break;
        }
    }

    player.power = power;
}


export const inflictPlayerWith = (player: Player, infliction: number) => {
    const power = player.power;
    const immuneFire = power == PlayerPowerImmortal || power == PlayerPowerLiquid || power == PlayerPowerOnFire;
    const immuneSpikes = power == PlayerPowerImmortal || power == PlayerPowerLiquid || power == PlayerPowerOnFire;
    const immuneDeepWater = power == PlayerPowerSwims;
    const immuneWheel = power == PlayerPowerImmortal || power == PlayerPowerLiquid || power == PlayerPowerOnFire;

    player.deathReason = DeathReasonNone;
    player.lastInfliction = infliction;

    if (infliction == InflictionFire) {
        if (power == PlayerPowerImmortal) {
            setPower(PlayerPowerOnFire);
        } else if (!immuneFire) {
            killPlayer(DeathReasonFire);
        }
    } else if (infliction == InflictionDeepWater && !immuneDeepWater) {
        if (power == PlayerPowerImmortal) {
            killPlayer(DeathReasonSunkForever);
        } else if (power == PlayerPowerLiquid) {
            killPlayer(DeathReasonDiluted);
        } else {
            killPlayer(DeathReasonDrowned);
        }
    } else if (infliction == InflictionSpikes && !immuneSpikes) {
        killPlayer(DeathReasonNone);
    } else if (infliction == InflictionWheel && !immuneWheel) {
        killPlayer(DeathReasonWheel);
    } else if (infliction == InflictionMeltedKey) {
        killPlayer(DeathReasonNoMoreKey);
    }
};

const handlePlayerCollision = (a: CollisionFixture, b: CollisionFixture, v: Vec2) => {
    const obj = b.parent as GameObject;
    const player = getPlayer(a) as Player;
    assert(player != null);
    switch (obj.typeId) {
        case GameObjectTypeKey:
            if (player.power == PlayerPowerOnFire) {
                inflictPlayerWith(player, InflictionMeltedKey);
                obj.toDelete = true;
            } else if (player.power != PlayerPowerLiquid) {
                pickKey(obj as Key);
            }
            break;
        case GameObjectTypeGoalDoor:
            if (goalIsOpen()) {
                goToNextLevel();
            }
            break;
        case GameObjectTypeFire:
            if (player.power == PlayerPowerLiquid) {
                obj.toDelete = true;
            }
            inflictPlayerWith(player, InflictionFire);
            break;
        case GameObjectTypeTree:
            if (player.power == PlayerPowerOnFire) {
                obj.toDelete = true;
                const ps = createFirePS(obj.pos, 0.6, 0.3);
                addParticleSystem(ps);
                ps.max = 70;
            }
            break;
    }

    const solidState = !(player.power == PlayerPowerLiquid || player.power == PlayerPowerOnFire);
    const solid = obj.typeId == GameObjectTypeTree || (obj.typeId == GameObjectTypePillar && (obj as Pillar).up) || (obj.typeId == GameObjectTypeWheel && solidState);
    if (solid) {
        vecAdd(player.pos, v, player.pos);
    }
};

export const getPlayer = (a: CollisionFixture): Player | null => {
    assert(a.parent != null);
    const parent = a.parent as GameObject;
    return parent.typeId == GameObjectTypePlayer ? (parent as Player) : null;
};

