const palette = [
    ["Black", [25, 25, 25]],
    ["DarkBlue", [29, 43, 83]],
    ["DarkPurple", [126, 37, 83]],
    ["DarkGreen", [0, 135, 81]],
    ["Brown", [171, 82, 54]],
    ["DarkGrey", [95, 87, 79]],
    ["LightGrey", [194, 195, 199]],
    ["White", [255, 241, 232]],
    ["Red", [204, 55, 45]],
    ["Orange", [255, 163, 0]],
    ["Yellow", [255, 236, 39]],
    ["Green", [0, 228, 54]],
    ["Blue", [41, 173, 255]],
    ["Lavender", [131, 118, 156]],
    ["Pink", [255, 119, 168]],
    ["LightPeach", [255, 204, 170]],
];

// Output for typescript

if (process.argv[2] != "sh") {
    const rgbToCssString = (r, g, b) => {
        const nToHex = (n) => n.toString(16).padStart(2, "0");
        return "#" + nToHex(r) + nToHex(g) + nToHex(b);
    };


    for (let i = 0; i < palette.length; ++i) {
        console.log(`export const ${palette[i][0]} = ${i};`);
        console.log(`export const ${palette[i][0]}Css = "${rgbToCssString(...palette[i][1])}";`);
        console.log(`export const ${palette[i][0]}Float = [${palette[i][1].map(x => `${x}/255`).join(",")}];`)
    }

} else {

    // Output for shaders

    console.log(`const vec3 palette[${palette.length}] = vec3[](`);
    console.log(palette.map(x => `vec3(${x[1][0]},${x[1][1]},${x[1][2]})/255.0`).join(`,\n`));
    console.log(`);`);
    console.log(palette.map((x, i) => `#define Palette${x[0]} ${i}`).join("\n"));

}