// sketch.js
// Dual instance p5.js: Overworld + Dungeon

const overworldSketch = (p) => {
  let seed = 0;
  let tilesetImage;
  let currentGrid = [];
  let numRows, numCols;
  let cloudOffsets = [], cloudYOffsets = [];
  const numClouds = 3;
  const cloudW = 200, cloudH = 100, cloudSpeed = 20;

  p.preload = () => {
    tilesetImage = p.loadImage("https://cdn.glitch.com/723f2e81-515d-43ff-b44a-4e161e0451ed%2Ftileset.png?v=1611598428661");
  };

  function reseed() {
    seed = Math.floor(Math.random() * 1e6);
    p.randomSeed(seed);
    p.noiseSeed(seed);
    p.select("#seedReport-overworld").html("seed " + seed);
    regenerateGrid();
  }

  function regenerateGrid() {
    p.select("#asciiBox-overworld").value(gridToString(generateGrid(numCols, numRows)));
    reparseGrid();
  }

  function reparseGrid() {
    currentGrid = stringToGrid(p.select("#asciiBox-overworld").value());
  }

  function gridToString(grid) {
    return grid.map(row => row.join("")).join("\n");
  }

  function stringToGrid(str) {
    return str.split("\n").map(line => line.split(""));
  }

  p.setup = () => {
    const asciiBox = p.select("#asciiBox-overworld");
    numCols = asciiBox.attribute("cols") | 0;
    numRows = asciiBox.attribute("rows") | 0;

    p.createCanvas(16 * numCols, 16 * numRows).parent("canvasContainer-overworld");
    p.select("canvas").elt.getContext("2d").imageSmoothingEnabled = false;

    p.select("#reseed-overworld").mousePressed(reseed);
    asciiBox.input(reparseGrid);

    reseed();
  };

  p.draw = () => {
    p.randomSeed(seed);
    drawGrid(currentGrid);
  };

  function placeTile(i, j, ti, tj) {
    p.image(tilesetImage, 16 * j, 16 * i, 16, 16, 8 * ti, 8 * tj, 8, 8);
  }

  function gridCheck(grid, i, j, target) {
    return i >= 0 && i < grid.length && j >= 0 && j < grid[0].length && grid[i][j] === target;
  }

  function gridCode(grid, i, j, target) {
    return (
      (gridCheck(grid, i - 1, j, target) << 0) +
      (gridCheck(grid, i, j - 1, target) << 1) +
      (gridCheck(grid, i, j + 1, target) << 2) +
      (gridCheck(grid, i + 1, j, target) << 3)
    );
  }

  const lookup = [
    [1, 1], [1, 0], [0, 1], [0, 0],
    [2, 1], [2, 0], [1, 1], [1, 0],
    [1, 2], [1, 1], [0, 2], [0, 1],
    [2, 2], [2, 1], [1, 2], [1, 1],
  ];

  function drawContext(grid, i, j, target, baseTi, baseTj, invert = false) {
    let code = gridCode(grid, i, j, target);
    if (invert) code = ~code & 0xf;
    const [dx, dy] = lookup[code];
    placeTile(i, j, baseTi + dx, baseTj + dy);
  }

  function generateGrid(cols, rows) {
    const xOff = p.random(0, 1000);
    const yOff = p.random(0, 1000);
    const grid = [];
    const waterThreshold = 0.35;
    const dirtThreshold = 0.40;
    const treeChance = 0.05;
    const houseChance = 0.005;

    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        const v = p.noise(x / 30 + xOff, y / 30 + yOff);
        if (v < waterThreshold) row.push("w");
        else if (v < dirtThreshold) row.push(":");
        else {
          const r = p.random();
          if (r < houseChance) row.push("h");
          else if (r < houseChance + treeChance) row.push("t");
          else row.push(".");
        }
      }
      grid.push(row);
    }

    cloudOffsets = [];
    cloudYOffsets = [];
    for (let k = 0; k < numClouds; k++) {
      cloudOffsets.push(p.random(0, p.width + cloudW));
      cloudYOffsets.push(p.random(cloudH / 2, p.height - cloudH / 2));
    }
    return grid;
  }

  function drawGrid(grid) {
    p.background(128);
    const t = p.millis() / 5000.0;
    const g = 10;
    p.noStroke();

    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const c = grid[i][j];
        const baseIdx = (4 * Math.pow(p.noise(t / 10, i, j / 4 + t), 2)) | 0;
        placeTile(i, j, baseIdx, 14);

        if (c === ":") placeTile(i, j, (4 * Math.pow(p.random(), g)) | 0, 3);
        else drawContext(grid, i, j, "w", 9, 3, true);

        if (c === "h") {
          const grassIdx = (4 * Math.pow(p.noise(t / 10, i + 100, j / 4 + t + 100), 2)) | 0;
          placeTile(i, j, grassIdx, 0);
          placeTile(i, j, 26, 1);
        } else if (c === "t") {
          const grassIdx = (4 * Math.pow(p.noise(t / 10, i + 100, j / 4 + t + 100), 2)) | 0;
          placeTile(i, j, grassIdx, 0);
          placeTile(i, j, 14, 6);
        } else if (c === ".") {
          const grassIdx = (4 * Math.pow(p.noise(t / 10, i + 100, j / 4 + t + 100), 2)) | 0;
          placeTile(i, j, grassIdx, 0);
        } else {
          drawContext(grid, i, j, ".", 4, 0);
        }
      }
    }

    p.fill(255, 255, 255, 150);
    p.noStroke();
    const base = (p.millis() / 1000) * cloudSpeed;
    for (let k = 0; k < numClouds; k++) {
      const cx = (base + cloudOffsets[k]) % (p.width + cloudW) - cloudW;
      const cy = cloudYOffsets[k];
      const cloudPuffs = [
        [cx - cloudW * 0.2, cy, cloudW * 0.6, cloudH * 0.5],
        [cx, cy - cloudH * 0.15, cloudW * 0.9, cloudH * 0.6],
        [cx + cloudW * 0.2, cy, cloudW * 0.6, cloudH * 0.5],
        [cx - cloudW * 0.15, cy + cloudH * 0.1, cloudW * 0.8, cloudH * 0.6],
        [cx + cloudW * 0.15, cy + cloudH * 0.1, cloudW * 0.8, cloudH * 0.6],
      ];
      cloudPuffs.forEach(([x, y, w, h]) => p.ellipse(x, y, w, h));

      const cx2 = cx - (p.width + cloudW);
      cloudPuffs.forEach(([x, y, w, h]) => p.ellipse(x + cx2 - cx, y, w, h));
    }
  }
};

// ⛏️ Dungeon sketch coming next...

const dungeonSketch = (p) => {
  let seed = 0;
  let tilesetImage;
  let currentGrid = [];
  let numRows, numCols;

  p.preload = () => {
    tilesetImage = p.loadImage("https://cdn.glitch.com/723f2e81-515d-43ff-b44a-4e161e0451ed%2Ftileset.png?v=1611598428661");
  };

  function reseed() {
    seed = Math.floor(Math.random() * 1e6);
    p.randomSeed(seed);
    p.noiseSeed(seed);
    p.select("#seedReport-dungeon").html("seed " + seed);
    regenerateGrid();
  }

  function regenerateGrid() {
    p.select("#asciiBox-dungeon").value(gridToString(generateGrid(numCols, numRows)));
    reparseGrid();
  }

  function reparseGrid() {
    currentGrid = stringToGrid(p.select("#asciiBox-dungeon").value());
  }

  function gridToString(grid) {
    return grid.map(row => row.join("")).join("\n");
  }

  function stringToGrid(str) {
    return str.split("\n").map(line => line.split(""));
  }

  p.setup = () => {
    const asciiBox = p.select("#asciiBox-dungeon");
    numCols = asciiBox.attribute("cols") | 0;
    numRows = asciiBox.attribute("rows") | 0;
    p.createCanvas(16 * numCols, 16 * numRows).parent("canvasContainer-dungeon");
    p.select("canvas").elt.getContext("2d").imageSmoothingEnabled = false;
    p.select("#reseed-dungeon").mousePressed(reseed);
    asciiBox.input(reparseGrid);
    reseed();
  };

  p.draw = () => {
    p.randomSeed(seed);
    drawGrid(currentGrid);
  };

  function placeTile(i, j, ti, tj) {
    p.image(tilesetImage, 16 * j, 16 * i, 16, 16, 8 * ti, 8 * tj, 8, 8);
  }

  function gridCheck(grid, i, j, target) {
    return i >= 0 && i < grid.length && j >= 0 && j < grid[0].length && grid[i][j] === target;
  }

  function gridCode(grid, i, j, target) {
    return (
      (gridCheck(grid, i - 1, j, target) << 0) +
      (gridCheck(grid, i, j - 1, target) << 1) +
      (gridCheck(grid, i, j + 1, target) << 2) +
      (gridCheck(grid, i + 1, j, target) << 3)
    );
  }

  const lookup = [
    [1, 1], [1, 0], [0, 1], [0, 0],
    [2, 1], [2, 0], [1, 1], [1, 0],
    [1, 2], [1, 1], [0, 2], [0, 1],
    [2, 2], [2, 1], [1, 2], [1, 1],
  ];

  function drawContext(grid, i, j, target, baseTi, baseTj, invert = false) {
    let code = gridCode(grid, i, j, target);
    if (invert) code = ~code & 0xf;
    const [dx, dy] = lookup[code];
    placeTile(i, j, baseTi + dx, baseTj + dy);
  }

  function generateGrid(cols, rows) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill("#"));
    const rooms = [];
    const maxRooms = 8;
    const roomMin = 8;
    const roomMax = 15;

    for (let r = 0; r < maxRooms; r++) {
      const w = p.floor(p.random(roomMin, roomMax));
      const h = p.floor(p.random(roomMin, roomMax));
      const x = p.floor(p.random(1, cols - w - 1));
      const y = p.floor(p.random(1, rows - h - 1));
      const room = { x1: x, y1: y, x2: x + w, y2: y + h };

      if (rooms.some(o => room.x1 <= o.x2 && room.x2 >= o.x1 && room.y1 <= o.y2 && room.y2 >= o.y1)) continue;

      for (let yy = room.y1; yy < room.y2; yy++)
        for (let xx = room.x1; xx < room.x2; xx++) grid[yy][xx] = "f";

      const pondW = p.floor(p.random(2, Math.min(6, w - 1)));
      const pondH = p.floor(p.random(2, Math.min(4, h - 1)));
      const px = p.floor(p.random(room.x1 + 1, room.x2 - pondW - 1));
      const py = p.floor(p.random(room.y1 + 1, room.y2 - pondH - 1));
      for (let yy = py; yy < py + pondH; yy++)
        for (let xx = px; xx < px + pondW; xx++) grid[yy][xx] = "p";

      if (rooms.length > 0) {
        const prev = rooms[rooms.length - 1];
        const cx1 = p.floor((room.x1 + room.x2) / 2);
        const cy1 = p.floor((room.y1 + room.y2) / 2);
        const cx2 = p.floor((prev.x1 + prev.x2) / 2);
        const cy2 = p.floor((prev.y1 + prev.y2) / 2);

        if (p.random() < 0.5) {
          for (let xx = p.min(cx1, cx2); xx <= p.max(cx1, cx2); xx++) {
            grid[cy1][xx] = "f";
            grid[cy1 - 1][xx] = "f";
          }
          for (let yy = p.min(cy1, cy2); yy <= p.max(cy1, cy2); yy++) {
            grid[yy][cx2] = "f";
            grid[yy][cx2 - 1] = "f";
          }
        } else {
          for (let yy = p.min(cy1, cy2); yy <= p.max(cy1, cy2); yy++) {
            grid[yy][cx1] = "f";
            grid[yy][cx1 - 1] = "f";
          }
          for (let xx = p.min(cx1, cx2); xx <= p.max(cx1, cx2); xx++) {
            grid[cy2][xx] = "f";
            grid[cy2 - 1][xx] = "f";
          }
        }
      }
      rooms.push(room);
    }

    const chestCount = p.floor(p.random(1, 3));
    for (let n = 0; n < chestCount && n < rooms.length; n++) {
      const room = p.random(rooms);
      const cx = p.floor((room.x1 + room.x2) / 2);
      const cy = p.floor((room.y1 + room.y2) / 2);
      grid[cy][cx] = 'c';
    }
    return grid;
  }

  function drawGrid(grid) {
    p.background(20);
    const t = p.millis() / 1000;
    const rows = grid.length, cols = grid[0].length;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] === "f") {
          const fx = 2 + p.floor(p.random(2));
          placeTile(i, j, fx, 23);
        }
      }
    }

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] === "p") {
          const baseIdx = (4 * Math.pow(p.noise(t / 5, i, j + t), 2)) | 0;
          placeTile(i, j, baseIdx, 14);
        }
      }
    }

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] === 'f' || grid[i][j] === 'c') {
          const fx = 2 + p.floor(p.random(2));
          placeTile(i, j, fx, 23);
          drawContext(grid, i, j, "#", 25, 21);
        }
      }
    }

    p.noStroke();
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] === 'f') {
          const glow = p.map(p.sin(t * 2 + i + j), -1, 1, 10, 60);
          p.fill(255, 255, 255, glow);
          p.rect(j * 16, i * 16, 16, 16);
        }
      }
    }

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] === "p") {
          drawContext(grid, i, j, "p", 5, 21, true);
        }
      }
    }

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] === "#") {
          const wx = 21 + p.floor(p.random(4));
          placeTile(i, j, wx, 22);
        }
      }
    }

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] === 'c') {
          const shakeX = p.sin(t * 20 + i + j) * 0;
          const shakeY = p.cos(t * 20 + j - i) * 1;
          p.push();
          p.translate(j * 16 + shakeX, i * 16 + shakeY);
          placeTile(0, 0, 5, 29);
          p.pop();
        }
      }
    }
  }
};

new p5(overworldSketch);
new p5(dungeonSketch);
