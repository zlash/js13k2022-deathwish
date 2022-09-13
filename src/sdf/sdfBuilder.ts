import { assert, Deg } from "../aliasedFunctions";
import { vec3, Vec3 } from "../juvec";
import * as SdfC from "./sdfConstants";
import * as Palette from "../palette";

export interface SdfBuilder {
    buf: Float32Array;
    pos: number;
    id: number;
    sClone: () => SdfBuilder;
    sTranslate: (x: number, y: number, z: number) => SdfBuilder;
    rotateYZ: (angle: number) => SdfBuilder;
    rotateXZ: (angle: number) => SdfBuilder;
    rotateXY: (angle: number) => SdfBuilder;
    materialAlbedo: (albedo: number) => SdfBuilder;
    sJoin: (...b: SdfBuilder[]) => SdfBuilder;
    smoothJoin: (k: number, sdf: SdfBuilder) => SdfBuilder;
    subtract: (sdf: SdfBuilder) => SdfBuilder;
    smoothSubtract: (k: number, sdf: SdfBuilder) => SdfBuilder;
    twistY: (k: number) => SdfBuilder;
    sRound: (k: number) => SdfBuilder;
    displace: (type: number, k: number) => SdfBuilder;
    sScale: (k: number) => SdfBuilder;
    materialTexture: (texId: number, scale: number) => SdfBuilder;
    linearScaleY: (offset: number, k: number) => SdfBuilder;
    materialShadow: () => SdfBuilder;
};

export const sdfCells = 512;

export const createSdf = (id?: number): SdfBuilder => {
    const sdf = {
        pos: 0,
        id: id ?? -1,
        buf: new Float32Array(sdfCells * 4),
    } as SdfBuilder;

    const withNewSdf = (fn: (s: SdfBuilder) => void) => {
        const newSdf = createSdf();
        fn(newSdf);
        pushEnd(newSdf);
        return newSdf;
    };

    sdf.sClone = () => {
        return withNewSdf(newSdf => {
            pushSdf(newSdf, sdf);
        });
    };


    sdf.sTranslate = (x: number, y: number, z: number) => {
        return withNewSdf(newSdf => {
            pushTranslation(newSdf, vec3(x, y, z));
            pushSdf(newSdf, sdf);
            popPosition(newSdf);
        });
    };

    sdf.rotateYZ = (angle: number) => {
        return withNewSdf(newSdf => {
            pushRotationYZ(newSdf, angle);
            pushSdf(newSdf, sdf);
            popPosition(newSdf);
        });
    };

    sdf.rotateXZ = (angle: number) => {
        return withNewSdf(newSdf => {
            pushRotationXZ(newSdf, angle);
            pushSdf(newSdf, sdf);
            popPosition(newSdf);
        });
    };

    sdf.rotateXY = (angle: number) => {
        return withNewSdf(newSdf => {
            pushRotationXY(newSdf, angle);
            pushSdf(newSdf, sdf);
            popPosition(newSdf);
        });
    };

    sdf.materialAlbedo = (albedo: number) => {
        return withNewSdf(newSdf => {
            pushAlbedo(newSdf, albedo);
            pushSdf(newSdf, sdf);
            popMaterial(newSdf);
        });
    };

    sdf.sJoin = (...b: SdfBuilder[]) => {
        return union(sdf, ...b);
    };

    sdf.subtract = (b: SdfBuilder) => {
        return subtract(sdf, b);
    };

    sdf.smoothJoin = (k: number, b: SdfBuilder) => {
        return smoothUnion(k, sdf, b);
    };

    sdf.smoothSubtract = (k: number, b: SdfBuilder) => {
        return withNewSdf(newSdf => {
            pushSdf(newSdf, sdf);
            pushSdf(newSdf, b);
            pushFloat(newSdf, k);
            pushOp(newSdf, SdfC.SmoothSubtract);
        });
    };

    sdf.twistY = (k: number) => {
        return withNewSdf(newSdf => {
            pushTwistY(newSdf, k);
            pushSdf(newSdf, sdf);
            popPosition(newSdf);
        });
    };

    sdf.sRound = (k: number) => {
        return withNewSdf(newSdf => {
            pushSdf(newSdf, sdf);
            pushFloat(newSdf, k);
            pushOp(newSdf, SdfC.Round);
        });
    };

    sdf.displace = (type: number, k: number) => {
        return withNewSdf(newSdf => {
            pushSdf(newSdf, sdf);
            pushFloat(newSdf, k);
            pushFloat(newSdf, type);
            pushOp(newSdf, SdfC.Displace);
        });
    };


    sdf.sScale = (k: number) => {
        return withNewSdf(newSdf => {
            pushFloat(newSdf, k);
            pushOp(newSdf, SdfC.Scale);
            pushSdf(newSdf, sdf);
            popPosition(newSdf);
            pushFloat(newSdf, k);
            pushOp(newSdf, SdfC.PopScale);
        });
    };


    sdf.materialTexture = (texId: number, scale: number) => {
        return withNewSdf(newSdf => {
            pushFloat(newSdf, scale);
            pushFloat(newSdf, texId);
            pushFloat(newSdf, SdfC.MaterialTexture);
            pushOp(newSdf, SdfC.PushMaterial);
            pushSdf(newSdf, sdf);
            popMaterial(newSdf);
        });
    };


    return sdf;
}

const push = (sdf: SdfBuilder, typeId: number, b: number, c: number, d: number) => {
    sdf.buf[sdf.pos++] = typeId;
    sdf.buf[sdf.pos++] = b;
    sdf.buf[sdf.pos++] = c;
    sdf.buf[sdf.pos++] = d;
};

const pushSdf = (sdf: SdfBuilder, src: SdfBuilder) => {
    assert(wellFormedSdf(src));
    const srcArr = src.buf.subarray(0, src.pos - 4);
    sdf.buf.set(srcArr, sdf.pos);
    sdf.pos += srcArr.length;
};

// Add more tests as needed
const wellFormedSdf = (sdf: SdfBuilder) => {
    if (sdf.buf[sdf.pos - 4] != SdfC.VmOp || sdf.buf[sdf.pos - 3] != SdfC.End) {
        return false;
    }
    return true;
};

export const union = (...sdfs: SdfBuilder[]) => {
    const unionSdf = createSdf();
    for (let i = 0; i < sdfs.length; i++) {
        const sdf = sdfs[i];
        pushSdf(unionSdf, sdf);
        if (i != 0) {
            pushUnion(unionSdf, 2);
        }
    }
    pushEnd(unionSdf);
    return unionSdf;
};

export const smoothUnion = (k: number, ...sdfs: SdfBuilder[]) => {
    const unionSdf = createSdf();
    for (let i = 0; i < sdfs.length; i++) {
        const sdf = sdfs[i];
        pushSdf(unionSdf, sdf);
        if (i != 0) {

            pushSmoothUnion(unionSdf, k);
        }
    }
    pushEnd(unionSdf);
    return unionSdf;
}

export const subtract = (a: SdfBuilder, b: SdfBuilder) => {
    const sdf = createSdf();
    pushSdf(sdf, a);
    pushSdf(sdf, b);
    pushSubtraction(sdf);
    pushEnd(sdf);
    return sdf;
};

export const box = (x: number, y: number, z: number) => {
    const sdf = createSdf();
    pushBox(sdf, vec3(x / 2, y / 2, z / 2));
    pushEnd(sdf);
    return sdf;
};

export const guillermo = () => {
    const w = 2;
    const h = 0.02;
    return union(
        box(w, h, h).sTranslate(w / 2, 0, 0).materialAlbedo(Palette.Red),
        box(h, w, h).sTranslate(0, w / 2, 0).materialAlbedo(Palette.Green),
        box(h, h, w).sTranslate(0, 0, w / 2).materialAlbedo(Palette.Blue),
    );
};

export const sdfFloor = () => {
    const s = 10;
    return cube(s).sTranslate(0, -s / 2 - 0.01, 0).materialAlbedo(Palette.DarkGrey);
}

export const cube = (x: number) => {
    return box(x, x, x);
};

// Like a box, height centered on origin
export const cylinder = (height: number, radius: number) => {
    const sdf = createSdf();
    pushCylinder(sdf, height / 2, radius);
    pushEnd(sdf);
    return sdf;
};

export const cone = (height: number, radius: number) => {
    const sdf = createSdf();
    pushCone(sdf, height, radius);
    pushEnd(sdf);
    return sdf;
};

export const sphere = (r: number) => {
    const sdf = createSdf();
    pushSphere(sdf, r);
    pushEnd(sdf);
    return sdf;
};

export const torus = (radius: number, thickness: number) => {
    const sdf = createSdf();
    pushTorus(sdf, radius, thickness);
    pushEnd(sdf);
    return sdf;
};

// TODO: Make this an actual dummy!!!
export const dummy = () => sphere(0.0001);

const pushOp = (sdf: SdfBuilder, op: number) => {
    push(sdf, SdfC.VmOp, op, 0.0, 0.0);
}

const pushVec3 = (sdf: SdfBuilder, vec: Vec3) => {
    push(sdf, SdfC.VmVec, vec[0], vec[1], vec[2]);
}

const pushFloat = (sdf: SdfBuilder, f: number) => {
    push(sdf, SdfC.VmFloat, f, 0, 0);
}

export const pushTranslation = (sdf: SdfBuilder, t: Vec3) => {
    pushVec3(sdf, t);
    pushOp(sdf, SdfC.Translate);
};

export const pushRotationXZ = (sdf: SdfBuilder, aDeg: number) => {
    pushFloat(sdf, aDeg * Deg);
    pushOp(sdf, SdfC.RotationXZ);
}

export const pushRotationYZ = (sdf: SdfBuilder, aDeg: number) => {
    pushFloat(sdf, aDeg * Deg);
    pushOp(sdf, SdfC.RotationYZ);
}

export const pushRotationXY = (sdf: SdfBuilder, aDeg: number) => {
    pushFloat(sdf, aDeg * Deg);
    pushOp(sdf, SdfC.RotationXY);
}

export const pushScale = (sdf: SdfBuilder, s: number) => {
    pushFloat(sdf, s);
    pushOp(sdf, SdfC.Scale);
};

export const popPosition = (sdf: SdfBuilder) => {
    pushOp(sdf, SdfC.PopPosition);
};

export const pushSymX = (sdf: SdfBuilder) => {
    pushOp(sdf, SdfC.SymX);
};

export const pushSymY = (sdf: SdfBuilder) => {
    pushOp(sdf, SdfC.SymY);
};

export const pushSymZ = (sdf: SdfBuilder) => {
    pushOp(sdf, SdfC.SymZ);
};

export const pushTwistY = (sdf: SdfBuilder, k: number) => {
    pushFloat(sdf, k);
    pushOp(sdf, SdfC.TwistY);
};

export const pushBox = (sdf: SdfBuilder, size: Vec3) => {
    pushVec3(sdf, size);
    pushOp(sdf, SdfC.Box);
};

export const pushSphere = (sdf: SdfBuilder, radius: number) => {
    pushFloat(sdf, radius);
    pushOp(sdf, SdfC.Sphere);
};

export const pushCone = (sdf: SdfBuilder, angle: number, height: number) => {
    pushFloat(sdf, height);
    pushFloat(sdf, angle);
    pushOp(sdf, SdfC.Cone);
};

export const pushTorus = (sdf: SdfBuilder, radius: number, thickness: number) => {
    pushFloat(sdf, thickness);
    pushFloat(sdf, radius);
    pushOp(sdf, SdfC.Torus);
};


export const pushCylinder = (sdf: SdfBuilder, height: number, radius: number) => {
    pushFloat(sdf, height);
    pushFloat(sdf, radius);
    pushOp(sdf, SdfC.Cylinder);
};

// TODO: remove size
export const pushUnion = (sdf: SdfBuilder, size: number) => {
    for (let i = 0; i < size - 1; i++) {
        pushOp(sdf, SdfC.Union);
    }
};

export const pushSmoothUnion = (sdf: SdfBuilder, k: number) => {
    pushFloat(sdf, k);
    pushOp(sdf, SdfC.SmoothUnion);
};

export const pushSmoothSubtract = (sdf: SdfBuilder, k: number) => {
    pushFloat(sdf, k);
    pushOp(sdf, SdfC.SmoothSubtract);
};




export const pushSubtraction = (sdf: SdfBuilder) => {
    pushOp(sdf, SdfC.Subtraction);
};


export const pushMaterial = (sdf: SdfBuilder, id: number) => {
    pushFloat(sdf, id);
    pushOp(sdf, SdfC.PushMaterial);
};

export const pushAlbedo = (sdf: SdfBuilder, albedo: number) => {
    pushFloat(sdf, albedo);
    pushFloat(sdf, SdfC.MaterialAlbedo);
    pushOp(sdf, SdfC.PushMaterial);
};

export const popMaterial = (sdf: SdfBuilder) => {
    pushOp(sdf, SdfC.PopMaterial);
};

export const pushEnd = (sdf: SdfBuilder) => {
    pushOp(sdf, SdfC.End);
} 