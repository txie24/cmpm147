"use strict";
// WORLD 1 (MARIO KART RAINBOWROAD)
const s1 = (sketch) => {
  let tile_width_step_main;
  let tile_height_step_main;
  let tile_rows, tile_columns;
  let camera_offset;
  let camera_velocity;
  let followCarMode = false;

  let roadWidth;
  let sparkleMode = true;
  let worldSeed;
  let clickTracker = {};
  let rainbowOffset = 0;
  let carPos = { x: 0, y: 0 };
  let carImg;
  let nebulaColorShift = 0; 

  let cachedRoadOffsets = new Map();
  let lastCachedX = -1;
  let lastCurvature = 0;
  let lastPosition = 0;

  sketch.preload = () => {
    carImg = sketch.loadImage(
      "https://cdn.glitch.global/94688d5b-40bf-447f-9c74-c6d3b343c54f/what_if_super_mario_kart_was_like_mario_kart_8__by_djtoast3_d7mx7nc-fullview.png?v=1745730991688"
    );
  };

  sketch.setup = () => {
    let canvas = sketch.createCanvas(800, 400);
    canvas.parent("canvas-container1");

    camera_offset = new p5.Vector(-sketch.width / 2, sketch.height / 2);
    camera_velocity = new p5.Vector(0, 0);

    sketch.colorMode(sketch.HSB, 360, 100, 100);

    let label = sketch.createP();
    label.html("World key: ");
    label.parent("canvas-container1");

    let input = sketch.createInput("Mario");
    input.parent(label);
    input.input(() => {
      rebuildWorld(input.value());
    });

    sketch.createP("W, A, S, D scroll. Clicking changes tiles.").parent("canvas-container1");

    let followBtn = sketch.createButton("Follow Mario");
    followBtn.parent("canvas-container1");
    followBtn.id("followButton");
    followBtn.mousePressed(() => {
      followCarMode = !followCarMode;
      followBtn.html(followCarMode ? "Stop Following Mario" : "Find & Follow Mario");

      if (followCarMode) {
        snapCameraToCar();
      }
    });

    rebuildWorld(input.value());
  };

  function rebuildWorld(key) {
    worldSeed = XXH.h32(key, 0);
    sketch.randomSeed(worldSeed);
    sketch.noiseSeed(worldSeed);
    roadWidth = sketch.floor(sketch.random(8, 16));

    cachedRoadOffsets.clear();
    lastCachedX = -1;
    lastCurvature = 0;
    lastPosition = 0;

    tile_width_step_main = 12;
    tile_height_step_main = 6;
    tile_columns = Math.ceil(sketch.width / (tile_width_step_main * 2));
    tile_rows = Math.ceil(sketch.height / (tile_height_step_main * 2));
  }

  sketch.mouseClicked = () => {
    let world_pos = screenToWorld(
      [0 - sketch.mouseX, sketch.mouseY],
      [camera_offset.x, camera_offset.y]
    );
    clickTracker[world_pos] = sketch.millis();
    return false;
  };

  sketch.draw = () => {
    if (!followCarMode) {
      if (sketch.keyIsDown(65)) camera_velocity.x -= 1;
      if (sketch.keyIsDown(68)) camera_velocity.x += 1;
      if (sketch.keyIsDown(83)) camera_velocity.y -= 1;
      if (sketch.keyIsDown(87)) camera_velocity.y += 1;
    }

    if (followCarMode) {
      snapCameraToCar();
    } else {
      let camera_delta = new p5.Vector(0, 0);
      camera_velocity.add(camera_delta);
      camera_offset.add(camera_velocity);
      camera_velocity.mult(0.95);
      if (camera_velocity.mag() < 0.01) {
        camera_velocity.setMag(0);
      }
    }

    let world_pos = screenToWorld([
      0 - sketch.mouseX,
      sketch.mouseY
    ], [camera_offset.x, camera_offset.y]);
    let world_offset = cameraToWorldOffset([camera_offset.x, camera_offset.y]);

    sketch.background(100);

    rainbowOffset += 10;
    nebulaColorShift += 0.002;
    carPos.x -= 1;

    let offset = roadOffsetAt(sketch.abs(sketch.floor(carPos.x)));
    carPos.y = offset;

    let overdraw = 0.1;
    let y0 = Math.floor((0 - overdraw) * tile_rows);
    let y1 = Math.floor((1 + overdraw) * tile_rows);
    let x0 = Math.floor((0 - overdraw) * tile_columns);
    let x1 = Math.floor((1 + overdraw) * tile_columns);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        drawTile(tileRenderingOrder([x + world_offset.x, y - world_offset.y]), [camera_offset.x, camera_offset.y]);
      }
      for (let x = x0; x < x1; x++) {
        drawTile(tileRenderingOrder([x + 0.5 + world_offset.x, y + 0.5 - world_offset.y]), [camera_offset.x, camera_offset.y]);
      }
    }

    describeMouseTile(world_pos, [camera_offset.x, camera_offset.y]);
  };

  function worldToScreen([world_x, world_y], [camera_x, camera_y]) {
    let i = (world_x - world_y) * tile_width_step_main;
    let j = (world_x + world_y) * tile_height_step_main;
    return [i + camera_x, j + camera_y];
  }

  function screenToWorld([screen_x, screen_y], [camera_x, camera_y]) {
    screen_x -= camera_x;
    screen_y -= camera_y;
    screen_x /= tile_width_step_main * 2;
    screen_y /= tile_height_step_main * 2;
    screen_y += 0.5;
    return [Math.floor(screen_y + screen_x), Math.floor(screen_y - screen_x)];
  }

  function cameraToWorldOffset([camera_x, camera_y]) {
    let world_x = camera_x / (tile_width_step_main * 2);
    let world_y = camera_y / (tile_height_step_main * 2);
    return { x: Math.round(world_x), y: Math.round(world_y) };
  }

  function tileRenderingOrder(offset) {
    return [offset[1] - offset[0], offset[0] + offset[1]];
  }

  function drawTile([world_x, world_y], [camera_x, camera_y]) {
    let [screen_x, screen_y] = worldToScreen([world_x, world_y], [camera_x, camera_y]);
    sketch.push();
    sketch.translate(0 - screen_x, screen_y);

    let offset = roadOffsetAt(Math.abs(world_x));
    let onRoad = world_y >= -roadWidth + offset && world_y <= roadWidth + offset;

    if (onRoad) {
      drawRoadTile(world_x, world_y);
    } else {
      drawSpaceTile(world_x, world_y);
    }

    sketch.beginShape();
    sketch.vertex(-12, 0);
    sketch.vertex(0, 6);
    sketch.vertex(12, 0);
    sketch.vertex(0, -6);
    sketch.endShape(sketch.CLOSE);

    if (clickTracker[[world_x, world_y]] && sketch.millis() - clickTracker[[world_x, world_y]] < 300) {
      if (sparkleMode) {
        sketch.fill(sketch.random(360), 100, 100);
      } else {
        sketch.fill(50, 100, 100);
      }
      sketch.beginShape();
      sketch.vertex(-12, 0);
      sketch.vertex(0, 6);
      sketch.vertex(12, 0);
      sketch.vertex(0, -6);
      sketch.endShape(sketch.CLOSE);
    }

    let starSeed = XXH.h32("star:" + [world_x, world_y], worldSeed);
    if (starSeed % 20 == 0) {
      sketch.push();
      sketch.noStroke();
      sketch.colorMode(sketch.RGB, 255);
      sketch.fill(255, 255, 255, 220);
      sketch.ellipse(0, -8, 3, 3);
      sketch.colorMode(sketch.HSB, 360, 100, 100);
      sketch.pop();
    }

    if (sketch.dist(world_x, world_y, carPos.x, carPos.y) < 0.5) {
      sketch.push();
      sketch.imageMode(sketch.CENTER);
      sketch.image(carImg, 0, -40, 120, 60);
      sketch.pop();
    }

    sketch.pop();
  }

  function drawRoadTile(i) {
    let hueVal = (i * 5 + rainbowOffset) % 360;
    sketch.fill(hueVal, 100, 100);
  }

  function drawSpaceTile(i, j) {
    sketch.colorMode(sketch.RGB, 255);
  
    let noiseVal = sketch.noise(i * 0.1 + nebulaColorShift, j * 0.1 + nebulaColorShift);
  
    if (noiseVal < 0.4) {
      sketch.fill(10, 10, 20);
    } else {
      let colorPicker = sketch.noise(i * 0.15 + 1000 + nebulaColorShift, j * 0.15 + 1000 + nebulaColorShift);
      let r, g, b;
  
      if (colorPicker < 0.33) {
        r = 100 + sketch.noise(i * 0.5 + nebulaColorShift, j * 0.5 + nebulaColorShift) * 20;
        g = 50 + sketch.noise(i * 0.6 + nebulaColorShift, j * 0.6 + nebulaColorShift) * 20;
        b = 150 + sketch.noise(i * 0.7 + nebulaColorShift, j * 0.7 + nebulaColorShift) * 20;
      } else if (colorPicker < 0.66) {
        r = 50 + sketch.noise(i * 0.5 + nebulaColorShift, j * 0.5 + nebulaColorShift) * 20;
        g = 100 + sketch.noise(i * 0.6 + nebulaColorShift, j * 0.6 + nebulaColorShift) * 20;
        b = 180 + sketch.noise(i * 0.7 + nebulaColorShift, j * 0.7 + nebulaColorShift) * 20;
      } else {
        r = 200 + sketch.noise(i * 0.5 + nebulaColorShift, j * 0.5 + nebulaColorShift) * 20;
        g = 80 + sketch.noise(i * 0.6 + nebulaColorShift, j * 0.6 + nebulaColorShift) * 20;
        b = 140 + sketch.noise(i * 0.7 + nebulaColorShift, j * 0.7 + nebulaColorShift) * 20;
      }
  
      let brightnessNoise = sketch.noise(i * 0.5 + 5000 + nebulaColorShift, j * 0.5 + 5000 + nebulaColorShift);
      let brightnessFactor = sketch.map(brightnessNoise, 0, 1, 0.2, 0.5);
  
      r = sketch.constrain(r * brightnessFactor, 0, 255);
      g = sketch.constrain(g * brightnessFactor, 0, 255);
      b = sketch.constrain(b * brightnessFactor, 0, 255);
  
      sketch.fill(r, g, b);
    }
  
    sketch.colorMode(sketch.HSB, 360, 100, 100);
  }
  

  function describeMouseTile([world_x, world_y], [camera_x, camera_y]) {
    let [screen_x, screen_y] = worldToScreen([world_x, world_y], [camera_x, camera_y]);
    drawTileDescription([world_x, world_y], [0 - screen_x, screen_y]);
  }

  function drawTileDescription([world_x, world_y], [screen_x, screen_y]) {
    sketch.push();
    sketch.translate(screen_x, screen_y);
    sketch.noFill();
    sketch.stroke(0, 255, 0, 150);
    sketch.beginShape();
    sketch.vertex(-12, 0);
    sketch.vertex(0, 6);
    sketch.vertex(12, 0);
    sketch.vertex(0, -6);
    sketch.endShape(sketch.CLOSE);
    sketch.noStroke();
    sketch.fill(255);
    sketch.textAlign(sketch.CENTER, sketch.CENTER);
    sketch.textSize(10);
    sketch.text(`(${world_x},${world_y})`, 0, 0);
    sketch.pop();
  }

  function roadOffsetAt(x) {
    x = Math.floor(Math.abs(x));
    if (cachedRoadOffsets.has(x)) {
      return cachedRoadOffsets.get(x);
    }

    for (let i = lastCachedX + 1; i <= x; i++) {
      let curveChange = sketch.map(sketch.noise(i * 0.1), 0, 1, -0.1, 0.1);
      lastCurvature += curveChange;
      lastCurvature = sketch.constrain(lastCurvature, -0.8, 0.8);
      lastPosition += lastCurvature;
      cachedRoadOffsets.set(i, lastPosition);
    }

    lastCachedX = x;
    return cachedRoadOffsets.get(x);
  }

  function snapCameraToCar() {
    let [carScreenX, carScreenY] = worldToScreen([carPos.x, carPos.y], [0, 0]);
    camera_offset.x = (sketch.width / 2 - 700) - carScreenX;
    camera_offset.y = (sketch.height / 2 + 80) - carScreenY;
  }
};


//WORLD 2 HONG KONG


"use strict";

const s2 = (sketch) => {
  let tile_width_step_main;
  let tile_height_step_main;
  let tile_rows, tile_columns;
  let camera_offset;
  let camera_velocity;

  let worldSeed;
  let [tw, th] = [28, 16];
  let clicks = {};

  const blockSize = 3;
  const roadSize = 2;
  const groupSize = blockSize + roadSize;

  const palette = [
    "#cfcfcf", "#e3d5b6", "#f0f0f0", "#f5e7a1",
    "#e6ac70", "#c4d3c2", "#ccddee", "#d48670",
  ];

  sketch.preload = () => {};

  sketch.setup = () => {
    let canvas = sketch.createCanvas(800, 400);
    canvas.parent("canvas-container2");

    camera_offset = new p5.Vector(-sketch.width / 2, sketch.height / 2);
    camera_velocity = new p5.Vector(0, 0);

    let label = sketch.createP();
    label.html("World key: ");
    label.parent("canvas-container2");

    let input = sketch.createInput("Hong Kong");
    input.parent(label);
    input.input(() => {
      rebuildWorld(input.value());
    });

    sketch.createP("Arrow keys scroll").parent("canvas-container2");

    rebuildWorld(input.value());
  };

  function rebuildWorld(key) {
    worldSeed = XXH.h32(key, 0);
    sketch.noiseSeed(worldSeed);
    sketch.randomSeed(worldSeed);

    tile_width_step_main = 28;
    tile_height_step_main = 16;
    tile_columns = Math.ceil(sketch.width / (tile_width_step_main * 2));
    tile_rows = Math.ceil(sketch.height / (tile_height_step_main * 2));
  }

  sketch.mouseClicked = () => {
    let world_pos = screenToWorld([
      0 - sketch.mouseX,
      sketch.mouseY
    ], [camera_offset.x, camera_offset.y]);

    clicks[world_pos] = 1 + (clicks[world_pos] | 0);
    return false;
  };

  sketch.draw = () => {
    if (sketch.keyIsDown(sketch.LEFT_ARROW)) camera_velocity.x -= 1;
    if (sketch.keyIsDown(sketch.RIGHT_ARROW)) camera_velocity.x += 1;
    if (sketch.keyIsDown(sketch.DOWN_ARROW)) camera_velocity.y -= 1;
    if (sketch.keyIsDown(sketch.UP_ARROW)) camera_velocity.y += 1;

    let camera_delta = new p5.Vector(0, 0);
    camera_velocity.add(camera_delta);
    camera_offset.add(camera_velocity);
    camera_velocity.mult(0.95);
    if (camera_velocity.mag() < 0.01) {
      camera_velocity.setMag(0);
    }

    let world_pos = screenToWorld([
      0 - sketch.mouseX,
      sketch.mouseY
    ], [camera_offset.x, camera_offset.y]);
    let world_offset = cameraToWorldOffset([camera_offset.x, camera_offset.y]);

    sketch.background(100);

    let overdraw = 0.1;
    let y0 = Math.floor((0 - overdraw) * tile_rows);
    let y1 = Math.floor((1 + overdraw) * tile_rows);
    let x0 = Math.floor((0 - overdraw) * tile_columns);
    let x1 = Math.floor((1 + overdraw) * tile_columns);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        drawTile(tileRenderingOrder([x + world_offset.x, y - world_offset.y]), [camera_offset.x, camera_offset.y]);
      }
      for (let x = x0; x < x1; x++) {
        drawTile(tileRenderingOrder([x + 0.5 + world_offset.x, y + 0.5 - world_offset.y]), [camera_offset.x, camera_offset.y]);
      }
    }

    describeMouseTile(world_pos, [camera_offset.x, camera_offset.y]);
  };

  function worldToScreen([world_x, world_y], [camera_x, camera_y]) {
    let i = (world_x - world_y) * tile_width_step_main;
    let j = (world_x + world_y) * tile_height_step_main;
    return [i + camera_x, j + camera_y];
  }

  function screenToWorld([screen_x, screen_y], [camera_x, camera_y]) {
    screen_x -= camera_x;
    screen_y -= camera_y;
    screen_x /= tile_width_step_main * 2;
    screen_y /= tile_height_step_main * 2;
    screen_y += 0.5;
    return [Math.floor(screen_y + screen_x), Math.floor(screen_y - screen_x)];
  }

  function cameraToWorldOffset([camera_x, camera_y]) {
    let world_x = camera_x / (tile_width_step_main * 2);
    let world_y = camera_y / (tile_height_step_main * 2);
    return { x: Math.round(world_x), y: Math.round(world_y) };
  }

  function tileRenderingOrder(offset) {
    return [offset[1] - offset[0], offset[0] + offset[1]];
  }

  function drawTile([world_x, world_y], [camera_x, camera_y]) {
    let [screen_x, screen_y] = worldToScreen([world_x, world_y], [camera_x, camera_y]);
    sketch.push();
    sketch.translate(0 - screen_x, screen_y);
    drawTileContent(world_x, world_y);
    sketch.pop();
  }

  function drawTileContent(i, j) {
    sketch.push();
    sketch.noStroke();
    drawRoadLayer(i, j);
    drawCarLayer(i, j);
    drawBuildingLayer(i, j);
    sketch.pop();
  }

  function describeMouseTile([world_x, world_y], [camera_x, camera_y]) {
    let [screen_x, screen_y] = worldToScreen([world_x, world_y], [camera_x, camera_y]);
    drawTileDescription([world_x, world_y], [0 - screen_x, screen_y]);
  }

  function drawTileDescription([world_x, world_y], [screen_x, screen_y]) {
    sketch.push();
    sketch.translate(screen_x, screen_y);
    sketch.pop();
  }

  function isRoad(i, j) {
    let mi = ((i % groupSize) + groupSize) % groupSize;
    let mj = ((j % groupSize) + groupSize) % groupSize;
    return mi >= blockSize || mj >= blockSize;
  }

  function drawRoadLayer(i, j) {
    if (!isRoad(i, j)) return;

    sketch.fill(40);
    sketch.beginShape();
    sketch.vertex(-tw, 0);
    sketch.vertex(0, th);
    sketch.vertex(tw, 0);
    sketch.vertex(0, -th);
    sketch.endShape(sketch.CLOSE);

    sketch.stroke(255, 255, 255, 200);
    sketch.strokeWeight(1.5);

    let mi = ((i % groupSize) + groupSize) % groupSize;
    let mj = ((j % groupSize) + groupSize) % groupSize;

    let trafficType;
    if (mi >= blockSize && mj >= blockSize) {
      trafficType = (i + j) % 2;
    } else if (mi >= blockSize) {
      trafficType = 0;
    } else if (mj >= blockSize) {
      trafficType = 1;
    } else {
      trafficType = 0;
    }

    if (trafficType === 0) {
      drawDashedLine(-tw, 0, 0, th);
      drawDashedLine(0, -th, tw, 0);
    } else if (trafficType === 1) {
      drawDashedLine(-tw, 0, 0, -th);
      drawDashedLine(0, th, tw, 0);
    }

    sketch.noStroke();
  }

  function drawDashedLine(startX, startY, endX, endY) {
    let distX = endX - startX;
    let distY = endY - startY;
    let distance = Math.sqrt(distX * distX + distY * distY);
    let dashLength = 6;
    let gapLength = 4;
    let dashCount = Math.floor(distance / (dashLength + gapLength));

    for (let d = 0; d < dashCount; d++) {
      let t1 = (d * (dashLength + gapLength)) / distance;
      let t2 = ((d * (dashLength + gapLength)) + dashLength) / distance;

      let x1 = sketch.lerp(startX, endX, t1);
      let y1 = sketch.lerp(startY, endY, t1);
      let x2 = sketch.lerp(startX, endX, t2);
      let y2 = sketch.lerp(startY, endY, t2);

      sketch.line(x1, y1, x2, y2);
    }
  }

  function drawCarLayer(i, j) {
    if (!isRoad(i, j)) return;
  
    let mi = ((i % groupSize) + groupSize) % groupSize;
    let mj = ((j % groupSize) + groupSize) % groupSize;
  
    let trafficType;
    if (mi >= blockSize && mj >= blockSize) {
      trafficType = (i + j) % 2;
    } else if (mi >= blockSize) {
      trafficType = 0;
    } else if (mj >= blockSize) {
      trafficType = 1;
    } else {
      trafficType = 0;
    }
  
    let carDensity = sketch.noise(i * 0.3, j * 0.3);
    let numCars = Math.floor(sketch.map(carDensity, 0, 1, 1, 3));
  
    for (let c = 0; c < numCars; c++) {
      let carSeed = XXH.h32("car:" + [i, j, c], worldSeed);
      let offsetSeed = (carSeed % 1000) / 1000;
      let speed = 0.02 + (offsetSeed * 0.02);
      let timeOffset = (sketch.millis() * speed + offsetSeed * 3000) % (tw * 4);
  
      let direction = (carSeed >> 10) % 2;
      if (direction === 1) {
        timeOffset = (tw * 4) - timeOffset;
      }
  
      sketch.push();
        let carYOffset = th / 4;
        sketch.translate(0, -carYOffset);
  
        if (trafficType === 0) {
          if (mi >= blockSize) {
            sketch.translate(-tw + timeOffset, -th + timeOffset * (th / tw));
          } else {
            sketch.translate(tw - timeOffset, th - timeOffset * (th / tw));
          }
        } else {
          if (mj >= blockSize) {
            sketch.translate(tw - timeOffset, -th + timeOffset * (th / tw));
          } else {
            sketch.translate(-tw + timeOffset, th - timeOffset * (th / tw));
          }
        }
  
        drawIsoCar();
      sketch.pop();
    }
  }
  
  function drawIsoCar() {
    let w = 4;
    let d = 3;
    let h = 2;
  
    sketch.fill(sketch.lerpColor(sketch.color(150,150,255), sketch.color(255), 0.3));
    sketch.beginShape();
      sketch.vertex(-w, -h);
      sketch.vertex(0, -d - h);
      sketch.vertex(w, -h);
      sketch.vertex(0, -h + d);
    sketch.endShape(sketch.CLOSE);
  
    sketch.fill(sketch.lerpColor(sketch.color(150,150,255), sketch.color(0), 0.2));
    sketch.beginShape();
      sketch.vertex(-w, -h);
      sketch.vertex(0, -h + d);
      sketch.vertex(0, d);
      sketch.vertex(-w, 0);
    sketch.endShape(sketch.CLOSE);
  
    sketch.fill(sketch.lerpColor(sketch.color(150,150,255), sketch.color(0), 0.4));
    sketch.beginShape();
      sketch.vertex(w, -h);
      sketch.vertex(0, -h + d);
      sketch.vertex(0, d);
      sketch.vertex(w, 0);
    sketch.endShape(sketch.CLOSE);
  }
  
  function drawBuildingLayer(i, j) {
    if (isRoad(i, j)) return;
  
    let blockI = Math.floor(i / groupSize);
    let blockJ = Math.floor(j / groupSize);
  
    let anchorX = blockI * groupSize;
    let anchorY = blockJ * groupSize;
  
    let blockHash = XXH.h32("block:" + [blockI, blockJ], worldSeed);
  
    let tall1 = [blockHash % 3, (blockHash >> 8) % 3];
    let tall2 = [(blockHash >> 16) % 3, (blockHash >> 24) % 3];
  
    let localI = (i - anchorX + groupSize) % groupSize;
    let localJ = (j - anchorY + groupSize) % groupSize;
  
    let isTall = (localI === tall1[0] && localJ === tall1[1]) || (localI === tall2[0] && localJ === tall2[1]);
  
    let floors;
    if (isTall) {
      floors = Math.floor(sketch.lerp(10, 18, sketch.noise(i * 0.2, j * 0.2)));
    } else {
      floors = Math.floor(sketch.lerp(3, 7, sketch.noise(i * 0.2, j * 0.2)));
    }
  
    let tileHash = XXH.h32("color:" + [i, j], worldSeed);
    let paletteIndex = tileHash % palette.length;
    let baseColor = sketch.color(palette[paletteIndex]);
  
    let buildingHeight = floors * (th/2);
  
    for (let f = 0; f < floors; f++) {
      let offsetY = -f * (th/2);
  
      sketch.fill(sketch.lerpColor(baseColor, sketch.color(0), 0.2));
      sketch.beginShape();
        sketch.vertex(-tw, -th * 1.5 + offsetY);
        sketch.vertex(-tw, 0 + offsetY);
        sketch.vertex(0, th + offsetY);
        sketch.vertex(0, -th * 0.5 + offsetY);
      sketch.endShape(sketch.CLOSE);
  
      sketch.fill(sketch.lerpColor(baseColor, sketch.color(0), 0.4));
      sketch.beginShape();
        sketch.vertex(0, th + offsetY);
        sketch.vertex(0, -th * 0.5 + offsetY);
        sketch.vertex(tw, -th * 1.5 + offsetY);
        sketch.vertex(tw, 0 + offsetY);
      sketch.endShape(sketch.CLOSE);
  
      sketch.fill(sketch.lerpColor(baseColor, sketch.color(255), 0.25));
      sketch.beginShape();
        sketch.vertex(-tw, -th * 1.5 + offsetY);
        sketch.vertex(0, -th * 0.5 + offsetY);
        sketch.vertex(tw, -th * 1.5 + offsetY);
        sketch.vertex(0, -th * 2.5 + offsetY);
      sketch.endShape(sketch.CLOSE);
    }
  
    let windowCols = 2;
    let windowRows = Math.max(2, Math.floor(floors * 0.9));
    let windowW = tw / 3;
    let windowH = th / 3;
  
    for (let row = 0; row < windowRows; row++) {
      let wy = -buildingHeight + (row + 1) * (buildingHeight / (windowRows + 1));
  
      for (let col = 0; col < windowCols; col++) {
        let wxLeft = -tw + (col + 1) * (tw / (windowCols + 1));
        let wxRight = (col + 1) * (tw / (windowCols + 1));
  
        let windowSeedLeft = XXH.h32("window:" + [i, j, col, row], worldSeed);
        sketch.fill(windowSeedLeft % 3 !== 0 ? sketch.color(255, 255, 150, 200) : sketch.color(50, 50, 80, 200));
        sketch.beginShape();
          sketch.vertex(wxLeft - windowW/2, wy - windowH/2);
          sketch.vertex(wxLeft, wy);
          sketch.vertex(wxLeft, wy + windowH);
          sketch.vertex(wxLeft - windowW/2, wy + windowH/2);
        sketch.endShape(sketch.CLOSE);
  
        let windowSeedRight = XXH.h32("windowR:" + [i, j, col, row], worldSeed);
        sketch.fill(windowSeedRight % 3 !== 0 ? sketch.color(255, 255, 150, 200) : sketch.color(50, 50, 80, 200));
        sketch.beginShape();
          sketch.vertex(wxRight, wy);
          sketch.vertex(wxRight + windowW/2, wy - windowH/2);
          sketch.vertex(wxRight + windowW/2, wy + windowH/2);
          sketch.vertex(wxRight, wy + windowH);
        sketch.endShape(sketch.CLOSE);
      }
    }
  
    if (floors >= 10) {
      let rooftopSeed = XXH.h32("roof:" + [i, j], worldSeed);
      let rooftopType;
      if (floors >= 12) {
        rooftopType = rooftopSeed % 3;
      } else {
        rooftopType = 1 + (rooftopSeed % 2);
      }
  
      sketch.push();
      sketch.translate(0, -buildingHeight - th);
  
      if (rooftopType === 0) {
        sketch.stroke(200);
        sketch.strokeWeight(1.5);
        sketch.line(0, 0, 0, -10);
        sketch.noStroke();
        sketch.fill(200, 200, 220);
        sketch.ellipse(0, -10, 3, 3);
      } else if (rooftopType === 1) {
        sketch.fill(180, 180, 200);
        sketch.beginShape();
          sketch.vertex(-4, 0);
          sketch.vertex(0, 2);
          sketch.vertex(4, 0);
          sketch.vertex(0, -2);
        sketch.endShape(sketch.CLOSE);
  
        sketch.fill(160, 160, 180);
        sketch.beginShape();
          sketch.vertex(-4, 0);
          sketch.vertex(-4, -6);
          sketch.vertex(0, -4);
          sketch.vertex(0, 2);
        sketch.endShape(sketch.CLOSE);
  
        sketch.fill(140, 140, 160);
        sketch.beginShape();
          sketch.vertex(4, 0);
          sketch.vertex(4, -6);
          sketch.vertex(0, -4);
          sketch.vertex(0, 2);
        sketch.endShape(sketch.CLOSE);
  
        sketch.fill(200, 200, 220);
        sketch.beginShape();
          sketch.vertex(-4, -6);
          sketch.vertex(0, -4);
          sketch.vertex(4, -6);
          sketch.vertex(0, -8);
        sketch.endShape(sketch.CLOSE);
      } else if (rooftopType === 2) {
        sketch.fill(100);
        sketch.beginShape();
          sketch.vertex(-5, 0);
          sketch.vertex(0, 2.5);
          sketch.vertex(5, 0);
          sketch.vertex(0, -2.5);
        sketch.endShape(sketch.CLOSE);
  
        sketch.fill(80);
        sketch.beginShape();
          sketch.vertex(-5, 0);
          sketch.vertex(-5, -5);
          sketch.vertex(0, -2.5);
          sketch.vertex(0, 2.5);
        sketch.endShape(sketch.CLOSE);
  
        sketch.fill(60);
        sketch.beginShape();
          sketch.vertex(5, 0);
          sketch.vertex(5, -5);
          sketch.vertex(0, -2.5);
          sketch.vertex(0, 2.5);
        sketch.endShape(sketch.CLOSE);
  
        sketch.fill(120);
        sketch.beginShape();
          sketch.vertex(-5, -5);
          sketch.vertex(0, -2.5);
          sketch.vertex(5, -5);
          sketch.vertex(0, -7.5);
        sketch.endShape(sketch.CLOSE);
      }
      sketch.pop();
    }
  }
  
};


//WORLD 3 Space UFO

"use strict";

const s3 = (sketch) => {
  let tile_width_step_main;
  let tile_height_step_main;
  let tile_rows, tile_columns;
  let camera_offset;
  let camera_velocity;

  let worldSeed;
  let nebulaColorShift = 0;

  let shipI = 0;
  let shipJ = 0;

  let ufoImage;

  let tileWidthControl = 16;
  let tileHeightControl = 8;
  let shipSizeControl = 48;

  let shootingStars = [];
  let lastStarSpawnTime = 0;
  let starSpawnInterval = 1000;

  sketch.preload = () => {
    ufoImage = sketch.loadImage("https://cdn.glitch.global/476ecba4-fb12-45bf-ae10-5174b69877db/pixel-art-illustration-ufo-pixelated-ufo-farm-ufo-space-alien-pixelated-for-the-pixel-art-game-and-icon-for-website-and-video-game-old-school-retro-vector.png?v=1745816086351");
  };

  sketch.setup = () => {
    let canvas = sketch.createCanvas(800, 400);
    canvas.parent("canvas-container3");

    camera_offset = new p5.Vector(-sketch.width / 2, sketch.height / 2);
    camera_velocity = new p5.Vector(0, 0);

    let label = sketch.createP();
    label.html("World key: ");
    label.parent("canvas-container3");

    let input = sketch.createInput("UFO");
    input.parent(label);
    input.input(() => {
      rebuildWorld(input.value());
    });

    sketch.createP("Arrow keys scroll. WASD to move spaceship.").parent("canvas-container3");

    rebuildWorld(input.value());
  };

  function rebuildWorld(key) {
    worldSeed = XXH.h32(key, 0);
    sketch.noiseSeed(worldSeed);
    sketch.randomSeed(worldSeed);
    shipI = 0;
    shipJ = 0;

    tile_width_step_main = tileWidthControl;
    tile_height_step_main = tileHeightControl;
    tile_columns = Math.ceil(sketch.width / (tile_width_step_main * 2));
    tile_rows = Math.ceil(sketch.height / (tile_height_step_main * 2));
  }

  sketch.mouseClicked = () => {
    let world_pos = screenToWorld(
      [0 - sketch.mouseX, sketch.mouseY],
      [camera_offset.x, camera_offset.y]
    );

    return false;
  };

  sketch.draw = () => {
    if (sketch.keyIsDown(sketch.LEFT_ARROW)) camera_velocity.x -= 1;
    if (sketch.keyIsDown(sketch.RIGHT_ARROW)) camera_velocity.x += 1;
    if (sketch.keyIsDown(sketch.DOWN_ARROW)) camera_velocity.y -= 1;
    if (sketch.keyIsDown(sketch.UP_ARROW)) camera_velocity.y += 1;

    let camera_delta = new p5.Vector(0, 0);
    camera_velocity.add(camera_delta);
    camera_offset.add(camera_velocity);
    camera_velocity.mult(0.95);
    if (camera_velocity.mag() < 0.01) {
      camera_velocity.setMag(0);
    }

    let world_pos = screenToWorld(
      [0 - sketch.mouseX, sketch.mouseY],
      [camera_offset.x, camera_offset.y]
    );
    let world_offset = cameraToWorldOffset([camera_offset.x, camera_offset.y]);

    sketch.background(100);

    nebulaColorShift += 0.002;

    let overdraw = 0.1;
    let y0 = Math.floor((0 - overdraw) * tile_rows);
    let y1 = Math.floor((1 + overdraw) * tile_rows);
    let x0 = Math.floor((0 - overdraw) * tile_columns);
    let x1 = Math.floor((1 + overdraw) * tile_columns);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        drawTile(tileRenderingOrder([x + world_offset.x, y - world_offset.y]), [camera_offset.x, camera_offset.y]);
      }
      for (let x = x0; x < x1; x++) {
        drawTile(tileRenderingOrder([x + 0.5 + world_offset.x, y + 0.5 - world_offset.y]), [camera_offset.x, camera_offset.y]);
      }
    }

    describeMouseTile(world_pos, [camera_offset.x, camera_offset.y]);

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      shootingStars[i].update();
      shootingStars[i].draw();
      if (shootingStars[i].isOffScreen()) {
        shootingStars.splice(i, 1);
      }
    }

    if (sketch.millis() - lastStarSpawnTime > starSpawnInterval) {
      let numStars = Math.floor(sketch.random(2, 5));
      for (let n = 0; n < numStars; n++) {
        shootingStars.push(new ShootingStar());
      }
      lastStarSpawnTime = sketch.millis();
    }
  };

  sketch.keyPressed = () => {
    if (sketch.key === 'w' || sketch.key === 'W') { shipI -= 1; shipJ -= 1; }
    if (sketch.key === 's' || sketch.key === 'S') { shipI += 1; shipJ += 1; }
    if (sketch.key === 'a' || sketch.key === 'A') { shipI += 1; shipJ -= 1; }
    if (sketch.key === 'd' || sketch.key === 'D') { shipI -= 1; shipJ += 1; }
  };

  function worldToScreen([world_x, world_y], [camera_x, camera_y]) {
    let i = (world_x - world_y) * tile_width_step_main;
    let j = (world_x + world_y) * tile_height_step_main;
    return [i + camera_x, j + camera_y];
  }

  function screenToWorld([screen_x, screen_y], [camera_x, camera_y]) {
    screen_x -= camera_x;
    screen_y -= camera_y;
    screen_x /= tile_width_step_main * 2;
    screen_y /= tile_height_step_main * 2;
    screen_y += 0.5;
    return [Math.floor(screen_y + screen_x), Math.floor(screen_y - screen_x)];
  }

  function cameraToWorldOffset([camera_x, camera_y]) {
    let world_x = camera_x / (tile_width_step_main * 2);
    let world_y = camera_y / (tile_height_step_main * 2);
    return { x: Math.round(world_x), y: Math.round(world_y) };
  }

  function tileRenderingOrder(offset) {
    return [offset[1] - offset[0], offset[0] + offset[1]];
  }

  function drawTile([world_x, world_y], [camera_x, camera_y]) {
    let [screen_x, screen_y] = worldToScreen([world_x, world_y], [camera_x, camera_y]);
    sketch.push();
    sketch.translate(0 - screen_x, screen_y);
    drawTileContent(world_x, world_y);
    sketch.pop();
  }

  function describeMouseTile([world_x, world_y], [camera_x, camera_y]) {
    let [screen_x, screen_y] = worldToScreen([world_x, world_y], [camera_x, camera_y]);
    drawTileDescription([world_x, world_y], [0 - screen_x, screen_y]);
  }

  function drawTileDescription([world_x, world_y], [screen_x, screen_y]) {
    sketch.push();
    sketch.translate(screen_x, screen_y);
    sketch.pop();
  }

  function drawTileContent(i, j) {
    sketch.push();
    sketch.noStroke();

    let [tw, th] = [tileWidthControl, tileHeightControl];
    sketch.translate(-shipI * tw % (tw * 2), -shipJ * th % (th * 2));
    drawSpaceBackground(i, j);

    if (i === 0 && j === 0) {
      sketch.imageMode(sketch.CENTER);
      sketch.image(ufoImage, 0, 0, shipSizeControl, shipSizeControl);
    }

    sketch.pop();
  }

  function drawSpaceBackground(i, j) {
    sketch.colorMode(sketch.RGB, 255);
    let [tw, th] = [tileWidthControl, tileHeightControl];
    let worldX = i + shipI;
    let worldY = j + shipJ;
    let noiseVal = sketch.noise((worldX / 10) + nebulaColorShift, (worldY / 10) + nebulaColorShift);

    if (noiseVal < 0.4) {
      sketch.fill(10, 10, 20);
    } else {
      let colorPicker = sketch.noise((worldX / 6.66) + 1000 + nebulaColorShift, (worldY / 6.66) + 1000 + nebulaColorShift);
      let r, g, b;

      if (colorPicker < 0.33) {
        r = 100 + sketch.noise(worldX * 0.5, worldY * 0.5) * 20;
        g = 50 + sketch.noise(worldX * 0.6, worldY * 0.6) * 20;
        b = 150 + sketch.noise(worldX * 0.7, worldY * 0.7) * 20;
      } else if (colorPicker < 0.66) {
        r = 50 + sketch.noise(worldX * 0.5, worldY * 0.5) * 20;
        g = 100 + sketch.noise(worldX * 0.6, worldY * 0.6) * 20;
        b = 180 + sketch.noise(worldX * 0.7, worldY * 0.7) * 20;
      } else {
        r = 200 + sketch.noise(worldX * 0.5, worldY * 0.5) * 20;
        g = 80 + sketch.noise(worldX * 0.6, worldY * 0.6) * 20;
        b = 140 + sketch.noise(worldX * 0.7, worldY * 0.7) * 20;
      }

      let brightnessNoise = sketch.noise(worldX * 0.5 + 5000, worldY * 0.5 + 5000);
      let brightnessFactor = sketch.map(brightnessNoise, 0, 1, 0.2, 0.5);

      r = sketch.constrain(r * brightnessFactor, 0, 255);
      g = sketch.constrain(g * brightnessFactor, 0, 255);
      b = sketch.constrain(b * brightnessFactor, 0, 255);

      sketch.fill(r, g, b);
    }

    sketch.beginShape();
    sketch.vertex(-tw, 0);
    sketch.vertex(0, th);
    sketch.vertex(tw, 0);
    sketch.vertex(0, -th);
    sketch.endShape(sketch.CLOSE);

    sketch.colorMode(sketch.HSB, 360, 100, 100);
    let starSeed = XXH.h32("star:" + [worldX, worldY], worldSeed);
    if (starSeed % 20 == 0) {
      sketch.push();
      sketch.noStroke();
      sketch.fill(0, 0, 100, 0.9);
      sketch.ellipse(0, -8, 3, 3);
      sketch.pop();
    }
  }

  class ShootingStar {
    constructor() {
      this.x = sketch.random(-50, sketch.width + 50);
      this.y = sketch.random(-50, sketch.height + 50);
      let angle = sketch.random(sketch.TWO_PI);
      let speed = sketch.random(4, 8);
      this.speedX = sketch.cos(angle) * speed;
      this.speedY = sketch.sin(angle) * speed;
      this.size = sketch.random(2, 4);

      this.isRainbow = sketch.random(1) < 0.3;
      this.hue = sketch.random(360);
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.isRainbow) {
        this.hue += 3;
        if (this.hue > 360) this.hue -= 360;
      }
    }

    draw() {
      sketch.push();
      if (this.isRainbow) {
        sketch.stroke(this.hue, 100, 100, 0.9);
      } else {
        sketch.stroke(0, 0, 100, 0.8);
      }
      sketch.strokeWeight(this.size);
      sketch.point(this.x, this.y);
      sketch.pop();
    }

    isOffScreen() {
      return (this.x < -100 || this.x > sketch.width + 100 || this.y < -100 || this.y > sketch.height + 100);
    }
  }
};



// === Instance Controls ===
"use strict";

let p5_world1 = new p5(s1, "canvas-container1");
let p5_world2 = null;
let p5_world3 = null;

function startWorld1() {
  if (!p5_world1) {
    p5_world1 = new p5(s1, "canvas-container1");
    document.getElementById('start-world1').disabled = true;
    document.getElementById('stop-world1').disabled = false;
  }
}

function stopWorld1() {
  if (p5_world1) {
    p5_world1.remove();
    p5_world1 = null;
    document.getElementById('start-world1').disabled = false;
    document.getElementById('stop-world1').disabled = true;
  }
}

function startWorld2() {
  if (!p5_world2) {
    p5_world2 = new p5(s2, "canvas-container2");
    document.getElementById('start-world2').disabled = true;
    document.getElementById('stop-world2').disabled = false;
  }
}

function stopWorld2() {
  if (p5_world2) {
    p5_world2.remove();
    p5_world2 = null;
    document.getElementById('start-world2').disabled = false;
    document.getElementById('stop-world2').disabled = true;
  }
}

function startWorld3() {
  if (!p5_world3) {
    p5_world3 = new p5(s3, "canvas-container3");
    document.getElementById('start-world3').disabled = true;
    document.getElementById('stop-world3').disabled = false;
  }
}

function stopWorld3() {
  if (p5_world3) {
    p5_world3.remove();
    p5_world3 = null;
    document.getElementById('start-world3').disabled = false;
    document.getElementById('stop-world3').disabled = true;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('start-world1').disabled = true;
  document.getElementById('stop-world1').disabled = false;
  
  document.getElementById('start-world1').addEventListener('click', startWorld1);
  document.getElementById('stop-world1').addEventListener('click', stopWorld1);

  document.getElementById('start-world2').addEventListener('click', startWorld2);
  document.getElementById('stop-world2').addEventListener('click', stopWorld2);

  document.getElementById('start-world3').addEventListener('click', startWorld3);
  document.getElementById('stop-world3').addEventListener('click', stopWorld3);
});

