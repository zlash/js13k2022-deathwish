import { goalIsOpen, mapGetFloat } from "../game";
import { CollisionCatItem, CollisionCatSolid, CollisionFixture, createCircleFixture, createRectFixture, ItemCollisionMask } from "../collisions";
import { addFixture, createGameObject, createGameObjectWithFixture, GameObject, GameObjectTypeWheel, MsgStartWheel, objUsuallySolid } from "../gameObject";

import * as SdfIds from "../sdf/sdfIds";
import { vec2, Vec2, vecSet } from "../juvec";
import { assert } from "../aliasedFunctions";
import { Wheel } from "../mapTileConstants";
import { getPlayer, InflictionWheel, inflictPlayerWith, PlayerPowerImmortal } from "./player";

import * as MapTiles from "../mapTileConstants";
import { renderSdfSprite, renderTextureSprite } from "../renderer";

import * as AssetIds from "~sdf/sdfAssetsIds";

export const WheelRadius = 1;

export interface Wheel extends GameObject {
    vel: number;
    broken: boolean;
};

// TODO: SQUARE COLLISIONs!

export const createWheel = (pos: Vec2): Wheel => {
    const wheel = createGameObject(GameObjectTypeWheel) as Wheel;
    const fixture = createRectFixture(vec2(0.9, 0.5), CollisionCatItem, ItemCollisionMask | CollisionCatItem);
    addFixture(wheel, fixture);
    wheel.vel = 0;
    wheel.tick = tick;
    wheel.draw = draw;
    wheel.handleMessage = handleMessage;
    wheel.handleCollision = handleCollision;
    wheel.broken = false;
    vecSet(wheel.pos, pos);
    return wheel;
};

const tick = (wheel: Wheel, dts: number) => {
    const tile = mapGetFloat(wheel.pos[0] + 0.25, wheel.pos[1]);
    if (tile == MapTiles.Block) {
        doSolidCollision(wheel);
    }

    if (wheel.vel > 0) {
        wheel.pos[0] += wheel.vel * dts;
    }
};

const draw = (wheel: Wheel) => {
    renderSdfSprite(AssetIds.Wheel, wheel.pos[0], WheelRadius/2, wheel.pos[1], wheel.pos[0]/12, 0);
};

const handleMessage = (wheel: Wheel, msg: number) => {
    if (!wheel.broken && msg == MsgStartWheel) {
        wheel.vel = 14;
    }
};

const doSolidCollision = (wheel: Wheel) => {
    wheel.vel = 0;
    wheel.broken = true;
}

const handleCollision = (a: CollisionFixture, b: CollisionFixture, v: Vec2) => {
    const wheel = a.parent as Wheel;
    const obj = b.parent as GameObject;
    assert(wheel != null && obj != null);

    if (wheel.broken) {
        return;
    }

    let collided = objUsuallySolid(obj);

    const player = getPlayer(b);

    if (player) {
        inflictPlayerWith(player, InflictionWheel);
    }

    if (collided || player) {
        doSolidCollision(wheel);
    }

};