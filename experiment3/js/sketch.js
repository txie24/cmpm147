/* exported preload, setup, draw, placeTile */

/* global generateGrid drawGrid */

let seed = 0;
let tilesetImage;
let currentGrid = [];
let numRows, numCols;

function preload() {
  tilesetImage = loadImage(
    "https://cdn.glitch.com/723f2e81-515d-43ff-b44a-4e161e0451ed%2Ftileset.png?v=1611598428661"
  );
}

function reseed() {
  // pick a new random seed each time
  seed = Math.floor(Math.random() * 1e6);
  randomSeed(seed);
  noiseSeed(seed);
  select("#seedReport").html("seed " + seed);
  regenerateGrid();
}

function regenerateGrid() {
  select("#asciiBox").value(
    gridToString(generateGrid(numCols, numRows))
  );
  reparseGrid();
}

function reparseGrid() {
  currentGrid = stringToGrid(select("#asciiBox").value());
}

function gridToString(grid) {
  let rows = [];
  for (let i = 0; i < grid.length; i++) {
    rows.push(grid[i].join(""));
  }
  return rows.join("\n");
}

function stringToGrid(str) {
  let grid = [];
  let lines = str.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let row = [];
    let chars = lines[i].split("");
    for (let j = 0; j < chars.length; j++) {
      row.push(chars[j]);
    }
    grid.push(row);
  }
  return grid;
}

function setup() {
  // note: attribute("rows") is how many text rows your <textarea> shows,
  // so that’s your grid height; attribute("cols") is grid width.
  numRows = select("#asciiBox").attribute("rows") | 0;
  numCols = select("#asciiBox").attribute("cols") | 0;

  createCanvas(16 * numCols, 16 * numRows)
    .parent("canvasContainer");
  select("canvas").elt
    .getContext("2d").imageSmoothingEnabled = false;

  select("#reseedButton").mousePressed(reseed);
  select("#asciiBox").input(reparseGrid);

  // kick things off
  reseed();
}

function draw() {
  // keep the random & noise in sync
  randomSeed(seed);
  drawGrid(currentGrid);
}

function placeTile(i, j, ti, tj) {
  image(
    tilesetImage,
    16 * j, 16 * i, 16, 16,
    8 * ti, 8 * tj, 8, 8
  );
}


/* exported generateGrid, drawGrid */
/* global placeTile */

// Cloud settings
let cloudOffsets = [];
let cloudYOffsets = [];
const numClouds = 3;
const cloudW = 200;      // cloud width
const cloudH = 100;      // cloud height
const cloudSpeed = 20;   // pixels per second

// 1) Autotile helpers (with invert)
function gridCheck(grid, i, j, target) {
  return (
    i >= 0 &&
    i < grid.length &&
    j >= 0 &&
    j < grid[0].length &&
    grid[i][j] === target
  );
}
function gridCode(grid, i, j, target) {
  return (
    (gridCheck(grid, i - 1, j, target) << 0) +
    (gridCheck(grid, i, j - 1, target) << 1) +
    (gridCheck(grid, i, j + 1, target) << 2) +
    (gridCheck(grid, i + 1, j, target) << 3)
  );
}

// 16‑entry table
const lookup = [
  [1,1],[1,0],[0,1],[0,0],
  [2,1],[2,0],[1,1],[1,0],
  [1,2],[1,1],[0,2],[0,1],
  [2,2],[2,1],[1,2],[1,1],
];

function drawContext(grid, i, j, target, baseTi, baseTj, invert = false) {
  let code = gridCode(grid, i, j, target);
  if (invert) code = ~code & 0xf;
  const [dx, dy] = lookup[code];
  placeTile(i, j, baseTi + dx, baseTj + dy);
}

// 2) Overworld generator w/ trees, houses + init cloud offsets
function generateGrid(cols, rows) {
  const xOff = random(0, 1000);
  const yOff = random(0, 1000);
  const grid = [];
  const waterThreshold = 0.35;
  const dirtThreshold  = 0.40;
  const treeChance     = 0.05;
  const houseChance    = 0.005; // 0.5% houses

  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const v = noise(x/30 + xOff, y/30 + yOff);
      if (v < waterThreshold) row.push("w");
      else if (v < dirtThreshold) row.push(":");
      else {
        const r = random();
        if (r < houseChance) row.push("h");
        else if (r < houseChance + treeChance) row.push("t");
        else row.push(".");
      }
    }
    grid.push(row);
  }

  // randomize cloud starting positions
  cloudOffsets = [];
  cloudYOffsets = [];
  for (let k = 0; k < numClouds; k++) {
    cloudOffsets.push(random(0, width + cloudW));
    cloudYOffsets.push(random(cloudH/2, height - cloudH/2));
  }

  return grid;
}

// 3) Layered draw + autotile + trees, houses + clouds
function drawGrid(grid) {
  background(128);
  const t = millis() / 5000.0;
  const g = 10;
  noStroke();

  // map layers
  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const c = grid[i][j];

      // water shimmer
      const baseIdx = (4 * pow(noise(t/10, i, j/4 + t), 2)) | 0;
      placeTile(i, j, baseIdx, 14);

      // dirt or shoreline
      if (c === ":") {
        const dirtIdx = (4 * pow(random(), g)) | 0;
        placeTile(i, j, dirtIdx, 3);
      } else {
        drawContext(grid, i, j, "w", 9, 3, true);
      }

      // house
      if (c === "h") {
        const grassIdx = (4 * pow(noise(t/10, i+100, j/4 + t+100), 2)) | 0;
        placeTile(i, j, grassIdx, 0);
        placeTile(i, j, 26, 1);
      }
      // tree
      else if (c === "t") {
        const grassIdx = (4 * pow(noise(t/10, i+100, j/4 + t+100), 2)) | 0;
        placeTile(i, j, grassIdx, 0);
        placeTile(i, j, 14, 6);
      }
      // grass
      else if (c === ".") {
        const grassIdx = (4 * pow(noise(t/10, i+100, j/4 + t+100), 2)) | 0;
        placeTile(i, j, grassIdx, 0);
      }
      // grass-edge
      else {
        drawContext(grid, i, j, ".", 4, 0);
      }
    }
  }

  // ——— Cloud layer ———
  fill(255, 255, 255, 150);
  noStroke();
  const base = (millis() / 1000) * cloudSpeed;

  for (let k = 0; k < numClouds; k++) {
    const cx = (base + cloudOffsets[k]) % (width + cloudW) - cloudW;
    const cy = cloudYOffsets[k];

    // fluffy puffs
    ellipse(cx - cloudW * 0.2, cy,               cloudW * 0.6, cloudH * 0.5);
    ellipse(cx,               cy - cloudH * 0.15, cloudW * 0.9, cloudH * 0.6);
    ellipse(cx + cloudW * 0.2, cy,               cloudW * 0.6, cloudH * 0.5);
    ellipse(cx - cloudW * 0.15, cy + cloudH * 0.1, cloudW * 0.8, cloudH * 0.6);
    ellipse(cx + cloudW * 0.15, cy + cloudH * 0.1, cloudW * 0.8, cloudH * 0.6);

    // wrap-around clone
    const cx2 = cx - (width + cloudW);
    ellipse(cx2 - cloudW * 0.2, cy,               cloudW * 0.6, cloudH * 0.5);
    ellipse(cx2,               cy - cloudH * 0.15, cloudW * 0.9, cloudH * 0.6);
    ellipse(cx2 + cloudW * 0.2, cy,               cloudW * 0.6, cloudH * 0.5);
    ellipse(cx2 - cloudW * 0.15, cy + cloudH * 0.1, cloudW * 0.8, cloudH * 0.6);
    ellipse(cx2 + cloudW * 0.15, cy + cloudH * 0.1, cloudW * 0.8, cloudH * 0.6);
  }
}
