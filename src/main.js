// App bootstrap: pigment tray -> brush, fluid paint canvas, eyedropper, picked
// slot, typography preview, and a unified undo stack (strokes + role changes).

import { Palette } from "./palette/palette.js";
import { Preview } from "./preview/preview.js";
import { State } from "./state.js";
import { STARTER_PIGMENTS, MODIFIER_PIGMENTS } from "./palette/modifiers.js";
import { rgbToCss, rgbToHex, mixMany, mixLerp } from "./palette/mixing.js";

const state = new State();
const canvas = document.getElementById("palette-canvas");

// --- unified undo stack ---
const undoStack = [];
const UNDO_LIMIT = 40;
function pushUndo(fn) {
  undoStack.push(fn);
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}
function undo() {
  const fn = undoStack.pop();
  if (fn) fn();
}

const palette = new Palette(canvas, {
  onPick: (rgb) => state.setPicked(rgb),
  onStrokeStart: () => {
    const snap = palette.snapshot();
    pushUndo(() => palette.restore(snap));
  },
});

function sizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  palette.resize(Math.round(rect.width), Math.round(rect.height));
}
sizeCanvas();
window.addEventListener("resize", sizeCanvas);

// role assignment goes through here so it can be undone too
function assignRole(roleId, rgb) {
  const prev = state.roles[roleId].slice();
  pushUndo(() => state.assign(roleId, prev));
  state.assign(roleId, rgb);
}

const pickedSwatch = document.getElementById("picked-swatch");
const pickedHex = document.getElementById("picked-hex");
state.subscribe((s) => {
  if (s.pickedColor) {
    pickedSwatch.style.background = rgbToCss(s.pickedColor);
    pickedHex.textContent = rgbToHex(s.pickedColor);
  }
});

new Preview(document.getElementById("preview"), state, { onAssign: assignRole });

// --- pigment tray -> load the brush ---
const tray = document.getElementById("pigment-tray");
const modTray = document.getElementById("modifier-tray");
const pickBtn = document.getElementById("pick-btn");

function buildSwatches(container, pigments, isModifier) {
  for (const p of pigments) {
    const el = document.createElement("button");
    el.className = "pigment";
    el.style.background = rgbToCss(p.rgb);
    el.title = p.name;
    el.addEventListener("click", () => {
      palette.setBrushColor(p.rgb);
      palette.setPickMode(false);
      clearToolStates();
      el.classList.add("selected");
    });
    container.appendChild(el);
    if (isModifier) {
      const lbl = document.createElement("span");
      lbl.className = "pigment-label";
      lbl.textContent = p.name;
      el.appendChild(lbl);
    }
  }
}
buildSwatches(tray, STARTER_PIGMENTS, false);
buildSwatches(modTray, MODIFIER_PIGMENTS, true);

function clearToolStates() {
  document.querySelectorAll(".pigment.selected").forEach((n) => n.classList.remove("selected"));
  smudgeBtn.classList.remove("active");
  pickBtn.classList.remove("active");
}

// eyedropper toggle
pickBtn.addEventListener("click", () => {
  const on = !pickBtn.classList.contains("active");
  clearToolStates();
  pickBtn.classList.toggle("active", on);
  palette.setPickMode(on);
});

// smudge tool
const smudgeBtn = document.getElementById("smudge-btn");
smudgeBtn.addEventListener("click", () => {
  clearToolStates();
  smudgeBtn.classList.add("active");
  palette.setPickMode(false);
  palette.setSmudge();
});

// new surface (undoable)
document.getElementById("clear-btn").addEventListener("click", () => {
  const snap = palette.snapshot();
  pushUndo(() => palette.restore(snap));
  palette.clear();
});

// brush size
const sizeInput = document.getElementById("brush-size");
if (sizeInput) {
  palette.setBrushRadius(Number(sizeInput.value));
  sizeInput.addEventListener("input", () => palette.setBrushRadius(Number(sizeInput.value)));
}

// undo button + keyboard
document.getElementById("undo-btn").addEventListener("click", undo);
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    undo();
  }
});

// default brush
tray.querySelector(".pigment")?.click();

// verification API
window.app = {
  palette,
  state,
  pigments: { STARTER_PIGMENTS, MODIFIER_PIGMENTS },
  mix: { mixMany, mixLerp },
  assignRole,
  undo,
  paintStroke: (rgb, radius, pts) => {
    palette.setBrushColor(rgb);
    if (radius) palette.setBrushRadius(radius);
    const snap = palette.snapshot();
    pushUndo(() => palette.restore(snap));
    palette._last = null;
    palette._carried = rgb.slice();
    palette._carriedA = 255;
    for (const [x, y] of pts) palette.strokeTo(x, y);
  },
  smudgeStroke: (radius, pts) => {
    palette.setSmudge();
    if (radius) palette.setBrushRadius(radius);
    const snap = palette.snapshot();
    pushUndo(() => palette.restore(snap));
    palette._last = null;
    const s = palette.pixelRaw(pts[0][0], pts[0][1]);
    palette._carried = s.rgb;
    palette._carriedA = s.a;
    for (const [x, y] of pts) palette.strokeTo(x, y);
  },
  clear: () => {
    const snap = palette.snapshot();
    pushUndo(() => palette.restore(snap));
    palette.clear();
  },
  sample: (x, y) => palette.pixel(x, y),
  sampleRaw: (x, y) => palette.pixelRaw(x, y),
};
