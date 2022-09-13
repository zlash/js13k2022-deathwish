import { Vec2 } from "./juvec";
import { Map } from "./game";
import { assert } from "./aliasedFunctions";
import { levels } from "./levelDefinitions";
import { dataObjectClone } from "./utils";

export interface Level {
    neededKeys: number;
    levelMap: Map,
    startPosition: Vec2;
    housePosition: Vec2;
    availableWishes: number[];
};

export const isLastLevel = (idx: number) => {
    return idx == levels.length - 1;
};

export const getLevel = (idx: number) => {
    assert(idx >= 0 && idx < levels.length);
    const newLevel = dataObjectClone(levels[idx]) as Level;
    newLevel.levelMap.tiles = newLevel.levelMap.tilesStr.split("").map(x => x.charCodeAt(0) - 40);
    return newLevel;
};