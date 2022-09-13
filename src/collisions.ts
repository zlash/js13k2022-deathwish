import { assert } from "~aliasedFunctions";
import { rectCircleCollision, rectRectCollision } from "~geom";
import { GameObject } from "./gameObject";
import { vec2, Vec2, vec2Splay, vecAdd, vecLength, vecMulK, vecSub, zeroVector } from "./juvec";

export const ShapeCircle = 0;
export const ShapeRect = 1;

export const CollisionCatSolid = 0x01;
export const CollisionCatPlayer = 0x02;
export const CollisionCatHazard = 0x04;
export const CollisionCatItem = 0x08;

export const ItemCollisionMask = CollisionCatPlayer;

export interface CollisionFixture {
    typeId: number;
    radius: Vec2;
    offset: Vec2;
    collisionCategory: number,
    collisionMask: number,
    parent?: GameObject;
};

export const createCircleFixture = (radius: number, collisionCategory: number, collisionMask: number): CollisionFixture => {
    return {
        typeId: ShapeCircle,
        radius: vec2Splay(radius),
        offset: vec2Splay(0),
        collisionCategory,
        collisionMask,
    };
};

export const createRectFixture = (radius: Vec2, collisionCategory: number, collisionMask: number): CollisionFixture => {
    return {
        typeId: ShapeRect,
        radius,
        offset: vec2Splay(0),
        collisionCategory,
        collisionMask,
    };
};

export const shapeShapeCollision = (posA: Vec2, shapeA: number, ra: Vec2, posB: Vec2, shapeB: number, rb: Vec2) => {
    if (shapeA == ShapeCircle && shapeB == ShapeCircle) {
        const v = vecSub(posB, posA, vec2Splay(0));
        const vLen = vecLength(v);
        const rSum = ra[0] + rb[0];
        if (vLen < rSum) {
            vecMulK(v, -(rSum - vLen) / vLen, v);
            return v;
        }
    } else if ((shapeA == ShapeCircle && shapeB == ShapeRect)
        || (shapeA == ShapeRect && shapeB == ShapeCircle)) {

        // Circle first
        let vSign = 1;
        if (shapeA == ShapeRect) {
            {
                const tmp = posA;
                posA = posB;
                posB = tmp;
            }
            {
                const tmp = ra;
                ra = rb;
                rb = tmp;
            }
            vSign = -1;
        }

        // Todo: FIX * CIRCLE * COLLISIONENERNTIRESTNIRET!!
        const tla = vecSub(posB, rb, vec2Splay(0));
        const rectSize = vecMulK(rb, 2, vec2Splay(0));
        const vOut = vec2Splay(0);
        const hit = rectCircleCollision(tla, rectSize, posA, ra[0], vOut);
        if (hit) {
            vecMulK(vOut, vSign, vOut);
            return vOut;
        }
    } else if (shapeA == ShapeRect && shapeB == ShapeRect) {
        const tlA = vecSub(posA, ra, vec2Splay(0));
        const szA = vecMulK(ra, 2, vec2Splay(0));
        const tlB = vecSub(posB, rb, vec2Splay(0));
        const szB = vecMulK(rb, 2, vec2Splay(0));
        const vOut = vec2Splay(0);
        const hit = rectRectCollision(tlA, szA, tlB, szB, vOut);
        if (hit) {
            return vOut;
        }
    } else {
        assert(false, `Undefined shape shape! ${shapeA} ${shapeB}`);
    }
    return null;
};

export const getFixturePos = (f: CollisionFixture, pos: Vec2) => {
    assert(f.parent != null);
    return vecAdd(f.offset, (f.parent as any).pos, vec2Splay(0));
};

const resolveCollision = (a: CollisionFixture, b: CollisionFixture) => {
    assert(a.parent != null);
    assert(b.parent != null);

    const aObj = a.parent as GameObject;
    const bObj = b.parent as GameObject;

    const aPos = getFixturePos(a, aObj.pos);
    const bPos = getFixturePos(b, bObj.pos);

    const v = shapeShapeCollision(aPos, a.typeId, a.radius, bPos, b.typeId, b.radius);

    if (v) {
        if (a.collisionMask & b.collisionCategory) {
            aObj.handleCollision?.(a, b, v);
        }
        vecMulK(v, -1, v);
        if (b.collisionMask & a.collisionCategory) {
            bObj.handleCollision?.(b, a, v);
        }
    }
};

// Who needs a single array with all the fixtures?
export const doCollisions = (objs: GameObject[]) => {
    // Who needs spactial hashing anyway?
    for (let a = 0; a < objs.length; ++a) {
        for (let b = a + 1; b < objs.length; ++b) {
            const objA = objs[a];
            const objB = objs[b];
            if (objA.toDelete || objB.toDelete) continue;

            // THIS * IS * MADNESSSS!!!!
            for (let fA of objA.fixtures) {
                for (let fB of objB.fixtures) {
                    if ((fA.collisionMask & fB.collisionCategory)
                        || (fB.collisionMask & fA.collisionCategory)) {
                        resolveCollision(fA, fB);
                    }
                }
            }
        }
    }
};

// Someday we'll have spatial hashing... whatever
export const objectsAtShape = (objs: GameObject[], shape: number, pos: Vec2, r: Vec2) => {
    const result = [] as GameObject[];
    for (let obj of objs) {
        for (let fx of obj.fixtures) {
            const fxPos = getFixturePos(fx, obj.pos);
            const v = shapeShapeCollision(fxPos, fx.typeId, fx.radius, pos, shape, r);
            if (v) {
                result.push(obj);
                break;
            }
        }
    }
    return result;
};