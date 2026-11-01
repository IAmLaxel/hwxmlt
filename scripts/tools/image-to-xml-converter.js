let loadedImg = null;
let originalAspectRatio = 1;

document.getElementById("imageInput").addEventListener("change", function (e) {
  if (!e.target.files[0]) return;
  const reader = new FileReader();
  reader.onload = function (event) {
    loadedImg = new Image();
    loadedImg.onload = function () {
      originalAspectRatio = loadedImg.height / loadedImg.width;
      let baseW = 150;
      let baseH = parseFloat((baseW * originalAspectRatio).toFixed(2));

      document.getElementById("targetWidthHW").value = baseW;
      document.getElementById("targetHeightHW").value = baseH;
      updateCalculatedHWDisplay();
    };
    loadedImg.src = event.target.result;
  };
  reader.readAsDataURL(e.target.files[0]);
});

function onWidthHWChange() {
  if (document.getElementById("lockAspect").checked && originalAspectRatio) {
    let w = parseFloat(document.getElementById("targetWidthHW").value) || 0;
    document.getElementById("targetHeightHW").value = (
      w * originalAspectRatio
    ).toFixed(2);
  }
  updateCalculatedHWDisplay();
}

function onHeightHWChange() {
  if (document.getElementById("lockAspect").checked && originalAspectRatio) {
    let h = parseFloat(document.getElementById("targetHeightHW").value) || 0;
    document.getElementById("targetWidthHW").value = (
      h / originalAspectRatio
    ).toFixed(2);
  }
  updateCalculatedHWDisplay();
}

function updateCalculatedHWDisplay() {
  let hwW = parseFloat(document.getElementById("targetWidthHW").value) || 0;
  let hwH = parseFloat(document.getElementById("targetHeightHW").value) || 0;
  let charRatio = (hwH / 100).toFixed(1);

  document.getElementById("hwSizeDisplay").textContent =
    `Target XML Bounds: ${hwW.toFixed(1)} x ${hwH.toFixed(1)} HW Units (~${charRatio} character(s) tall)`;
}

function updateCanvasBackground() {
  const bg = document.getElementById("bgToggle").value;
  const canvas = document.getElementById("previewCanvas");
  canvas.style.background = bg;
}

function colorDistance(c1, c2) {
  if (!c1 || !c2) return 999;
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2),
  );
}

function despeckleGrid(grid, width, height) {
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let curr = grid[y][x];
      if (!curr) continue;

      let neighbors = [
        grid[y - 1][x],
        grid[y + 1][x],
        grid[y][x - 1],
        grid[y][x + 1],
      ].filter(Boolean);

      if (neighbors.length >= 3) {
        let avgR = 0,
          avgG = 0,
          avgB = 0;
        neighbors.forEach((n) => {
          avgR += n.r;
          avgG += n.g;
          avgB += n.b;
        });
        avgR = Math.round(avgR / neighbors.length);
        avgG = Math.round(avgG / neighbors.length);
        avgB = Math.round(avgB / neighbors.length);

        if (colorDistance(curr, { r: avgR, g: avgG, b: avgB }) > 45) {
          grid[y][x] = { r: avgR, g: avgG, b: avgB };
        }
      }
    }
  }
}

function getBlobs(grid, width, height, tolerance, minPixels) {
  let visited = Array.from({ length: height }, () => Array(width).fill(false));
  let blobs = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (visited[y][x] || !grid[y][x]) continue;

      let seedColor = grid[y][x];
      let queue = [{ x, y }];
      visited[y][x] = true;
      let blobPixels = [];

      while (queue.length > 0) {
        let p = queue.shift();
        blobPixels.push(p);

        let neighbors = [
          { x: p.x + 1, y: p.y },
          { x: p.x - 1, y: p.y },
          { x: p.x, y: p.y + 1 },
          { x: p.x, y: p.y - 1 },
        ];

        for (let n of neighbors) {
          if (
            n.x >= 0 &&
            n.x < width &&
            n.y >= 0 &&
            n.y < height &&
            !visited[n.y][n.x] &&
            grid[n.y][n.x] &&
            colorDistance(grid[n.y][n.x], seedColor) <= tolerance
          ) {
            visited[n.y][n.x] = true;
            queue.push(n);
          }
        }
      }

      if (blobPixels.length >= minPixels) {
        blobs.push({
          id: blobs.length,
          color: seedColor,
          pixels: blobPixels,
        });
      }
    }
  }
  return blobs;
}

function buildScalarField(blobPixels, width, height) {
  let field = Array.from({ length: height + 1 }, () =>
    Array(width + 1).fill(0),
  );
  blobPixels.forEach((p) => {
    field[p.y][p.x] += 1;
    field[p.y + 1][p.x] += 1;
    field[p.y][p.x + 1] += 1;
    field[p.y + 1][p.x + 1] += 1;
  });
  return field;
}

function traceMarchingSquares(field, width, height) {
  let segments = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let tl = field[y][x] > 0 ? 1 : 0;
      let tr = field[y][x + 1] > 0 ? 1 : 0;
      let br = field[y + 1][x + 1] > 0 ? 1 : 0;
      let bl = field[y + 1][x] > 0 ? 1 : 0;

      let state = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (state === 0 || state === 15) continue;

      let top = { x: x + 0.5, y: y };
      let right = { x: x + 1, y: y + 0.5 };
      let bottom = { x: x + 0.5, y: y + 1 };
      let left = { x: x, y: y + 0.5 };

      switch (state) {
        case 1:
        case 14:
          segments.push([left, bottom]);
          break;
        case 2:
        case 13:
          segments.push([bottom, right]);
          break;
        case 3:
        case 12:
          segments.push([left, right]);
          break;
        case 4:
        case 11:
          segments.push([top, right]);
          break;
        case 5:
          segments.push([left, top]);
          segments.push([bottom, right]);
          break;
        case 6:
        case 9:
          segments.push([top, bottom]);
          break;
        case 7:
        case 8:
          segments.push([left, top]);
          break;
        case 10:
          segments.push([top, right]);
          segments.push([left, bottom]);
          break;
      }
    }
  }

  if (segments.length === 0) return [];

  let loops = [];
  while (segments.length > 0) {
    let seg = segments.pop();
    let loop = [seg[0], seg[1]];
    let matched = true;

    while (matched) {
      matched = false;
      let last = loop[loop.length - 1];

      for (let i = 0; i < segments.length; i++) {
        let s = segments[i];
        if (Math.hypot(s[0].x - last.x, s[0].y - last.y) < 0.01) {
          loop.push(s[1]);
          segments.splice(i, 1);
          matched = true;
          break;
        } else if (Math.hypot(s[1].x - last.x, s[1].y - last.y) < 0.01) {
          loop.push(s[0]);
          segments.splice(i, 1);
          matched = true;
          break;
        }
      }
    }
    if (loop.length > 3) loops.push(loop);
  }

  return loops[0] || [];
}

function perpendicularDistance(p, a, b) {
  let dx = b.x - a.x,
    dy = b.y - a.y;
  let mag = Math.hypot(dx, dy);
  if (mag === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let u = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (mag * mag);
  return Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy));
}

function purgeCollinearPoints(points) {
  if (points.length <= 3) return points;
  let result = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    let prev = result[result.length - 1];
    let curr = points[i];
    let next = points[i + 1];

    let d = perpendicularDistance(curr, prev, next);
    if (d > 0.05) {
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

function rdpSimplify(points, epsilon) {
  if (points.length <= 2) return points;
  let dmax = 0,
    index = 0,
    end = points.length - 1;

  for (let i = 1; i < end; i++) {
    let d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    let rec1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    let rec2 = rdpSimplify(points.slice(index), epsilon);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  } else {
    return [points[0], points[end]];
  }
}

function optimizeShape(points, maxVerts) {
  let straightened = purgeCollinearPoints(points);
  if (straightened.length <= maxVerts) return straightened;

  let epsilon = 0.05;
  let result = rdpSimplify(straightened, epsilon);

  while (result.length > maxVerts && epsilon < 6.0) {
    epsilon += 0.1;
    result = rdpSimplify(straightened, epsilon);
  }
  return result;
}

function expandInternalSeams(
  hwPoints,
  rawPoints,
  grid,
  internalW,
  internalH,
  dist,
) {
  let n = hwPoints.length;
  if (n < 3) return hwPoints;

  let expanded = [];
  for (let i = 0; i < n; i++) {
    let prev = hwPoints[(i - 1 + n) % n];
    let curr = hwPoints[i];
    let next = hwPoints[(i + 1) % n];

    let rawCurr = rawPoints[i];
    let gx = Math.floor(rawCurr.x);
    let gy = Math.floor(rawCurr.y);

    let hasNeighborShape = false;
    let hasEmptySpace = false;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        let ny = gy + dy;
        let nx = gx + dx;
        if (nx >= 0 && nx < internalW && ny >= 0 && ny < internalH) {
          if (grid[ny][nx] === null) {
            hasEmptySpace = true;
          } else {
            hasNeighborShape = true;
          }
        } else {
          hasEmptySpace = true;
        }
      }
    }

    let isInternalSeam = hasNeighborShape && !hasEmptySpace;

    if (isInternalSeam) {
      let v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      let v2 = { x: next.x - curr.x, y: next.y - curr.y };

      let len1 = Math.hypot(v1.x, v1.y) || 1;
      let len2 = Math.hypot(v2.x, v2.y) || 1;

      let n1 = { x: -v1.y / len1, y: v1.x / len1 };
      let n2 = { x: -v2.y / len2, y: v2.x / len2 };

      let avgN = { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 };
      let avgLen = Math.hypot(avgN.x, avgN.y) || 1;

      expanded.push({
        x: curr.x + (avgN.x / avgLen) * dist,
        y: curr.y + (avgN.y / avgLen) * dist,
      });
    } else {
      expanded.push({ x: curr.x, y: curr.y });
    }
  }
  return expanded;
}

function processImage() {
  const targetHW_W =
    parseFloat(document.getElementById("targetWidthHW").value) || 150;
  const targetHW_H =
    parseFloat(document.getElementById("targetHeightHW").value) || 150;
  const tolerance =
    parseInt(document.getElementById("colorTolerance").value) || 25;
  const minPixels =
    parseInt(document.getElementById("minShapePixels").value) || 8;
  const maxVertices =
    parseInt(document.getElementById("maxVertices").value) || 95;
  const applyDespeckle = document.getElementById("despeckle").checked;
  const enableExpand = document.getElementById("enableExpand").checked;
  const expandDist =
    parseFloat(document.getElementById("expandAmount").value) || 0.35;
  const status = document.getElementById("statusText");

  if (!loadedImg) {
    status.textContent = "Please select an image file first.";
    return;
  }

  const internalW = 1000;
  const internalH = Math.round(internalW * (targetHW_H / targetHW_W));

  const canvas = document.getElementById("previewCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = internalW;
  canvas.height = internalH;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = internalW;
  tempCanvas.height = internalH;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.drawImage(loadedImg, 0, 0, internalW, internalH);
  const imgData = tempCtx.getImageData(0, 0, internalW, internalH);
  const pixels = imgData.data;

  let grid = [];
  for (let y = 0; y < internalH; y++) {
    let row = [];
    for (let x = 0; x < internalW; x++) {
      let idx = (y * internalW + x) * 4;
      if (pixels[idx + 3] < 50) {
        row.push(null);
      } else {
        row.push({
          r: pixels[idx],
          g: pixels[idx + 1],
          b: pixels[idx + 2],
        });
      }
    }
    grid.push(row);
  }

  if (applyDespeckle) {
    despeckleGrid(grid, internalW, internalH);
  }

  let blobs = getBlobs(grid, internalW, internalH, tolerance, minPixels);
  let extractedPolygons = [];

  const scaleX = targetHW_W / internalW;
  const scaleY = targetHW_H / internalH;

  blobs.forEach((blob) => {
    let field = buildScalarField(blob.pixels, internalW, internalH);
    let rawVectorContour = traceMarchingSquares(field, internalW, internalH);

    if (rawVectorContour.length >= 3) {
      let optimized = optimizeShape(rawVectorContour, maxVertices);
      if (optimized.length >= 3) {
        let hwPoints = optimized.map((p) => ({
          x: p.x * scaleX,
          y: p.y * scaleY,
        }));

        if (enableExpand) {
          hwPoints = expandInternalSeams(
            hwPoints,
            optimized,
            grid,
            internalW,
            internalH,
            expandDist,
          );
        }

        extractedPolygons.push({
          blobId: blob.id,
          color: blob.color,
          hwPoints: hwPoints,
        });
      }
    }
  });

  let shapeNodes = [];
  let idCounter = 5000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  extractedPolygons.forEach((polyObj) => {
    let hwPoints = polyObj.hwPoints;
    let color = polyObj.color;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    hwPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    let centerX = (minX + maxX) / 2;
    let centerY = (minY + maxY) / 2;

    let vAttrs = [];
    hwPoints.forEach((p, idx) => {
      let localX = p.x - centerX;
      let localY = p.y - centerY;
      vAttrs.push(`v${idx}="${localX.toFixed(2)}_${localY.toFixed(2)}"`);
    });

    let decColor = (color.r << 16) + (color.g << 8) + color.b;

    shapeNodes.push(
      `        <sh t="4" i="f" p0="${centerX.toFixed(2)}" p1="${centerY.toFixed(2)}" p2="0" p3="0" p4="0" p5="f" p6="f" p7="1" p8="${decColor}" p9="-1" p10="100" p11="1">\n` +
        `            <v f="t" id="${idCounter++}" n="${hwPoints.length}" ${vAttrs.join(" ")}/>\n` +
        `        </sh>`,
    );

    // Render preview using expanded hwPoints converted back to canvas space
    ctx.beginPath();
    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    hwPoints.forEach((p, idx) => {
      let px = p.x / scaleX;
      let py = p.y / scaleY;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  });

  const fullXML =
    `<levelXML>\n` +
    `    <info v="1.98" x="630.4" y="1082.9" c="1" f="t" h="f" bg="0" bgc="5459791" e="1"/>\n` +
    `    <shapes>\n` +
    `${shapeNodes.join("\n")}\n` +
    `    </shapes>\n` +
    `</levelXML>`;

  document.getElementById("xmlOutput").value = fullXML;
  status.textContent = `Conversion complete! Exported ${shapeNodes.length} shape(s).`;
}

function copyToClipboard() {
  const copyText = document.getElementById("xmlOutput");
  copyText.select();
  document.execCommand("copy");
  alert("Copied XML to clipboard!");
}
