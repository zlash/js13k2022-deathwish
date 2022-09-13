import { goalIsOpen } from "../game";
import { CollisionCatItem, createCircleFixture, createRectFixture, ItemCollisionMask } from "../collisions";
import { createGameObjectWithFixture, GameObject, GameObjectTypePillar, MsgTogglePillars } from "../gameObject";

import * as AssetIds from "~sdf/sdfAssetsIds";
import { vec2, Vec2, vecSet } from "../juvec";
import { assert, max, min } from "../aliasedFunctions";
import { camera, renderSdfSprite, renderTextureSprite } from "../renderer";
import { pillar } from "~sdf/sdfAssets";

export interface Pillar extends GameObject {
    up: boolean;
    animK: number;
};

export const createPillar = (pos: Vec2, up: boolean): Pillar => {
    const fixture = createRectFixture(vec2(0.5, 0.5), CollisionCatItem, ItemCollisionMask);
    const pillar = createGameObjectWithFixture(GameObjectTypePillar, fixture) as Pillar;
    pillar.draw = draw;
    pillar.tick = tick;
    pillar.handleMessage = handleMessage;
    pillar.up = up;
    pillar.animK = 0;
    vecSet(pillar.pos, pos);
    return pillar;
};

const draw = (pillar: Pillar) => {
    const yk = pillar.animK;
    const y = yk > 0 ? yk : 0;
    renderSdfSprite(AssetIds.Pillar, pillar.pos[0], 0.0, pillar.pos[1], pillar.up ? (0.99 - y) : y, 0);
};

const tick = (pillar: Pillar, dt: number) => {
    if (pillar.animK <= 0) return;

    pillar.animK -= dt * 2.5;
    if (pillar.animK < 0) {
        pillar.animK = 0;
        camera.shakeA = 0.2;
    }
};

const handleMessage = (pillar: Pillar, msg: number) => {
    if (msg == MsgTogglePillars) {
        pillar.up = !pillar.up;
        pillar.animK = 0.99;
    }
};