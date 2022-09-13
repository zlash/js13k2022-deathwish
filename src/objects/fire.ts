import { addParticleSystem, goalIsOpen, state } from "../game";
import { CollisionCatItem, createCircleFixture, ItemCollisionMask } from "../collisions";
import { createGameObjectWithFixture, GameObject, GameObjectTypeFire } from "../gameObject";

import * as SdfIds from "../sdf/sdfIds";
import { Vec2, vec3, vec3Splay, Vec4, vecAdd, vecMulK, vecNormalizeSafe, vecSet } from "../juvec";
import { popColor, pushColor, renderTextureSprite } from "../renderer";
import { SvgTextureFbmParticle } from "~svgTextures";
import { randomRange } from "~aliasedFunctions";
import { smoothstep, smoothstepMix } from "~utils";

export interface Fire extends GameObject {
};

export const createFirePS = (pos: Vec2, rate: number, r: number, color?: Vec4) => {
    const vecTmp = vec3Splay(0);
    return {
        count: 200,
        rate: rate,
        max: -1,
        spawn: () => {
            const pPos = vec3(pos[0] + randomRange(-r, r), 0.1, pos[1] + randomRange(-r, r));
            const v = vec3(0, randomRange(0.8, 1.2), 0);
            return {
                v,
                pos: pPos,
                lifetime: 1,
                s: randomRange(0.05, 0.08),
            };
        },
        update: (p: any, dt: number) => {
            const v = vecMulK(p.v, dt, vecTmp);
            vecAdd(p.pos, v, p.pos);
            p.lifetime -= dt;
            return p.lifetime > 0;
        },
        draw: (p: any) => {
            const invLk = p.lifetime;
            const lk = 1.0 - invLk;
            const alphaRamp = invLk;
            const r = smoothstepMix(1.0, 0.87, lk) * alphaRamp;
            const g = smoothstepMix(0.89, 0.05, lk) * alphaRamp;
            const b = 0;//smoothstep(0.0, 0.0, lk) * alphaRamp;
            pushColor(color || [r, g, b, alphaRamp * 0.6]);
            renderTextureSprite(p.pos[0], p.pos[1], p.pos[2], 0, p.s);
            popColor();
        },
    };
};

export const createFire = (pos: Vec2): Fire => {
    const fixture = createCircleFixture(0.51, CollisionCatItem, ItemCollisionMask);
    const fire = createGameObjectWithFixture(GameObjectTypeFire, fixture) as Fire;
    vecSet(fire.pos, pos);

    // Spawn PS

    const ps = createFirePS(pos, 3, 0.5);

    addParticleSystem(ps);
    fire.onKill = () => {
        ps.max = 0;
    }

    return fire;
};


