function corruptSize(valStr, intensityMult) {
  const val = parseFloat(valStr);
  if (isNaN(val)) return valStr;
  const baseDelta = 1.25 * intensityMult;
  const minScale = Math.max(0.05, 1 - 0.25 * intensityMult);
  const scale = minScale + Math.random() * baseDelta;
  return Math.round(val * scale).toString();
}

function corruptDelay(valStr, intensityMult) {
  const val = parseFloat(valStr);
  if (isNaN(val)) return valStr;
  const baseDelta = 2.5 * intensityMult;
  const minScale = Math.max(0.01, 1 - 0.5 * intensityMult);
  const scale = minScale + Math.random() * baseDelta;
  return (val * scale).toFixed(2);
}

function getRandomSpeed(intensityMult) {
  const maxSpeed = Math.round(50 * intensityMult);
  const range = maxSpeed * 2 + 1;
  return (Math.floor(Math.random() * range) - maxSpeed).toString();
}

function corruptPosition(valStr, intensityMult) {
  const val = parseFloat(valStr);
  if (isNaN(val)) return valStr;
  const maxOffset = 150 * intensityMult;
  const offset = (Math.random() * 2 - 1) * maxOffset;
  return Math.round(val + offset).toString();
}

function corruptRotation(valStr, intensityMult) {
  const val = parseFloat(valStr);
  if (isNaN(val)) return valStr;
  const maxDegOffset = 90 * Math.min(2.0, intensityMult);
  const offset = (Math.random() * 2 - 1) * maxDegOffset;
  let newRot = Math.round(val + offset) % 360;
  if (newRot < 0) newRot += 360;
  return newRot.toString();
}

function corruptDensity(valStr, intensityMult) {
  const val = parseFloat(valStr);
  if (isNaN(val)) return valStr;
  const baseDelta = 1.5 * intensityMult;
  const minScale = Math.max(0.01, 1 - 0.5 * intensityMult);
  const scale = minScale + Math.random() * baseDelta;
  return (val * scale).toFixed(2);
}

// Corrupts vertex X_Y coordinates relative to origin
function corruptVertexPair(valStr, intensityMult) {
  const parts = valStr.split("_");
  if (parts.length !== 2) return valStr;

  let x = parseFloat(parts[0]);
  let y = parseFloat(parts[1]);

  if (isNaN(x) || isNaN(y)) return valStr;

  const maxOffset = 25 * intensityMult;
  const xOffset = (Math.random() * 2 - 1) * maxOffset;
  const yOffset = (Math.random() * 2 - 1) * maxOffset;

  const newX = Math.round(x + xOffset);
  const newY = Math.round(y + yOffset);

  return `${newX}_${newY}`;
}

function corruptColor(decStr, intensityMult) {
  let decVal = parseInt(decStr, 10);
  if (isNaN(decVal) || decVal === -1) return decStr;

  let r = (decVal >> 16) & 0xff;
  let g = (decVal >> 8) & 0xff;
  let b = decVal & 0xff;

  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  const maxHueShift = 0.5 * Math.min(1.0, intensityMult);
  h = (h + (Math.random() * 2 - 1) * maxHueShift + 1) % 1;

  const maxSatLightShift = 0.3 * Math.min(1.0, intensityMult);
  s = Math.min(1, Math.max(0, s + (Math.random() * 2 - 1) * maxSatLightShift));
  l = Math.min(1, Math.max(0, l + (Math.random() * 2 - 1) * maxSatLightShift));

  let r1, g1, b1;
  if (s === 0) {
    r1 = g1 = b1 = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r1 = hue2rgb(p, q, h + 1 / 3);
    g1 = hue2rgb(p, q, h);
    b1 = hue2rgb(p, q, h - 1 / 3);
  }

  const newR = Math.round(r1 * 255);
  const newG = Math.round(g1 * 255);
  const newB = Math.round(b1 * 255);

  return ((newR << 16) | (newG << 8) | newB).toString();
}

function corruptText(text, intensityMult) {
  if (!text) return text;
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~ ";

  if (intensityMult >= 1.0) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const modProb = intensityMult;
  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (Math.random() < modProb) {
      if (intensityMult < 0.3) {
        const charCode = text.charCodeAt(i);
        const shift = Math.random() < 0.5 ? -1 : 1;
        result += String.fromCharCode(charCode + shift);
      } else {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } else {
      result += text.charAt(i);
    }
  }
  return result;
}

document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const includePhysical = document.getElementById(
    "includePhysicalCheck",
  ).checked;
  const includeArt = document.getElementById("includeArtCheck").checked;
  const randomizeColors = document.getElementById(
    "randomizeColorsCheck",
  ).checked;
  const includeOutlines = document.getElementById(
    "includeOutlinesCheck",
  ).checked;
  const includeDensity = document.getElementById("includeDensityCheck").checked;
  const includePosition = document.getElementById(
    "includePositionCheck",
  ).checked;
  const includeRotation = document.getElementById(
    "includeRotationCheck",
  ).checked;
  const includeVertices = document.getElementById(
    "includeVerticesCheck",
  ).checked;
  const includeTriggers = document.getElementById(
    "includeTriggersCheck",
  ).checked;
  const includeText = document.getElementById("includeTextCheck").checked;
  const includeTextFormatting = document.getElementById(
    "includeTextFormattingCheck",
  ).checked;

  let intensityVal = parseFloat(
    document.getElementById("intensityInput").value,
  );
  if (isNaN(intensityVal) || intensityVal < 1) intensityVal = 100;
  const intensityMult = intensityVal / 100;

  const reader = new FileReader();

  reader.onload = function (evt) {
    let levelData = evt.target.result;

    // 1. Text Corruption
    if (includeText) {
      levelData = levelData.replace(
        /(<!\[CDATA\[)([\s\S]*?)(\]\]>)/g,
        (match, p1, p2, p3) => {
          return p1 + corruptText(p2, intensityMult) + p3;
        },
      );
      levelData = levelData.replace(/\btext="([^"]*)"/g, (match, textVal) => {
        return `text="${corruptText(textVal, intensityMult)}"`;
      });
    }

    // 2. Joints Speed Corruption
    levelData = levelData.replace(/<joints>[\s\S]*?<\/joints>/g, (section) => {
      return section.replace(
        /\bsp="(-?\d+(\.\d+)?)"/g,
        (m, val) => `sp="${getRandomSpeed(intensityMult)}"`,
      );
    });

    // 3. Triggers Delay Corruption (d="...")
    if (includeTriggers) {
      levelData = levelData.replace(
        /<triggers>[\s\S]*?<\/triggers>/g,
        (section) => {
          return section.replace(
            /\bd="(-?\d+(\.\d+)?)"/g,
            (m, val) => `d="${corruptDelay(val, intensityMult)}"`,
          );
        },
      );
    }

    // 4. Trigger Rotations (a="...")
    if (includeRotation) {
      levelData = levelData.replace(
        /<triggers>[\s\S]*?<\/triggers>/g,
        (section) => {
          return section.replace(
            /\ba="(-?\d+(\.\d+)?)"/g,
            (m, val) => `a="${corruptRotation(val, intensityMult)}"`,
          );
        },
      );
    }

    // 5. NPC Pose Rotation Capping (p8 through p16 on t="17" shapes)
    levelData = levelData.replace(/<sh\b[^>]*\bt="17"[^>]*>/g, (shapeTag) => {
      let updated = shapeTag;
      for (let i = 8; i <= 16; i++) {
        const regex = new RegExp(`\\bp${i}="(-?\\d+(\\.\\d+)?)"`, "g");
        updated = updated.replace(regex, (m, val) => {
          const baseDelta = 2.0 * intensityMult;
          const minScale = Math.max(0.05, 1 - 0.5 * intensityMult);
          const scale = minScale + Math.random() * baseDelta;
          let newPose = Math.round(parseFloat(val) * scale);

          if (newPose > 180) newPose = 180;
          if (newPose < -180) newPose = -180;

          return `p${i}="${newPose}"`;
        });
      }
      return updated;
    });

    // 6. Specials Manipulation (Rotations, Text formatting, Positions)
    levelData = levelData.replace(/<sp\b([^>]*)>/g, (spTag, attributes) => {
      let updatedAttrs = attributes;

      const typeMatch = attributes.match(/\bt="(\d+)"/);
      const spType = typeMatch ? typeMatch[1] : null;

      // Corrupt Positions (p0, p1)
      if (includePosition) {
        updatedAttrs = updatedAttrs.replace(
          /\bp0="(-?\d+(\.\d+)?)"/g,
          (m, val) => `p0="${corruptPosition(val, intensityMult)}"`,
        );
        updatedAttrs = updatedAttrs.replace(
          /\bp1="(-?\d+(\.\d+)?)"/g,
          (m, val) => `p1="${corruptPosition(val, intensityMult)}"`,
        );
      }

      // Corrupt Rotation (p2 for general specials, or p4 for structural specials)
      if (includeRotation) {
        updatedAttrs = updatedAttrs.replace(
          /\bp2="(-?\d+(\.\d+)?)"/g,
          (m, val) => `p2="${corruptRotation(val, intensityMult)}"`,
        );
        updatedAttrs = updatedAttrs.replace(
          /\bp4="(-?\d+(\.\d+)?)"/g,
          (m, val) => `p4="${corruptRotation(val, intensityMult)}"`,
        );
      }

      // Text Formatting (Special Type 16: p4=font, p5=size)
      if (includeTextFormatting && spType === "16") {
        updatedAttrs = updatedAttrs.replace(/\bp4="(-?\d+)"/g, (m, val) => {
          const fontShift = Math.floor(Math.random() * (5 * intensityMult));
          return `p4="${(parseInt(val, 10) + fontShift) % 10}"`;
        });

        updatedAttrs = updatedAttrs.replace(
          /\bp5="(-?\d+(\.\d+)?)"/g,
          (m, val) => {
            return `p5="${corruptSize(val, intensityMult)}"`;
          },
        );
      }

      return `<sp${updatedAttrs}>`;
    });

    // 7. Vertex Tag Manipulation (<v v0="X_Y" v1="X_Y" ... /> inside shapes)
    if (includeVertices) {
      levelData = levelData.replace(/<v\b([^>]*)>/g, (vTag, attributes) => {
        let updatedAttrs = attributes.replace(
          /\bv\d+="(-?\d+_-?\d+)"/g,
          (m, coordPair) => {
            const attrName = m.split("=")[0];
            return `${attrName}="${corruptVertexPair(coordPair, intensityMult)}"`;
          },
        );
        return `<v${updatedAttrs}>`;
      });
    }

    // 8. General Shape Manipulations
    levelData = levelData.replace(/<sh\b([^>]*)>/g, (shapeTag, attributes) => {
      const typeMatch = attributes.match(/\bt="(\d+)"/);
      const shapeType = typeMatch ? typeMatch[1] : null;

      const isPhysical =
        shapeType === "0" ||
        shapeType === "1" ||
        shapeType === "2" ||
        shapeType === "3";
      const isArtShape = shapeType === "4";

      if (!includePhysical && isPhysical) return shapeTag;
      if (!includeArt && isArtShape) return shapeTag;

      let updatedAttrs = attributes;

      // Corrupt Positions (p0, p1)
      if (includePosition) {
        updatedAttrs = updatedAttrs.replace(
          /\bp0="(-?\d+(\.\d+)?)"/g,
          (m, val) => `p0="${corruptPosition(val, intensityMult)}"`,
        );
        updatedAttrs = updatedAttrs.replace(
          /\bp1="(-?\d+(\.\d+)?)"/g,
          (m, val) => `p1="${corruptPosition(val, intensityMult)}"`,
        );
      }

      // Corrupt Rotation (p4)
      if (includeRotation) {
        updatedAttrs = updatedAttrs.replace(
          /\bp4="(-?\d+(\.\d+)?)"/g,
          (m, val) => `p4="${corruptRotation(val, intensityMult)}"`,
        );
      }

      // Corrupt Density (p7)
      if (includeDensity) {
        updatedAttrs = updatedAttrs.replace(
          /\bp7="(-?\d+(\.\d+)?)"/g,
          (m, val) => `p7="${corruptDensity(val, intensityMult)}"`,
        );
      }

      // Corrupt Dimensions (p2, p3)
      updatedAttrs = updatedAttrs.replace(
        /\bp2="(-?\d+(\.\d+)?)"/g,
        (m, val) => `p2="${corruptSize(val, intensityMult)}"`,
      );
      updatedAttrs = updatedAttrs.replace(
        /\bp3="(-?\d+(\.\d+)?)"/g,
        (m, val) => `p3="${corruptSize(val, intensityMult)}"`,
      );

      // Corrupt Outline Color (p9)
      if (includeOutlines) {
        updatedAttrs = updatedAttrs.replace(/\bp9="(-?\d+)"/g, (m, decVal) => {
          if (decVal === "-1") return m;
          return `p9="${corruptColor(decVal, intensityMult)}"`;
        });
      }

      return `<sh${updatedAttrs}>`;
    });

    // 9. Body Color Randomization via HSL shifting (p8 and bgc)
    if (randomizeColors) {
      levelData = levelData.replace(
        /\b(bgc|p8)="(-?\d+)"/g,
        (match, attr, decVal) => {
          if (decVal === "-1") return match;
          return `${attr}="${corruptColor(decVal, intensityMult)}"`;
        },
      );
    }

    // Download corrupted level file
    const blob = new Blob([levelData], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `corrupted_${intensityVal}pct_${file.name}`;
    a.click();
  };

  reader.readAsText(file);
});
