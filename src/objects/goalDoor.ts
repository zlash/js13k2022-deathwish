import { goalIsOpen } from "../game";
import { CollisionCatItem, createCircleFixture, ItemCollisionMask } from "../collisions";
import { createGameObjectWithFixture, GameObject, GameObjectTypeGoalDoor } from "../gameObject";

import * as AssetIds from "~sdf/sdfAssetsIds";

import { Vec2, vecSet } from "../juvec";
import { renderSdfSprite, renderTextureSprite } from "../renderer";

export interface GoalDoor extends GameObject {
    ts: number;
};

export const createDoor = (pos: Vec2): GoalDoor => {
    const fixture = createCircleFixture(0.2, CollisionCatItem, ItemCollisionMask);
    const door = createGameObjectWithFixture(GameObjectTypeGoalDoor, fixture) as GoalDoor;
    door.draw = draw;
    door.tick = tick;
    door.ts = 0;
    vecSet(door.pos, pos);
    return door;
};

const draw = (door: GoalDoor) => {
    renderSdfSprite(AssetIds.Door, door.pos[0], 0.0, door.pos[1], door.ts, 0);
};

const tick = (door: GoalDoor, dts: number) => {
    if (door.ts == 0) {
        if (goalIsOpen()) {
            door.ts = 0.001;
        }
    } else {
        door.ts += dts;
        if (door.ts > 0.99) {
            door.ts = 0.99;
        }
    }
};