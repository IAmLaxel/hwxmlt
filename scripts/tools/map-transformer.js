function processXML() {
  let rawXml = document
    .getElementById("inputXml")
    .value.replace(/\u00a0/g, " ")
    .trim();

  if (!rawXml) {
    alert("Please paste your level XML into the input box first.");
    return;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(rawXml, "text/xml");

  if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
    alert("Invalid XML content provided.");
    return;
  }

  // 1. Determine Origin Reference Point
  let originX = 10000;
  let originY = 5000;
  let originFound = false;

  const forceCanvasCenter =
    document.getElementById("forceCanvasCenter").checked;

  if (forceCanvasCenter) {
    document.getElementById("originInfo").innerText =
      `Forced Origin Point: Canvas Center (10000, 5000)`;
  } else {
    const specials = xmlDoc.getElementsByTagName("sp");
    for (let sp of specials) {
      const p7 = sp.getElementsByTagName("p7")[0];
      let p7Text = p7 ? p7.textContent.trim() : "";
      if (p7Text === "0,0" || sp.textContent.trim().includes("0,0")) {
        if (sp.hasAttribute("p0") && sp.hasAttribute("p1")) {
          originX = parseFloat(sp.getAttribute("p0"));
          originY = parseFloat(sp.getAttribute("p1"));
          originFound = true;
          break;
        }
      }
    }

    if (originFound) {
      document.getElementById("originInfo").innerText =
        `Detected Origin Point from "0,0" text box: (${originX}, ${originY})`;
    } else {
      document.getElementById("originInfo").innerText =
        `No "0,0" text marker found. Defaulting origin to (10000, 5000).`;
    }
  }

  const transformType = document.querySelector(
    'input[name="transform"]:checked',
  ).value;
  const scaleFactor =
    parseFloat(document.getElementById("scaleFactor").value) || 1;
  const rotateDeg =
    parseFloat(document.getElementById("rotateDegrees").value) || 0;
  const rad = rotateDeg * (Math.PI / 180);

  // Dilation Toggles
  const dilateTriggersOpt = document.getElementById("dilateTriggers").checked;
  const dilateJointSpeedOpt =
    document.getElementById("dilateJointSpeed").checked;
  const dilateSlidingLimitsOpt = document.getElementById(
    "dilateSlidingLimits",
  ).checked;

  function formatNum(num) {
    return Number(num.toFixed(6));
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  // Helper: Map text font size p5 to font height
  function fontHeightToP5(height) {
    let h = clamp(height, 15, 120);
    let p5 = Math.round((h - 15) * (90 / 105) + 10);
    return clamp(p5, 10, 100);
  }

  function p5ToFontHeight(p5) {
    let size = clamp(p5, 10, 100);
    return 15 + (size - 10) * (105 / 90);
  }

  // 2. Global Point Transformation Function
  function transformPoint(x, y) {
    let dx = x - originX;
    let dy = y - originY;
    let nx = x;
    let ny = y;

    switch (transformType) {
      case "flipX":
        nx = originX - dx;
        ny = y;
        break;
      case "flipY":
        nx = x;
        ny = originY - dy;
        break;
      case "flipBoth":
        nx = originX - dx;
        ny = originY - dy;
        break;
      case "dilate":
        nx = originX + dx * scaleFactor;
        ny = originY + dy * scaleFactor;
        break;
      case "rotate":
        nx = originX + (dx * Math.cos(rad) - dy * Math.sin(rad));
        ny = originY + (dx * Math.sin(rad) + dy * Math.cos(rad));
        break;
    }
    return { x: nx, y: ny };
  }

  // Local Coordinate Mirroring
  function transformLocalPair(x, y) {
    let nx = x;
    let ny = y;

    switch (transformType) {
      case "flipX":
        nx = -x;
        ny = y;
        break;
      case "flipY":
        nx = x;
        ny = -y;
        break;
      case "flipBoth":
        nx = -x;
        ny = -y;
        break;
      case "dilate":
        nx = x * scaleFactor;
        ny = y * scaleFactor;
        break;
      case "rotate":
        // For rotation, relative vertex geometry is rotated via p4 angle on the shape
        nx = x;
        ny = y;
        break;
    }
    return { x: nx, y: ny };
  }

  // 3. Process Vertices (<v v0="..." v1="..."/>)
  function processVertexNode(vNode) {
    if (!vNode) return;

    let vertexAttrs = [];
    for (let attr of vNode.attributes) {
      if (/^v\d+$/.test(attr.name)) {
        let parts = attr.value.split("_").map(parseFloat);
        if (parts.length >= 2 && !parts.some(isNaN)) {
          vertexAttrs.push({
            attrName: attr.name,
            index: parseInt(attr.name.slice(1)),
            parts: parts,
          });
        }
      }
    }

    if (vertexAttrs.length === 0) return;

    vertexAttrs.sort((a, b) => a.index - b.index);

    let transformedList = [];

    for (let vObj of vertexAttrs) {
      let parts = vObj.parts;
      let transformedParts = [];

      for (let i = 0; i < parts.length; i += 2) {
        let pt = transformLocalPair(parts[i], parts[i + 1]);
        transformedParts.push(pt.x, pt.y);
      }

      if (
        (transformType === "flipX" || transformType === "flipY") &&
        transformedParts.length === 6
      ) {
        let anchorX = transformedParts[0];
        let anchorY = transformedParts[1];
        let c1x = transformedParts[2];
        let c1y = transformedParts[3];
        let c2x = transformedParts[4];
        let c2y = transformedParts[5];

        transformedParts = [anchorX, anchorY, c2x, c2y, c1x, c1y];
      }

      let strVal = transformedParts.map(formatNum).join("_");
      transformedList.push(strVal);
    }

    if (transformType === "flipX" || transformType === "flipY") {
      transformedList.reverse();
    }

    for (let i = 0; i < vertexAttrs.length; i++) {
      vNode.setAttribute(vertexAttrs[i].attrName, transformedList[i]);
    }
  }

  // 4. Track original group centers before modifying them
  const groups = xmlDoc.getElementsByTagName("g");
  let originalGroupPositions = new Map();

  for (let g of groups) {
    let gx = parseFloat(g.getAttribute("x")) || 0;
    let gy = parseFloat(g.getAttribute("y")) || 0;
    originalGroupPositions.set(g, { x: gx, y: gy });

    let newGPos = transformPoint(gx, gy);
    g.setAttribute("x", formatNum(newGPos.x));
    g.setAttribute("y", formatNum(newGPos.y));

    if (transformType === "dilate") {
      if (g.hasAttribute("ox"))
        g.setAttribute(
          "ox",
          formatNum(parseFloat(g.getAttribute("ox")) * scaleFactor),
        );
      if (g.hasAttribute("oy"))
        g.setAttribute(
          "oy",
          formatNum(parseFloat(g.getAttribute("oy")) * scaleFactor),
        );
    }

    if (g.hasAttribute("r")) {
      let r = parseFloat(g.getAttribute("r")) || 0;
      switch (transformType) {
        case "flipX":
        case "flipY":
          g.setAttribute("r", formatNum(-r));
          break;
        case "flipBoth":
          g.setAttribute("r", formatNum((r + 180) % 360));
          break;
        case "rotate":
          g.setAttribute("r", formatNum((r + rotateDeg) % 360));
          break;
      }
    }
  }

  // 5. Process Shapes (<sh>)
  const allShapes = xmlDoc.getElementsByTagName("sh");
  for (let sh of allShapes) {
    let parentGroup = sh.closest("g");

    if (parentGroup) {
      let origG = originalGroupPositions.get(parentGroup);
      let newGx = parseFloat(parentGroup.getAttribute("x"));
      let newGy = parseFloat(parentGroup.getAttribute("y"));

      if (sh.hasAttribute("p0") && sh.hasAttribute("p1")) {
        let px = parseFloat(sh.getAttribute("p0"));
        let py = parseFloat(sh.getAttribute("p1"));

        let dx = px - origG.x;
        let dy = py - origG.y;

        let flippedDx = transformLocalPair(dx, dy);

        sh.setAttribute("p0", formatNum(newGx + flippedDx.x));
        sh.setAttribute("p1", formatNum(newGy + flippedDx.y));
      }
    } else {
      if (sh.hasAttribute("p0") && sh.hasAttribute("p1")) {
        let px = parseFloat(sh.getAttribute("p0"));
        let py = parseFloat(sh.getAttribute("p1"));
        let nPos = transformPoint(px, py);
        sh.setAttribute("p0", formatNum(nPos.x));
        sh.setAttribute("p1", formatNum(nPos.y));
      }
    }

    if (transformType === "dilate") {
      if (sh.hasAttribute("p2"))
        sh.setAttribute(
          "p2",
          formatNum(parseFloat(sh.getAttribute("p2")) * scaleFactor),
        );
      if (sh.hasAttribute("p3"))
        sh.setAttribute(
          "p3",
          formatNum(parseFloat(sh.getAttribute("p3")) * scaleFactor),
        );
    }

    if (sh.hasAttribute("p4")) {
      let p4 = parseFloat(sh.getAttribute("p4")) || 0;
      switch (transformType) {
        case "flipX":
        case "flipY":
          sh.setAttribute("p4", formatNum(-p4));
          break;
        case "flipBoth":
          sh.setAttribute("p4", formatNum((p4 + 180) % 360));
          break;
        case "rotate":
          sh.setAttribute("p4", formatNum((p4 + rotateDeg) % 360));
          break;
      }
    }

    const vNode = sh.getElementsByTagName("v")[0];
    if (vNode) {
      processVertexNode(vNode);
    }
  }

  // 6. Process Specials / Text (<sp>)
  const specials = xmlDoc.getElementsByTagName("sp");
  for (let sp of specials) {
    if (sp.hasAttribute("p0") && sp.hasAttribute("p1")) {
      let px = parseFloat(sp.getAttribute("p0"));
      let py = parseFloat(sp.getAttribute("p1"));
      let nPos = transformPoint(px, py);
      sp.setAttribute("p0", formatNum(nPos.x));
      sp.setAttribute("p1", formatNum(nPos.y));
    }

    if (transformType === "dilate") {
      if (sp.hasAttribute("p3"))
        sp.setAttribute(
          "p3",
          formatNum(parseFloat(sp.getAttribute("p3")) * scaleFactor),
        );
      if (sp.hasAttribute("p6"))
        sp.setAttribute(
          "p6",
          formatNum(parseFloat(sp.getAttribute("p6")) * scaleFactor),
        );

      // Scaled text font size handling (p5)
      if (sp.hasAttribute("p5")) {
        let oldP5 = parseFloat(sp.getAttribute("p5")) || 15;
        let currentHeight = p5ToFontHeight(oldP5);
        let newHeight = currentHeight * scaleFactor;
        let newP5 = fontHeightToP5(newHeight);
        sp.setAttribute("p5", formatNum(newP5));
      }
    }

    // Text rotation attribute is p2
    if (sp.hasAttribute("p2")) {
      let p2 = parseFloat(sp.getAttribute("p2")) || 0;
      switch (transformType) {
        case "flipX":
        case "flipY":
          sp.setAttribute("p2", formatNum(-p2));
          break;
        case "flipBoth":
          sp.setAttribute("p2", formatNum((p2 + 180) % 360));
          break;
        case "rotate":
          sp.setAttribute("p2", formatNum((p2 + rotateDeg) % 360));
          break;
      }
    }
  }

  // 7. Process Joints (<j>)
  const joints = xmlDoc.getElementsByTagName("j");
  for (let j of joints) {
    if (j.hasAttribute("x") && j.hasAttribute("y")) {
      let jx = parseFloat(j.getAttribute("x"));
      let jy = parseFloat(j.getAttribute("y"));
      let nPos = transformPoint(jx, jy);
      j.setAttribute("x", formatNum(nPos.x));
      j.setAttribute("y", formatNum(nPos.y));
    }

    let jType = j.getAttribute("t");

    // Rotation on joint angle `a`
    if (j.hasAttribute("a")) {
      let angle = parseFloat(j.getAttribute("a")) || 0;
      switch (transformType) {
        case "flipX":
        case "flipY":
          j.setAttribute("a", formatNum(-angle));
          break;
        case "flipBoth":
          j.setAttribute("a", formatNum((angle + 180) % 360));
          break;
        case "rotate":
          j.setAttribute("a", formatNum((angle + rotateDeg) % 360));
          break;
      }
    }

    if (transformType === "flipX" || transformType === "flipY") {
      if (j.hasAttribute("ua") && j.hasAttribute("la")) {
        let oldUa = parseFloat(j.getAttribute("ua"));
        let oldLa = parseFloat(j.getAttribute("la"));
        j.setAttribute("ua", formatNum(-oldLa));
        j.setAttribute("la", formatNum(-oldUa));
      }
      if (j.hasAttribute("sp")) {
        let sp = parseFloat(j.getAttribute("sp"));
        j.setAttribute("sp", formatNum(-sp));
      }
    }

    if (transformType === "dilate") {
      // Speed dilation toggle (sp)
      if (dilateJointSpeedOpt && j.hasAttribute("sp")) {
        let spVal = parseFloat(j.getAttribute("sp")) * scaleFactor;
        if (jType === "0") {
          // Motor joint
          spVal = clamp(spVal, -20, 20);
        } else if (jType === "1") {
          // Sliding joint
          spVal = clamp(spVal, -50, 50);
        }
        j.setAttribute("sp", formatNum(spVal));
      }

      // Sliding limits dilation toggle (ul, ll) on sliding joint (t="1")
      if (jType === "1" && dilateSlidingLimitsOpt) {
        if (j.hasAttribute("ul")) {
          let ulVal = parseFloat(j.getAttribute("ul")) * scaleFactor;
          j.setAttribute("ul", formatNum(clamp(ulVal, 0, 3000)));
        }
        if (j.hasAttribute("ll")) {
          let llVal = parseFloat(j.getAttribute("ll")) * scaleFactor;
          j.setAttribute("ll", formatNum(clamp(llVal, -3000, 0)));
        }
      }
    }
  }

  // 8. Process Triggers (<t>)
  const triggers = xmlDoc.getElementsByTagName("t");
  for (let t of triggers) {
    if (t.hasAttribute("x") && t.hasAttribute("y")) {
      let tx = parseFloat(t.getAttribute("x"));
      let ty = parseFloat(t.getAttribute("y"));
      let nPos = transformPoint(tx, ty);
      t.setAttribute("x", formatNum(nPos.x));
      t.setAttribute("y", formatNum(nPos.y));
    }

    // Rotation on trigger attribute `a`
    if (t.hasAttribute("a")) {
      let aDeg = parseFloat(t.getAttribute("a")) || 0;
      switch (transformType) {
        case "flipX":
        case "flipY":
          t.setAttribute("a", formatNum(-aDeg));
          break;
        case "flipBoth":
          t.setAttribute("a", formatNum((aDeg + 180) % 360));
          break;
        case "rotate":
          t.setAttribute("a", formatNum((aDeg + rotateDeg) % 360));
          break;
      }
    }

    // Dilation toggle for triggers (w & h)
    if (transformType === "dilate" && dilateTriggersOpt) {
      if (t.hasAttribute("w"))
        t.setAttribute(
          "w",
          formatNum(parseFloat(t.getAttribute("w")) * scaleFactor),
        );
      if (t.hasAttribute("h"))
        t.setAttribute(
          "h",
          formatNum(parseFloat(t.getAttribute("h")) * scaleFactor),
        );
    }
  }

  // 9. Output Single Transformed Level XML
  const serializer = new XMLSerializer();
  document.getElementById("outputXmlMain").value =
    serializer.serializeToString(xmlDoc);
}
