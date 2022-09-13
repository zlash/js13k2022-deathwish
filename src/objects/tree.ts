import { goalIsOpen } from "../game";
import { CollisionCatItem, createCircleFixture, createRectFixture, ItemCollisionMask } from "../collisions";
import { createGameObjectWithFixture, GameObject, GameObjectTypeTree } from "../gameObject";

import { vec2, Vec2, vecSet } from "../juvec";
import { assert } from "../aliasedFunctions";
import { renderSdfSprite, renderTextureSprite } from "../renderer";

import * as AssetIds from "~sdf/sdfAssetsIds";

export interface Tree extends GameObject {
};

export const createTree = (pos: Vec2): Tree => {
    const fixture = createRectFixture(vec2(0.5, 0.5), CollisionCatItem, ItemCollisionMask);
    const tree = createGameObjectWithFixture(GameObjectTypeTree, fixture) as Tree;
    tree.draw = draw;
    vecSet(tree.pos, pos);
    return tree;
};

const draw = (tree: Tree) => {
    renderSdfSprite(AssetIds.Tree, tree.pos[0], 0.0, tree.pos[1], 0, 0);
};

export const castObjAsTree = (obj: GameObject): Tree | null => {
    assert(obj != null);
    return obj.typeId == GameObjectTypeTree ? (obj as Tree) : null;
};