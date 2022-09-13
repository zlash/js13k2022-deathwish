import { CollisionCatHazard, CollisionCatSolid, CollisionFixture } from "./collisions";
import { Vec2, vec2Splay } from "./juvec";

type GameObjectType = number;

export const GameObjectTypePlayer = 0;
export const GameObjectTypeKey = 1;
export const GameObjectTypeGoalDoor = 2;
export const GameObjectTypeToggle = 3;
export const GameObjectTypeFire = 4;
export const GameObjectTypeTree = 5;
export const GameObjectTypeWheel = 6;
export const GameObjectTypePillar = 7;
export const GameObjectTypeSkull = 8;

export const MsgStartWheel = 1;
export const MsgTogglePillars = 2;

export interface GameObject {
    typeId: GameObjectType;
    pos: Vec2;
    toDelete: boolean;
    fixtures: CollisionFixture[];

    // Any to allow callbacks to use their types 
    tick?: (obj: any, dts: number) => void;
    draw?: (obj: any) => void;
    handleCollision?: (a: CollisionFixture, b: CollisionFixture, v: Vec2) => void;
    handleMessage?: (obj: any, msg: number) => void;
    onKill?: (obj: any) => void;
};

export const createGameObject = (typeId: GameObjectType): GameObject => {
    const obj: GameObject = {
        pos: vec2Splay(0),
        typeId,
        fixtures: [],
        toDelete: false,
    };
    return obj;
};

export const createGameObjectWithFixture = (typeId: GameObjectType, fixture: CollisionFixture): GameObject => {
    const obj = createGameObject(typeId);
    addFixture(obj, fixture);
    return obj;
};

export const addFixture = (obj: GameObject, fixture: CollisionFixture) => {
    obj.fixtures.push(fixture);
    fixture.parent = obj;
};

export const objUsuallySolid = (obj: GameObject) => {
    return obj.typeId == GameObjectTypeWheel || obj.typeId == GameObjectTypeTree;
};