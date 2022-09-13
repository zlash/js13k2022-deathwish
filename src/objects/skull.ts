import { goalIsOpen, state } from "../game";
import { CollisionCatItem, createCircleFixture, createRectFixture, ItemCollisionMask } from "../collisions";
import { createGameObjectWithFixture, GameObject, GameObjectTypeSkull } from "../gameObject";

import { vec2, Vec2, vecSet } from "../juvec";
import { assert, cos, sin } from "../aliasedFunctions";
import { popColor, pushColor, renderSdfSprite, renderTextureSprite } from "../renderer";

import * as AssetIds from "~sdf/sdfAssetsIds";

export interface Skull extends GameObject {
};

export const createSkull = (pos: Vec2): Skull => {
    const fixture = createRectFixture(vec2(0.5, 0.6), CollisionCatItem, ItemCollisionMask);
    const skull = createGameObjectWithFixture(GameObjectTypeSkull, fixture) as Skull;
    skull.draw = draw;
    vecSet(skull.pos, pos);
    return skull;
};

const draw = (skull: Skull) => {
    pushColor([1, 1, 1, 0.5]);
    renderSdfSprite(AssetIds.InGameSkull, skull.pos[0], 1.5 + 0.5 * sin(state.tts), skull.pos[1] + 0.5 + 0.4 * cos(state.tts * 0.75), 0, 0);
    popColor();
};
