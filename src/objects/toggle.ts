import { sendAndRunMessages, state } from "../game";
import { CollisionCatItem, CollisionFixture, createCircleFixture, ItemCollisionMask } from "../collisions";
import { createGameObjectWithFixture, GameObject, GameObjectTypeKey, GameObjectTypeToggle, MsgStartWheel, MsgTogglePillars } from "../gameObject";

import * as SdfIds from "../sdf/sdfIds";
import { Vec2, vec2Copy, vecSet } from "../juvec";
import { max } from "../aliasedFunctions";
import { getPlayer, PlayerPowerLiquid, PlayerPowerOnFire } from "./player";
import { renderSdfSprite, renderTextureSprite, renderSdfSpriteFrame } from "../renderer";

import * as AssetIds from "~sdf/sdfAssetsIds";


export const ToggleTypeAB = 0;
export const ToggleTypeWheel = 1;

export interface Toggle extends GameObject {
    collisionFrameCounter: number;
    toggleType: number;
};

export const createToggle = (pos: Vec2, toggleType: number): Toggle => {
    const fixture = createCircleFixture(0.5, CollisionCatItem, ItemCollisionMask);
    const toggle = createGameObjectWithFixture(GameObjectTypeToggle, fixture) as Toggle;
    toggle.draw = draw;
    toggle.tick = tick;
    toggle.handleCollision = handleCollision;
    toggle.collisionFrameCounter = 0;
    toggle.toggleType = toggleType;
    vecSet(toggle.pos, pos);
    return toggle;
};

const draw = (toggle: Toggle) => {
    renderSdfSpriteFrame(toggle.toggleType == ToggleTypeAB ? AssetIds.PillarsSwitch : AssetIds.WheelSwitch, toggle.pos[0], 0, toggle.pos[1], toggle.collisionFrameCounter == 0 ? 0 : 1, 0);
};

const tick = (toggle: Toggle, dt: number) => {
    toggle.collisionFrameCounter = max(0, toggle.collisionFrameCounter - 1);
};

const handleCollision = (a: CollisionFixture, b: CollisionFixture) => {
    const toggle = a.parent as Toggle;
    const player = getPlayer(b);
    if (player && (player.power == PlayerPowerLiquid || player.power == PlayerPowerOnFire)) {
        return;
    }
    if (toggle.collisionFrameCounter == 0) {
        if (toggle.toggleType == ToggleTypeAB) {
            sendAndRunMessages(MsgTogglePillars);
        } else if (toggle.toggleType == ToggleTypeWheel) {
            sendAndRunMessages(MsgStartWheel);
        }
    }
    toggle.collisionFrameCounter = 2;
};