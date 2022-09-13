import { generateSprite } from "./sdfSprite";
import * as Ids from "./sdfAssetsIds";
import { box, cone, cube, cylinder, dummy, guillermo, SdfBuilder, sdfFloor, smoothUnion, sphere, subtract, torus, union } from "./sdfBuilder";
import { abs, Pi, Rad, sin, TwoPi } from "~aliasedFunctions";
import * as Palette from "../palette";
import { arrayRange, genArrayFromGrid, goldSample, hash, iterateGrid, mapN, minPlusToZeroOne, mix, seedGoldenSampler, zeroOneToMinPlus } from "~utils";


export const sdfTipito = (stand: boolean) =>
    //generateSprite(Ids.TipitoWalk, 0.4, 8, 8, (angle, fk) => {
    generateSprite(stand ? Ids.TipitoStand : Ids.TipitoWalk, 0.8, 12, stand ? 1 : 8, (angle, fk) => {
        const limb = (a: number, b: number, c: number, s: number, col: number) => {
            const feetLength = s * 0.25;
            const limbLength = s * 0.5;
            const limbThick = 0.15;

            const limbPart = (prev: SdfBuilder | null, angle: number, len: number) => {
                return box(limbThick, limbThick, len).sTranslate(0, 0, len / 2)
                    .sJoin((prev || dummy()).sTranslate(0, 0, len))
                    .rotateYZ(angle);
            }


            const feet = limbPart(null, c, feetLength).materialAlbedo(Palette.Brown);

            const firstPart = limbPart(feet, b, limbLength).materialAlbedo(col);

            return limbPart(firstPart, a, limbLength).materialAlbedo(col);
        };

        const hip = union(
            ...mapN(2, (i) => {
                const fkPhase: number = (i == 0 ? fk : -fk) * TwoPi;
                const nA = sin(fkPhase * 1.5);
                const nB = sin(fkPhase);
                const sep = 0.1;
                return limb(
                    stand ? -90 : mix(-130, -50, minPlusToZeroOne(nA)),
                    stand ? 0 : mix(-90, 0, minPlusToZeroOne(nB)),
                    90,
                    1, Palette.Black
                ).sTranslate(i == 0 ? -sep : sep, 0, 0);
            })
        ).materialAlbedo(Palette.Black);

        const arms = union(
            ...mapN(2, (i) => {
                const fkPhase: number = (i == 0 ? -fk : fk) * TwoPi;
                const nA = sin(fkPhase * 1.5);
                const sep = 0.3;
                return limb(
                    stand?-120:mix(-150, -10, minPlusToZeroOne(nA)),
                    90,
                    0,
                    0.7, Palette.White
                ).sTranslate(i == 0 ? -sep : sep, 0, 0);
            })
        ).materialAlbedo(Palette.White).sTranslate(0, 0.8, 0);


        const torsoHeight = 0.9;
        const torso = box(0.45, torsoHeight, 0.15).sTranslate(0, torsoHeight / 2, 0).materialAlbedo(Palette.White);
        const pantsHeight = torsoHeight / 4;
        const torsoDeco = box(0.48, pantsHeight, 0.18)
            .sJoin(box(0.06, torsoHeight / 2, 0.1).sTranslate(0, 0.55, 0.05))
            .sJoin(box(0.1, 0.05, 0.1).sTranslate(0.14, 0.6, 0.05))
            .sTranslate(0, pantsHeight / 2, 0).materialAlbedo(Palette.Black);

        const head = sphere(0.18).sTranslate(0, 1.1, 0).materialAlbedo(Palette.LightPeach);



        const guy = union(
            head,
            torso,
            torsoDeco,
            arms,
            hip,
        );

        return guy.sScale(0.3).rotateXZ(angle);
    });

export const tipitoWalk = () => sdfTipito(false);
export const tipitoStand = () => sdfTipito(true);

export const key = () =>
    generateSprite(Ids.Key, 0, 1, 1, (angle, fk) => {
        const sdf = union(
            cylinder(0.5, 0.05), // stem
            box(0.15, 0.13, 0.05).sTranslate(0.1, -0.15, 0), // Tip
            subtract(
                cylinder(0.1, 0.2),
                cylinder(0.12, 0.1)
            ).rotateYZ(90).sTranslate(0, 0.4, 0), // Head
        ).rotateYZ(20).rotateXZ(15).materialAlbedo(Palette.Yellow);
        return sdf.sScale(0.6);
    });

const sdfGear = (thickness: number, radius: number, nTeeth: number) => {
    const base = cylinder(thickness, radius)
        .sJoin(cylinder(thickness * 1.5, radius * 0.4)); // Coso del medio

    const diskAndHole = base.subtract(cylinder(thickness * 2, radius * 0.2));

    const teethLength = 0.38;


    const teeth = union(
        ...mapN(nTeeth, (_, k) => {
            return box(teethLength, thickness, thickness)
                .sTranslate(radius * 1.06, 0, 0).rotateXZ(k * 360);
        })
    );

    return diskAndHole.sJoin(teeth).sRound(0.02);
};

export const menuGear = () =>
    generateSprite(Ids.MenuGear, 1, 1, 8, (angle, fk) => {
        const thickness = 0.3;
        const radius = 1;
        const nTeeth = 13;

        const gear = sdfGear(thickness, radius, nTeeth);

        const sdf = gear.sScale(1.4).rotateXZ(fk * 360 / nTeeth).rotateXY(90).rotateXZ(-12);

        return sdf.materialAlbedo(Palette.Yellow);
    });

export const spikes = () =>
    generateSprite(Ids.Spikes, 0, 1, 4, (angle, fk) => {
        const size = 0.2;
        const height = 0.3;
        const spikesPerLength = 3;
        const unit = 1.1 / spikesPerLength;

        const doSpike = () => {
            const spikeH = 0.5;
            const spikeR = 0.02;
            return cylinder(spikeH, spikeR).sJoin(
                cone(0.26, 0.1).sTranslate(0, spikeH / 2 + 0.1, 0)
            );
        };

        const gridSize = 4;
        const gridUnit = 1 / gridSize;
        const spikes = union(
            ...genArrayFromGrid(gridSize, gridSize, (x, y) => {
                const r = hash(x + 50 * fk, y + 50 * fk);
                const bloodStainOfTheNight = cylinder(0.01, r / 5).sTranslate(0, -0.4, 0).materialAlbedo(Palette.Red);
                return doSpike()
                    .rotateYZ(zeroOneToMinPlus(r) * 40)
                    .rotateXZ(zeroOneToMinPlus(r) * 40)
                    .sJoin(bloodStainOfTheNight)
                    .sTranslate(x * gridUnit - 0.5, 0.25, y * gridUnit - 0.5);
            })
        );
        return spikes.materialAlbedo(Palette.White);
    });


export const redBall = () =>
    generateSprite(Ids.RedBall, 0, 1, 1, (angle, fk) => {
        return sphere(1.0).materialAlbedo(Palette.Red);
    });

export const blueBall = () =>
    generateSprite(Ids.BlueBall, 0, 1, 1, (angle, fk) => {
        return sphere(1.0).materialAlbedo(Palette.Blue);
    });

export const infinity = () =>
    generateSprite(Ids.Infinity, 0, 1, 1, (angle, fk) => {
        const thickness = 0.1;
        const r = 0.2;
        const sep = r * 1.15;
        const ring = cylinder(thickness, r).subtract(cylinder(thickness * 2, r * 0.5));
        const both = smoothUnion(0.2, ...mapN(2, (i) => ring.sTranslate(i == 0 ? -sep : sep, 0, 0)));
        return both.sScale(0.6).rotateYZ(90).rotateXZ(45).materialAlbedo(Palette.Lavender);
    });

export const patito = () =>
    generateSprite(Ids.Patito, 1, 1, 8, (angle, fk) => {
        const r = 0.4;
        const neckH = 0.25;
        const beak = box(0.2, 0.002, 0.15).sRound(0.05).sTranslate(0.2, 0, 0).materialAlbedo(Palette.Orange);
        const head = sphere(0.18).sJoin(beak).sTranslate(0, 0.2, 0);

        const eye = sphere(0.05).materialAlbedo(Palette.White).sJoin(sphere(0.02).sTranslate(0.08, 0.01, 0).materialAlbedo(Palette.Black))
            .sTranslate(0.12, 0.3, 0);

        const sep = 0.08;

        const wholeHead = union(
            cylinder(neckH, 0.08).smoothJoin(0.1, head),
            eye.sTranslate(0, 0, sep),
            eye.sTranslate(0, 0, -sep),
        );

        const ring = torus(r, 0.11)
            .smoothJoin(0.1, wholeHead.sTranslate(r, neckH, 0)).materialAlbedo(Palette.Yellow);
        return ring.sScale(0.5).rotateXZ(10 * sin(fk * TwoPi));
    });

const tilesBump = 0.51 / 0.5;

export const waterTile = () =>
    generateSprite(Ids.WaterTile, 2, 1, 18, (angle, fk) => {
        return cube(1.0)
            .displace(0, fk * 2 * Pi)
            .sScale(tilesBump)
            .sTranslate(0, -0.2, 0)
            .materialAlbedo(Palette.Blue);
    });

export const floorTile = () =>
    generateSprite(Ids.FloorTile, 0, 4, 2, (angle, fk) => {

        const fh = 0.8;
        const h = 0.1;
        const bs = 0.97;
        const gridSz = 5;
        const gridUnit = bs / gridSz;

        const doBrick = (x: number, y: number, tw: number, th: number) => {
            const fitScale = 0.85;
            const curW = tw * bs / gridSz;
            const curH = th * bs / gridSz;
            return box(fitScale * curW, h, fitScale * curH).sRound(0.04).sTranslate((curW - bs) / 2 + x * gridUnit, 0, (curH - bs) / 2 + y * gridUnit);
        };

        const bricks =
            union(
                doBrick(0, 0, 2, 3),
                doBrick(0, 3, 2, 2),
                doBrick(2, 2.1, 1, 3),
                doBrick(2, 0, 3, 2).sTranslate(0, fk < 0.5 ? 0 : -h / 2, 0),
                doBrick(3, 2, 2, 2),
                doBrick(3, 4, 2, 1),
            ).materialAlbedo(Palette.LightGrey);

        const floor = box(1.0, fh, 1.0).materialAlbedo(Palette.DarkGrey)
            .sJoin(bricks.sTranslate(0, (fh + h) / 2, 0));

        return floor.rotateXZ(angle).sScale(tilesBump);
    });

const pillarSwitchParam = (id: number, color: number) =>
    generateSprite(id, 1, 1, 2, (angle, fk) => {
        const h = 0.08;
        const r = 0.2;
        const tile = box(0.8, 0.04, 0.8).sRound(0.05);
        return union(
            tile.materialAlbedo(Palette.White),
            tile.sScale(0.8).sTranslate(0, 0.08 - fk * 0.05, 0).materialAlbedo(fk == 0 ? color : Palette.DarkGrey),
        ).sTranslate(0, h / 2, 0);
    });

export const pillarsSwitch = () => pillarSwitchParam(Ids.PillarsSwitch, Palette.DarkPurple);
export const wheelSwitch = () => pillarSwitchParam(Ids.WheelSwitch, Palette.Orange);


export const pillar = () =>
    generateSprite(Ids.Pillar, 1, 1, 12, (angle, fk) => {
        const curH = 1.5;
        const mainBox = box(0.9, 1.5, 0.9).sRound(0.08).materialAlbedo(Palette.Lavender);

        const frame = mainBox;

        const turn = 5 * 360 * fk;
        const ratio = 0.8;
        const gearWall = sdfGear(0.3, 1, 13).rotateXZ(turn).sJoin(
            sdfGear(0.3, 1, 13).rotateXZ(-turn / ratio).sScale(ratio).sTranslate(-1.5, 0, 0)
        ).materialAlbedo(Palette.Yellow)
            .rotateYZ(90)
            .sScale(0.2)

        return frame.sTranslate(0, -curH / 2 + curH * fk + 0.1, 0)
            .sJoin(gearWall.sTranslate(0.2, mix(-0.1, 0.28, fk), 0.6))
            .subtract(cube(5).sTranslate(0, -2.5, 0));
    });

export const house = () =>
    generateSprite(Ids.House, 0, 1, 1, (angle, fk) => {
        const roof = box(1, 0.2, 1).rotateXY(15).materialAlbedo(Palette.Red);
        const bh = 0.8;
        const chimmeney = box(0.2, 0.4, 0.2).materialAlbedo(Palette.White).sJoin(
            box(0.25, 0.1, 0.25).materialAlbedo(Palette.DarkGrey).sTranslate(0, 0.3, 0)
        );
        const door = box(0.18, 0.4, 0.02).materialAlbedo(Palette.Brown);
        const body = box(0.8, bh, 0.8).sTranslate(0, bh / 2, 0).materialAlbedo(Palette.White);
        return union(
            body,
            roof.sTranslate(0, 0.9, 0),
            chimmeney.sTranslate(0.2, 1, -0.2),
            door.sTranslate(-0.15, 0.2, 0.4),
        );
    });

export const topHat = () =>
    generateSprite(Ids.TopHat, 0, 1, 1, (angle, fk) => {
        const h = 0.2;
        const bandH = h * 0.35;
        const r = 0.1;
        const top = cylinder(h, r).sTranslate(0, h / 2, 0);
        const topWithFringe = top.sJoin(cylinder(0.01, r * 1.5)).materialAlbedo(Palette.Black);
        const hat = topWithFringe.sJoin(cylinder(bandH, r * 1.02).sTranslate(0, bandH / 2, 0).materialAlbedo(Palette.White));
        return hat;
    });

export const dirtTile = () =>
    generateSprite(Ids.DirtTile, 0, 1, 1, (angle, fk) => {
        const nr = 4;
        const ridges = union(
            ...mapN(nr, (_, k) => cylinder(1, 0.8 / nr).rotateYZ(90).sTranslate(k * 0.95 - 0.5 + 0.1, 0.4, 0))
        ).sRound(0.05).sScale(0.86);
        return cube(1.0).sJoin(ridges).sScale(tilesBump).materialAlbedo(Palette.Brown);
    });

export const liquidTipito = () =>
    generateSprite(Ids.LiquidTipito, 0, 1, 1, (angle, fk) => {
        return cylinder(0.05, 0.25).materialAlbedo(Palette.Blue);
    });

export const tree = () =>
    generateSprite(Ids.Tree, 0, 1, 1, (angle, fk) => {
        const treeTrunkH = 0.6;
        const treeTrunkR = 0.06;
        const trunk = cylinder(treeTrunkH, treeTrunkR).sTranslate(0, treeTrunkH / 2, 0).materialAlbedo(Palette.Brown);



        const leaves = sphere(0.3).sTranslate(0, treeTrunkH, 0).materialAlbedo(Palette.Green);
        return union(trunk, leaves.displace(0,1));
    });

import { WheelRadius } from "../objects/wheel";
import { TextureCheckers as TextureStone } from "./sdfConstants";

export const wheel = () =>
    generateSprite(Ids.Wheel, 1, 1, 12, (angle, fk) => {
        const h = 0.4;
        const sdf = cylinder(h, WheelRadius).subtract(box(WheelRadius * 0.6, h * 2, WheelRadius * 0.6))
            .rotateXZ(360 * fk)
            .rotateYZ(90)
            .sTranslate(0, WheelRadius / 2, 0)
            .materialAlbedo(Palette.LightGrey);
        return sdf;
    });

export const wall = () =>
    generateSprite(Ids.Wall, 0, 1, 1, (angle, fk) => {
        return box(1, 0.5, 1).sScale(tilesBump).sTranslate(0, 0.25, 0).materialAlbedo(Palette.DarkGrey);
    });

export const tallWall = () =>
    generateSprite(Ids.TallWall, 0, 1, 1, (angle, fk) => {
        const h = 2;
        const wall = box(1, h, 1).sScale(tilesBump).sTranslate(0, h / 2, 0).materialAlbedo(Palette.DarkGrey);
        return wall;
    });


export const bars = () =>
    generateSprite(Ids.Bars, 0, 1, 2, (angle, fk) => {
        const h = 1;
        const post = cylinder(h, 0.03).materialAlbedo(Palette.DarkGrey);
        const board = cylinder(0.06, 0.15)
            .sJoin(fk ? dummy() : box(0.2, 0.12, 0.05))
            .materialAlbedo(Palette.White)
            .sJoin(cylinder(0.08, 0.12).materialAlbedo(fk ? Palette.Green : Palette.Red))
            .rotateYZ(90);

        const sign = union(post,
            ...mapN(2, i => board.rotateXZ(i * 90).sTranslate(0, 0.3 - 0.45 * i, 0)))
            .sTranslate(0, h / 2, 0);
        return sign;
    });

export const door = () =>
    generateSprite(Ids.Door, 1, 1, 8, (angle, fk) => {
        const dintelHeight = 1.5;
        const dintelWidth = 0.7;
        const dintelThick = 0.1;

        const doorMargin = 0.1;
        const doorWidth = dintelWidth - doorMargin;
        const doorHeight = dintelHeight - doorMargin;
        const doorThick = dintelThick / 2;


        const dintel = box(dintelWidth, dintelHeight, dintelThick)
            .subtract(box(doorWidth, 0.3, 0.3).sTranslate(0, -dintelHeight / 2, 0))
            .materialAlbedo(Palette.Brown);


        const door = box(doorWidth, doorHeight, doorThick)
            .materialAlbedo(Palette.White).sJoin(
                sphere(0.08).sTranslate(0.16, 0, 0).materialAlbedo(Palette.Yellow)
            );

        const animDoor = door
            .sTranslate(doorWidth / 2, 0 - doorMargin / 2, doorThick / 2)
            .rotateXZ(-120 * fk)
            .sTranslate(-doorWidth / 2, 0, 0)

        const fullDoor = dintel.subtract(box(doorWidth, doorHeight, 1))
            .sJoin(animDoor);

        const bg = box(dintelWidth * 0.9, dintelHeight, dintelThick / 2.5).sTranslate(0, -0.05, -0.05).materialAlbedo(Palette.Black);

        return fullDoor.sJoin(bg).sScale(0.8).sTranslate(0, dintelHeight / 2, 0);
    });

export const wallWoodDeco = () =>
    generateSprite(Ids.WallWoodDeco, 0, 2, 3, (angle, fk, fn) => {
        const h = 1;
        const r = 0.06;
        const column = box(r, h, r).sJoin(cube(0.12).sTranslate(0, -h / 2, 0)).sTranslate(0, h / 2, 0);

        let plank: any = box(0.01, 0.1, 1.2).rotateYZ(fn == 0 ? 40 : -20).sTranslate(0, 0.5, 0);

        if (fn == 2) {
            plank = plank.sJoin(box(0.01, 0.1, 1.2).rotateYZ(30).sTranslate(0, 0.5, 0));
        }

        const baseboard = box(0.06, 0.06, 1.0);
        return union(
            column.sTranslate(0, 0, 0.5),
            column.sTranslate(0, 0, -0.5),
            baseboard,
            baseboard.sTranslate(0, 1, 0),
            plank,
        ).rotateXZ(angle / 2).materialAlbedo(Palette.Brown);
    });

export const lock = () =>
    generateSprite(Ids.Lock, 0, 1, 1, (angle, fk) => {
        const slider = torus(0.2, 0.05).materialAlbedo(Palette.DarkGrey);
        const body = box(0.6, 0.1, 0.4).sRound(0.05).sTranslate(0, 0, 0.35).materialAlbedo(Palette.Yellow);
        return body.sJoin(slider).rotateYZ(-80);
    });

export const skullSdf = (fk: number) => {
    const base = sphere(1);//.smoothJoin(0.6, sphere(0.8).translate(0, 0.6, -0.6));

    const eyeSize = 0.14;
    const eyeSep = 0.48;
    const oneEye = box(eyeSize, eyeSize * 0.1, 0.1).sRound(0.25);
    const eyes = oneEye.sTranslate(-eyeSep, 0, 0).sJoin(
        oneEye.sTranslate(eyeSep, 0, 0)
    );

    const craneum = base.smoothSubtract(0.1, eyes.sTranslate(0, -0.2, 0.8));

    const upperMouthBase = cylinder(0.35, 0.45).sRound(0.1);

    const teeth = union(
        ...mapN(10, (i, k) => {
            const mk = zeroOneToMinPlus(k + 0.5 / 10);
            const amk = abs(mk);
            const th: number = abs(i - 5) == 3 ? 0.15 : 0.1;
            return cylinder(th, 0.02).sRound(0.05).sTranslate(0, 0, 1).rotateXZ(mk * 35).sTranslate(-mk * 0.2, 0, -amk * 0.12);
        })
    );

    const upperMouth = upperMouthBase.sJoin(teeth.sTranslate(0, -0.35, -0.45));
    const jawbone = box(0.1, 1.0, 0.16).rotateYZ(30).sTranslate(0, -1, -0);
    const jawSep = 0.5;
    const lowerMouth = upperMouth.rotateXY(180).sTranslate(0, -1.7, 0.35).smoothJoin(0.2,
        union(
            jawbone.sTranslate(-jawSep, 0, 0),
            jawbone.sTranslate(jawSep, 0, 0)
        )
    );

    const nose = box(0.03, 0.12, 0.12).sRound(0.1);
    const noseSep = 0.06;

    //const craneum = craneumBase.smoothSubtract(0.0, sphere(0.1).translate(0, 0, 0.5));

    const lowerAngle = -30 * fk;

    const skullTop = craneum.subtract(sphere(0.85))
        .smoothJoin(0.1, upperMouth.sTranslate(0, -0.8, 0.3))
        .smoothSubtract(0.1, union(
            nose.rotateXY(14).sTranslate(-noseSep, 0, 0),
            nose.rotateXY(-14).sTranslate(noseSep, 0, 0),
        ).sTranslate(0, -0.7, 0.8));

    const skull = union(
        skullTop,
        lowerMouth.rotateYZ(lowerAngle),
    );

    return skull.materialAlbedo(Palette.White);
};

export const skull = () =>
    generateSprite(Ids.Skull, 1, 1, 5, (angle, fk) => {
        return skullSdf(fk).rotateYZ(15).sTranslate(0, 0.5, 0);
    });

export const inGameSkull = () =>
    generateSprite(Ids.InGameSkull, 1, 1, 1, (angle, fk) => {
        return skullSdf(0.5).rotateYZ(30).sScale(0.5);
    });

export const carpet = () =>
    generateSprite(Ids.Carpet, 0, 1, 3, (angle, fk, fn) => {
        let block = cube(1).sScale(tilesBump).materialAlbedo(Palette.Red);
        if (fn != 1) {
            block = block.sJoin(box(0.1, 0.1, 1).sTranslate((fn == 0 ? -1 : 1) * 0.3, 0.5, 0).materialAlbedo(Palette.Yellow))
        }
        return block;
    });

export const tubisor = () =>
    generateSprite(Ids.Tubisor, 0, 1, 1, (angle, fk) => {
        const cW = 3.5;
        const cR = 0.62;
        return cylinder(cW, cR)
            .subtract(box(cR * 1.2, cW * 0.8, cR).sTranslate(0, 0, cR))
            .sJoin(cylinder(cW * 0.9, cR * 0.9).materialAlbedo(Palette.White))
            .rotateXY(90)
            .materialAlbedo(Palette.Red);
    });

/*
export const twistBaseColumn = () =>
generateSprite(Ids.TwistBaseColumn, 0, 1, 1, (angle, fk) => {
    const h = 3.8;
    const main = cylinder(h, 0.6);
    return main.materialAlbedo(Palette.White);
});
*/

export const buildSdfAssets = () => {
    return [
        tipitoWalk,
        key,
        spikes,
        redBall,
        blueBall,
        infinity,
        patito,
        waterTile,
        pillarsSwitch,
        pillar,
        house,
        topHat,
        dirtTile,
        liquidTipito,
        tree,
        wheel,
        wall,
        bars,
        door,
        tallWall,
        wallWoodDeco,
        wheelSwitch,
        carpet,
        inGameSkull,
        floorTile,
        tipitoStand,

        menuGear,
        lock,
        skull,
        tubisor,
    ];

};