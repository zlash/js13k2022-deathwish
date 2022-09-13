import { getKeyUiPos, state } from "../game";
import { CollisionCatItem, createCircleFixture, ItemCollisionMask } from "../collisions";
import { createGameObjectWithFixture, GameObject, GameObjectTypeKey } from "../gameObject";

import { vec2, Vec2, vec2Copy, vec2Splay, vecAdd, vecLength, vecMulK, vecSet, vecSub } from "../juvec";
import { cameraToScreen, render2dSdfSprite, renderSdfSprite, renderTextureSprite } from "../renderer";
import { Key } from "~sdf/sdfAssetsIds";
import { sin } from "~aliasedFunctions";

export interface Key extends GameObject {
    y: number;
};

export const createKey = (pos: Vec2): Key => {
    const fixture = createCircleFixture(0.2, CollisionCatItem, ItemCollisionMask);
    const key = createGameObjectWithFixture(GameObjectTypeKey, fixture) as Key;
    key.y = 0;
    key.draw = draw;
    vecSet(key.pos, pos);
    return key;
};

const draw = (key: Key) => {
    key.y = 0.35 + sin(state.tts * 2 + key.pos[0] + key.pos[1]) * 0.1;
    renderSdfSprite(Key, key.pos[0], key.y, key.pos[1], 0, 0);
};

export const pickKey = (key: Key) => {
    const target = getKeyUiPos(state.numKeys);
    ++state.numKeys;

    const pos = cameraToScreen([key.pos[0], key.y, key.pos[1]]);
    const dir = vec2Splay(0);
    state.tickables.push([() => {
        vecSub(target, pos, dir);
        if (vecLength(dir) < 5) {//reached
            ++state.numRenderedKeys;
            return false;
        }
        vecMulK(dir, 0.1, dir);
        vecAdd(pos, dir, pos);

        return true;
    }, () => {
        render2dSdfSprite(Key, pos[0], pos[1], 50, 300, 0, 0);
    }]);

    key.toDelete = true;
};