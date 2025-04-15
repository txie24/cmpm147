// sketch.js
// Author: Your Name


// SKY
const SKY_COLOR          = "#5FA8CB";

// Clouds (streaky cirrus clouds)
const NUM_CLOUDS         = 6;
const CLOUD_MIN_SIZE     = 70;
const CLOUD_MAX_SIZE     = 180;
const CLOUD_MIN_SPEED    = 0.25;
const CLOUD_MAX_SPEED    = 0.7;

// Background Mountains
const MOUNTAIN_COLOR     = "#7C8C94";
const MOUNTAIN_NOISE_FREQ= 0.007;
const MOUNTAIN_MIN_Y     = 0.30;
const MOUNTAIN_MAX_Y     = 0.60;
const MOUNTAIN_EXTRA_MARGIN = 0.1;

// Foreground Mountains (different pattern)
const FOREGROUND_MOUNTAIN_COLOR = "#4B5763 ";
const FOREGROUND_MOUNTAIN_NOISE_FREQ = 0.008;
const FOREGROUND_MOUNTAIN_MIN_Y  = 0.32;
const FOREGROUND_MOUNTAIN_MAX_Y  = 0.62;
const FOREGROUND_MOUNTAIN_EXTRA_MARGIN = 0.1;

// Dunes

const DUNE_DATA = [
  {
    // Rearmost dune (background)
    baselineFactor: 0.85,
    topColor:    "#FDE3C4",
    bottomColor: "#E6B882",
    strokeColor: "#A97946",
    ridgeFactor: 0.45
  },
  {
    // Middle dune
    baselineFactor: 0.890,
    topColor:    "#F8D6AB",
    bottomColor: "#E0AD72",
    strokeColor: "#B3844E",
    ridgeFactor: 0.50
  },
  {
    // Front dune (foreground)
    baselineFactor: 0.94,
    topColor:    "#F8CB9D",
    bottomColor: "#CE9459",
    strokeColor: "#995F2E",
    ridgeFactor: 0.55
  }
];

// Dune geometry
const STEP            = 5;
const DUNE_NOISE_FREQ = 0.007;
const DUNE_SLOPE_SCALE= -0.3;    // negative => "∪" shape
const DUNE_AMPLITUDE  = 0.04;
const DUNE_EXTRA_MARGIN = 0.1;   // extend dune domain horizontally beyond edges
const DUNE_BOTTOM_EXTENSION = 0.15;  // extend downward 15% of canvas height
const DUNE_GRADIENT_EXTENSION = 0.1;   // extend gradient 10% of canvas height downward

// Parallax Factors
const PARALLAX_SKY       = 0.01;    // Sky shifts very little.
const PARALLAX_CLOUD     = 0.05;    // Clouds shift modestly.
const PARALLAX_MOUNTAIN  = 0.03;    // Background mountains shift moderately.
const PARALLAX_DUNE      = 0.1;     // Dunes shift the most.
const PARALLAX_FOREGROUND_MOUNTAIN = PARALLAX_MOUNTAIN * 1.2; // Foreground mountain moves more.

// Additional constants for the dune wiggly shadow.
const DUNE_WIGGLE_AMOUNT = 30;   // maximum horizontal wiggle in pixels.
const DUNE_SHADOW_WIDTH  = 30;   // width (in pixels) of the left shadow gradient.

// Offset for background mountain upward
const MOUNTAIN_UPPER_OFFSET = 0.001;   // fraction of canvas height

// --------------------------------------------------
// GLOBAL VARIABLES
// --------------------------------------------------
let randomSeedVal;
let mountainShape = [];             // Background mountain shape.
let foregroundMountainShape = [];   // Foreground mountain shape (distinct pattern).
let duneShapes    = [];
let clouds        = [];
let canvasContainer;

// --------------------------------------------------
// p5.js SETUP
// --------------------------------------------------
function setup() {
  canvasContainer = $("#canvas-container");
  let c = createCanvas(canvasContainer.width(), canvasContainer.height());
  c.parent("canvas-container");

  // Handle responsive resizing.
  $(window).resize(function() {
    resizeCanvas(canvasContainer.width(), canvasContainer.height());
    initScene();
  });
  resizeCanvas(canvasContainer.width(), canvasContainer.height());

  // Random seed for reproducible noise.
  randomSeedVal = floor(random(999999));
  noiseSeed(randomSeedVal);
  randomSeed(randomSeedVal);

  initScene();
}

// --------------------------------------------------
// p5.js DRAW
// --------------------------------------------------
function draw() {
  // Instead of just let skyOffsetY = PARALLAX_SKY * (mouseY - height / 2)
  // we clamp the vertical offset so it can't go negative:
  function parallaxDownOnly(mouseYVal, factor) {
    // mouseYVal - (height/2) is how much Y has moved relative to center.
    // We clamp it so the offset is never below 0 => no upward movement.
    let offset = mouseYVal - height/2;
    if (offset < 0) offset = 0;  // clamp
    return factor * offset;
  }

  // 1) Draw the sky with parallax (horizontal + down only).
  {
    let skyOffsetX = PARALLAX_SKY * (mouseX - width / 2);
    let skyOffsetY = parallaxDownOnly(mouseY, PARALLAX_SKY);
    push();
    translate(skyOffsetX, skyOffsetY);
    noStroke();
    fill(SKY_COLOR);
    rect(-width * 0.1, -height * 0.1, width * 1.2, height * 1.2);
    pop();
  }

  // 2) Update clouds, then draw with horizontal + downward parallax.
  updateClouds();
  {
    let cloudOffsetX = PARALLAX_CLOUD * (mouseX - width / 2);
    let cloudOffsetY = parallaxDownOnly(mouseY, PARALLAX_CLOUD);
    push();
    translate(cloudOffsetX, cloudOffsetY);
    drawClouds();
    pop();
  }

  // 3) Background mountain, horizontal + down only.
  {
    let mountainOffsetX = PARALLAX_MOUNTAIN * (mouseX - width / 2);
    // Also subtract the MOUNTAIN_UPPER_OFFSET but keep the rest of Y downward only.
    // So we clamp the part from mouse, then subtract the static offset for the mountain.
    let dynOffsetY = parallaxDownOnly(mouseY, PARALLAX_MOUNTAIN);
    let mountainOffsetY = dynOffsetY - (height * MOUNTAIN_UPPER_OFFSET);
    push();
    translate(mountainOffsetX, mountainOffsetY);
    drawMountain();
    pop();
  }

  // 4) Foreground mountain, horizontal + down only.
  {
    let fgMountainOffsetX = PARALLAX_FOREGROUND_MOUNTAIN * (mouseX - width / 2);
    let fgMountainOffsetY = parallaxDownOnly(mouseY, PARALLAX_FOREGROUND_MOUNTAIN);
    push();
    translate(fgMountainOffsetX, fgMountainOffsetY);
    drawForegroundMountain();
    pop();
  }

  // 5) Finally, draw dunes with horizontal + down only parallax.
  duneShapes.forEach((shape, i) => {
    let layerFactor = (i + 1) / DUNE_DATA.length;
    let duneOffsetX = PARALLAX_DUNE * layerFactor * (mouseX - width / 2);
    let duneOffsetY = parallaxDownOnly(mouseY, PARALLAX_DUNE * layerFactor);
    push();
    translate(duneOffsetX, duneOffsetY);
    let { topColor, bottomColor, strokeColor } = DUNE_DATA[i];
    drawDuneWithGradient(shape, topColor, bottomColor, strokeColor);
    drawDuneWigglyShadow(shape);
    pop();
  });
}


// --------------------------------------------------
// INIT SCENE
// --------------------------------------------------
function initScene() {
  // 1) Create background mountain shape.
  mountainShape = createMountainShape();

  // 2) Create foreground mountain shape with different pattern.
  foregroundMountainShape = createForegroundMountainShape();

  // 3) Create dunes.
  duneShapes = [];
  for (let i = 0; i < DUNE_DATA.length; i++) {
    let d = DUNE_DATA[i];
    let globalOffset = random(-width * 0.03, width * 0.03);
    duneShapes.push(createInvertedDuneShape(d.baselineFactor, d.ridgeFactor, globalOffset));
  }

  // 4) Create clouds.
  clouds = [];
  for (let i = 0; i < NUM_CLOUDS; i++) {
    let size  = random(CLOUD_MIN_SIZE, CLOUD_MAX_SIZE);
    let speed = random(CLOUD_MIN_SPEED, CLOUD_MAX_SPEED);
    let startX = random(-size, width);
    let startY = random(height * 0.05, height * 0.4);
    let streaks = [];
    let numStreaks = floor(random(2, 5));
    for (let s = 0; s < numStreaks; s++) {
      streaks.push({
        offsetX: random(-size * 0.5, size * 0.5),
        offsetY: random(-size * 0.25, size * 0.25),
        length:  random(size * 0.8, size * 1.6),
        thickness: random(8, 20),
        swirlFactor: random(0.3, 1.0)
      });
    }
    clouds.push({ x: startX, y: startY, speed, streaks });
  }
}

// --------------------------------------------------
// CREATE BACKGROUND MOUNTAIN SHAPE
// (Noise-based, sharpened peak; extended horizontally.)
// --------------------------------------------------
function createMountainShape() {
  let margin = width * MOUNTAIN_EXTRA_MARGIN;
  let shape = [];
  shape.push([-margin, height]); // Left anchor.
  let topPoints = [];
  for (let x = -margin; x <= width + margin; x += STEP) {
    let n = noise((x + margin) * MOUNTAIN_NOISE_FREQ);
    let yVal = map(n, 0, 1, height * MOUNTAIN_MIN_Y, height * MOUNTAIN_MAX_Y);
    topPoints.push([x, yVal]);
  }
  let minIndex = 0, minYValue = Infinity;
  for (let i = 0; i < topPoints.length; i++) {
    if (topPoints[i][1] < minYValue) {
      minYValue = topPoints[i][1];
      minIndex = i;
    }
  }
  let windowSize = 2, peakStrength = 0.95;
  for (let i = minIndex - windowSize; i <= minIndex + windowSize; i++) {
    if (i >= 0 && i < topPoints.length) {
      let dist = abs(i - minIndex);
      let weight = 1 - (dist / (windowSize + 1));
      topPoints[i][1] = lerp(topPoints[i][1], minYValue, weight * peakStrength);
    }
  }
  shape.push(...topPoints);
  shape.push([width + margin, height]); // Right anchor.
  return shape;
}

// --------------------------------------------------
// CREATE FOREGROUND MOUNTAIN SHAPE
// (Different noise parameters for a distinct pattern.)
// --------------------------------------------------
function createForegroundMountainShape() {
  let margin = width * FOREGROUND_MOUNTAIN_EXTRA_MARGIN;
  let shape = [];
  shape.push([-margin, height]); // Left anchor.
  let topPoints = [];
  for (let x = -margin; x <= width + margin; x += STEP) {
    let n = noise((x + margin) * FOREGROUND_MOUNTAIN_NOISE_FREQ);
    let yVal = map(n, 0, 1, height * FOREGROUND_MOUNTAIN_MIN_Y, height * FOREGROUND_MOUNTAIN_MAX_Y);
    topPoints.push([x, yVal]);
  }
  let minIndex = 0, minYValue = Infinity;
  for (let i = 0; i < topPoints.length; i++) {
    if (topPoints[i][1] < minYValue) {
      minYValue = topPoints[i][1];
      minIndex = i;
    }
  }
  let windowSize = 2, peakStrength = 0.95;
  for (let i = minIndex - windowSize; i <= minIndex + windowSize; i++) {
    if (i >= 0 && i < topPoints.length) {
      let dist = abs(i - minIndex);
      let weight = 1 - (dist / (windowSize + 1));
      topPoints[i][1] = lerp(topPoints[i][1], minYValue, weight * peakStrength);
    }
  }
  shape.push(...topPoints);
  shape.push([width + margin, height]); // Right anchor.
  return shape;
}

// --------------------------------------------------
// DRAW BACKGROUND MOUNTAIN
// --------------------------------------------------
function drawMountain() {
  noStroke();
  fill(MOUNTAIN_COLOR);
  beginShape();
  mountainShape.forEach(([vx, vy]) => vertex(vx, vy));
  endShape(CLOSE);
}

// --------------------------------------------------
// DRAW FOREGROUND MOUNTAIN
// --------------------------------------------------
function drawForegroundMountain() {
  noStroke();
  fill(FOREGROUND_MOUNTAIN_COLOR);
  beginShape();
  foregroundMountainShape.forEach(([vx, vy]) => vertex(vx, vy));
  endShape(CLOSE);
}

// --------------------------------------------------
// CREATE INVERTED DUNE (∪ shape)
// --------------------------------------------------
function createInvertedDuneShape(baselineFactor, ridgeFactor, globalOffset) {
  let extra = width * DUNE_EXTRA_MARGIN;
  let domainLeft = -extra;
  let domainRight = width + extra;
  let domainWidth = domainRight - domainLeft;
  let shape = [];
  // Left anchor extended downward.
  shape.push([domainLeft + globalOffset, height + height * DUNE_BOTTOM_EXTENSION]);
  
  let initialRidgeX = domainLeft + domainWidth * ridgeFactor;
  let ridgeRandomOffset = random(-width * 0.05, width * 0.05);
  let ridgeX = constrain(initialRidgeX + ridgeRandomOffset, domainLeft, domainRight);
  
  for (let x = domainLeft; x <= domainRight; x += STEP) {
    let baseY = height * baselineFactor;
    let slope;
    if (x < ridgeX) {
      let frac = map(x, domainLeft, ridgeX, 0, 1);
      slope = frac * (height * DUNE_SLOPE_SCALE);
    } else {
      let frac = map(x, ridgeX, domainRight, 1, 0);
      slope = frac * (height * DUNE_SLOPE_SCALE);
    }
    let n = noise(x * DUNE_NOISE_FREQ, baselineFactor * 10);
    let noiseOffset = map(n, 0, 1, -height * DUNE_AMPLITUDE, height * DUNE_AMPLITUDE);
    let yVal = baseY + slope + noiseOffset;
    shape.push([x + globalOffset, yVal]);
  }
  
  // Right anchor extended downward.
  shape.push([domainRight + globalOffset, height + height * DUNE_BOTTOM_EXTENSION]);
  return shape;
}

// --------------------------------------------------
// DRAW DUNE with vertical gradient & stroke
// --------------------------------------------------
function drawDuneWithGradient(shapeArray, colorTop, colorBottom, strokeColor="#000000") {
  let minY = Infinity, maxY = -Infinity;
  shapeArray.forEach(([ , y]) => {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  let extendedMaxY = maxY + height * DUNE_GRADIENT_EXTENSION;
  let ctx = drawingContext;
  let gradient = ctx.createLinearGradient(0, minY, 0, extendedMaxY);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);
  ctx.fillStyle = gradient;
  stroke(strokeColor);
  strokeWeight(2);
  beginShape();
  shapeArray.forEach(([vx, vy]) => vertex(vx, vy));
  endShape(CLOSE);
}

// --------------------------------------------------
// NEW: DRAW DUNE WIGGLY SHADOW
// For each dune, find its highest point (peak) along the crest,
// then draw a wiggly vertical line down from that point to the bottom of the dune,
// and on the left side of that line, overlay a shadow gradient.
// --------------------------------------------------
function drawDuneWigglyShadow(shapeArray) {
  // 1) Find the dune’s highest point (the minimum y) as our “peak.”
  let peak = null;
  let minY = Infinity;
  shapeArray.forEach(([x, y]) => {
    if (y < minY) {
      minY = y;
      peak = [x, y];
    }
  });
  if (!peak) return;

  // 2) Make a smooth wiggly line from the peak down to the canvas bottom.
  //    (We’ll clip to the dune so it never draws outside.)
  let bottomY = height;  // or shape’s actual max Y, but usually the dune extends to canvas bottom
  let numSegments = 20;
  let wiggleLine = [];
  for (let i = 0; i <= numSegments; i++) {
    let t = i / numSegments;
    let y = lerp(peak[1], bottomY, t);

    // Noise-based horizontal offset
    let n = 0, freq = 1.0, amp = 1.0;
    for (let octave = 0; octave < 3; octave++) {
      n += noise(randomSeedVal + t * freq) * amp;
      freq *= 2;
      amp *= 0.5;
    }
    let offset = map(n, 0, 1, -DUNE_WIGGLE_AMOUNT, DUNE_WIGGLE_AMOUNT);

    // Fade wiggle near top/bottom
    let fade = 1 - pow(abs(t - 0.5) / 0.5, 2);
    offset *= fade;

    let x = peak[0] + offset;
    wiggleLine.push([x, y]);
  }

  // 3) Construct a “shadow polygon” on the left side:
  //    from the wiggly line back to the left edge
  //    (Change this if you prefer to follow the dune’s left boundary exactly.)
  let leftSide = wiggleLine.map(([_, wy]) => [0, wy]);
  let shadowPolygon = leftSide.concat([...wiggleLine].reverse());

  // 4) Find bounding box of that shadow polygon.
  //    We’ll extend the fill down to the dune’s bottom so it doesn’t show a cutoff.
  let polyMinX = Infinity, polyMaxX = -Infinity;
  let polyMinY = Infinity;
  shadowPolygon.forEach(([sx, sy]) => {
    if (sx < polyMinX) polyMinX = sx;
    if (sx > polyMaxX) polyMaxX = sx;
    if (sy < polyMinY) polyMinY = sy;
  });

  // Also find the dune’s actual bottom so the gradient goes that far.
  let duneMaxY = shapeArray.reduce(
    (acc, [vx, vy]) => (vy > acc ? vy : acc),
    -Infinity
  );

  // 5) Clip to the dune shape so we never draw above the crest or outside the dune.
  let ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  shapeArray.forEach(([vx, vy], i) => {
    i === 0 ? ctx.moveTo(vx, vy) : ctx.lineTo(vx, vy);
  });
  ctx.closePath();
  ctx.clip();

  // 6) Clip again to the wiggly shadow polygon. The effective draw region is
  //    the intersection of the dune shape and the shadow polygon.
  ctx.beginPath();
  shadowPolygon.forEach(([sx, sy], i) => {
    i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
  });
  ctx.closePath();
  ctx.clip();

  // 7) Fill a left-to-right gradient from polyMinX to polyMaxX,
  //    and from the top of this shadow region down to the dune’s bottom.
  let grad = ctx.createLinearGradient(polyMinX, 0, polyMaxX, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");    // fully transparent on the left edge
  grad.addColorStop(1, "rgba(0,0,0,0.4)"); // darker near the wiggly line
  ctx.fillStyle = grad;

  // Fill from the shadow’s upper boundary (polyMinY) all the way to dune bottom.
  ctx.fillRect(polyMinX, polyMinY, (polyMaxX - polyMinX), (duneMaxY - polyMinY));

  ctx.restore(); // done clipping
}




// --------------------------------------------------
// CLOUDS (Streaky, Cirrus-type)
// --------------------------------------------------
function drawClouds() {
  noFill();
  strokeCap(ROUND);
  strokeJoin(ROUND);
  
  clouds.forEach(cloud => {
    push();
    translate(cloud.x, cloud.y);
    cloud.streaks.forEach(st => {
      drawCloudStreak(st.offsetX, st.offsetY, st.length, st.thickness, st.swirlFactor);
    });
    pop();
  });
}

// --------------------------------------------------
// UPDATE CLOUDS
// --------------------------------------------------
function updateClouds() {
  clouds.forEach(cloud => {
    cloud.x += cloud.speed;
    let maxSize = 0;
    cloud.streaks.forEach(st => {
      if (st.length > maxSize) maxSize = st.length;
    });
    if (cloud.x > width + maxSize) {
      cloud.x = -maxSize;
      cloud.y = random(height * 0.05, height * 0.4);
    }
  });
}

// --------------------------------------------------
// HELPER: drawCloudStreak()
// Draws a single wispy streak as a curve using Perlin noise.
// --------------------------------------------------
function drawCloudStreak(cx, cy, length, thickness, swirlFactor) {
  stroke("rgba(186,201,218,0.75)");
  strokeWeight(thickness);
  
  let segments = 30;
  beginShape();
  for (let i = 0; i <= segments; i++) {
    let t = i / segments;
    let x = cx + map(t, 0, 1, -length / 2, length / 2);
    let n = noise(t * 2, swirlFactor * 10);
    let wave = (n - 0.5) * 2 * swirlFactor * thickness;
    let y = cy + wave;
    curveVertex(x, y);
  }
  endShape();
}
