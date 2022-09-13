const fs = require('fs');

function readFileAsync(fn) {
    return new Promise((resolve, reject) => {
        fs.readFile(fn, 'utf8', (err, data) => {
            if (err) {
                reject(er);
            } else {
                resolve(data);
            }
        });
    });
}

function trimWhitespace(str) {
    return str.replace(/^\s*(.*?)\s*$/, "$1");
}


const stupidMe = {
    "MapTiles.Empty": 0,
    "MapTiles.Block": 1,
    "MapTiles.Goal": 2,
    "MapTiles.Key": 3,
    "MapTiles.Wall": 4,
    "MapTiles.Spikes": 5,
    "MapTiles.Water": 6,
    "MapTiles.Start": 7,
    "MapTiles.House": 8,
    "MapTiles.Toggle": 9,
    "MapTiles.ToggleableA": 10,
    "MapTiles.ToggleableB": 11,
    "MapTiles.Fire": 12,
    "MapTiles.FertileEarth": 13,
    "MapTiles.Tree": 14,
    "MapTiles.WheelSwitch": 15,
    "MapTiles.Wheel": 16,
    "MapTiles.TallBlock": 17,

    "MapTiles.CarpetLeft": 18,
    "MapTiles.CarpetCenter": 19,
    "MapTiles.CarpetRight": 20,
    "MapTiles.Skull": 21,
};

const codepointsMap = {
    "⚫": "MapTiles.Empty",
    "🟥": "MapTiles.Block",
    "🚪": "MapTiles.Goal",
    "🔑": "MapTiles.Key",
    "🟫": "MapTiles.Wall",
    "📌": "MapTiles.Spikes",
    "🌊": "MapTiles.Water",
    "🕺": "MapTiles.Start",
    "🏠": "MapTiles.House",
    "💈": "MapTiles.Toggle",
    "🔳": "MapTiles.ToggleableA",
    "🔲": "MapTiles.ToggleableB",
    "🔥": "MapTiles.Fire",
    "🌰": "MapTiles.FertileEarth",
    "🌲": "MapTiles.Tree",
    "🧇": "MapTiles.WheelSwitch",
    "⚪": "MapTiles.Wheel",
    "📱": "MapTiles.TallBlock",
    "🈹": "MapTiles.CarpetLeft",
    "🈚": "MapTiles.CarpetCenter",
    "🈲": "MapTiles.CarpetRight",
    "💀": "MapTiles.Skull",
};


async function run() {
    const fileContents = "" + await readFileAsync(process.argv[2]);

    const levels = [];
    let level = null;

    for (let line of fileContents.split("\n").map(x => trimWhitespace(x)).filter(x => x != "" && x[0] != "#")) {
        const codepoints = [...line];
        if (codepoints[0] == "🆕") {
            if (level != null) levels.push(level);
            level = {
                rawRows: [],
            };
        } else {
            if (level != null) {
                level.rawRows.push(codepoints);
            }
        }
    }
    if (level != null) levels.push(level);

    // Process levels
    for (let level of levels) {
        const w = level.rawRows.reduce((prev, cur) => cur.length > prev ? cur.length : prev, -1);
        level.width = w + 2;
        level.numKeys = level.rawRows.reduce((_p, _c) => _p + _c.reduce((prev, cur) => prev + (cur == "🔑" ? 1 : 0), 0), 0);
        level.rawRows = [Array(w).fill("🟥"), ...level.rawRows, Array(w).fill("🟥")];
        level.rawRows = level.rawRows.map(x => ["🟥", ...x, "🟥"]);
        level.height = level.rawRows.length;

        level.startPosition = [1, 1];
        level.housePosition = [-1, -1];

        const availWishes = new Set();
        availWishes.add("Wish.Immortality");

        for (let y = 0; y < level.height; ++y) {
            for (let x = 0; x < level.width; ++x) {
                if (level.rawRows[y][x] == "🕺") {
                    level.startPosition = [x, y];
                }
                if (level.rawRows[y][x] == "🏠") {
                    level.housePosition = [x, y];
                    availWishes.add("Wish.OwnAHouse");
                }
                if (level.rawRows[y][x] == "🌊") {
                    availWishes.add("Wish.CanSwim");
                }
                if (level.rawRows[y][x] == "🟫") {
                    availWishes.add("Wish.GoThroughWalls");
                }
                if (level.rawRows[y][x] == "🔥" || level.rawRows[y][x] == "🌰" || level.rawRows[y][x] == "🌲") {
                    availWishes.add("Wish.Liquid");
                }

            }
        }

        level.availWishes = Array.from(availWishes);

    }

    const toVec2 = x => `vec2(${x[0]}, ${x[1]})`;

    console.log(`
////////////////////////////////////////////    
// This file is autogenerated! ALL EDITS WILL BE LOST!!    
////////////////////////////////////////////////////////////
import { vec2 } from "./juvec";
import { Level } from "./level";
import { Map } from "./game";
import * as Wish from "./wishes";
import * as MapTiles from "./mapTileConstants";

export const levels: Level[] = [
${levels.map(l => {

        //    const tiles = l.rawRows.map(r => r.map(x => String.fromCharCode(65 + stupidMe[codepointsMap[x] ?? "MapTiles.Empty"])).join("")).join("");

        const tiles = [].concat(...l.rawRows.map(r => r.map(x => stupidMe[codepointsMap[x] ?? "MapTiles.Empty"])));

        // Range: 93 (From 32)

        const biggestTile = 21;
        const repeatAmmount = 93 - biggestTile;

        const rleTiles = [];

        for (let t of tiles) {

            if (rleTiles.length != 0) {
                // Prev matched
                if (rleTiles[rleTiles.length - 1] > biggestTile
                    && rleTiles[rleTiles.length - 2] == t) {
                    rleTiles[rleTiles.length - 1]++;
                } else if (rleTiles[rleTiles.length - 1] == t) {
                    rleTiles.push(biggestTile + 1);
                } else {
                    rleTiles.push(t);
                }
            } else {
                rleTiles.push(t);
            }
        }


//        console.log(rleTiles);


        tilesStr = tiles.map(x => String.fromCharCode(40 + x)).join("");
        return `   {
        neededKeys: ${l.numKeys},
        startPosition: ${toVec2(l.startPosition)},
        housePosition: ${toVec2(l.housePosition)},
        availableWishes: [${l.availWishes.join(",")}],
        ${l.wheelRespawnPosition ? `wheelRespawnPosition: ${toVec2(l.wheelRespawnPosition)},` : ""}
        levelMap: {            
            sz: vec2(${l.width}, ${l.height}),
            tilesStr: "${tilesStr}"
        } as Map
    }`;
    }).join(",\n")}
];
    `);
}

run();
