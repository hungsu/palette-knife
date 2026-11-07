// App bootstrap: pigment tray -> brush, fluid paint canvas, eyedropper, picked
// slot, typography preview, and a unified undo stack (strokes + role changes).

import { Palette } from "./palette/palette.js";
import { Preview } from "./preview/preview.js";
import { State, ROLES, SERIES } from "./state.js";
import { STARTER_PIGMENTS, MODIFIER_PIGMENTS, PIGMENT_COLLECTIONS } from "./palette/modifiers.js";
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

function assignSeries(seriesId, rgb) {
  const prev = state.series[seriesId].slice();
  pushUndo(() => state.assignSeries(seriesId, prev));
  state.assignSeries(seriesId, rgb);
}

// unified assign target used by the preview inspector (roles + chart series)
function assignTarget(kind, id, rgb) {
  if (kind === "series") assignSeries(id, rgb);
  else assignRole(id, rgb);
}

const pickedSwatch = document.getElementById("picked-swatch");
const pickedHex = document.getElementById("picked-hex");
state.subscribe((s) => {
  if (s.pickedColor) {
    pickedSwatch.style.background = rgbToCss(s.pickedColor);
    pickedHex.textContent = rgbToHex(s.pickedColor);
  }
});

const preview = new Preview(document.getElementById("preview"), state, { onAssign: assignTarget });

// --- pigment tray -> load the brush ---
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

// --- tray tabs: one tab + panel per pigment collection, data-driven so
// adding a collection to PIGMENT_COLLECTIONS is enough to add a tab ---
function activateTab(tabEl) {
  const tablist = tabEl.closest(".tray-tablist");
  tablist.querySelectorAll('[role="tab"]').forEach((t) => {
    t.setAttribute("aria-selected", "false");
    t.tabIndex = -1;
  });
  document.querySelectorAll(".tray-panel").forEach((p) => (p.hidden = true));
  tabEl.setAttribute("aria-selected", "true");
  tabEl.tabIndex = 0;
  tabEl.focus();
  document.getElementById(tabEl.getAttribute("aria-controls")).hidden = false;
}

// Adds one tab + panel to the shared tablist/panel-list, and returns the
// (empty) panel for the caller to fill in. First tab added becomes active.
function addTrayTab(id, label) {
  const tablist = document.getElementById("tray-tablist");
  const panels = document.getElementById("tray-panels");
  const isFirst = tablist.children.length === 0;

  const tab = document.createElement("button");
  tab.className = "tray-tab";
  tab.id = `tab-${id}`;
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", `panel-${id}`);
  tab.setAttribute("aria-selected", isFirst ? "true" : "false");
  tab.tabIndex = isFirst ? 0 : -1;
  tab.textContent = label;
  tablist.appendChild(tab);

  const panel = document.createElement("div");
  panel.className = "tray-panel";
  panel.id = `panel-${id}`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", tab.id);
  panel.hidden = !isFirst;
  panels.appendChild(panel);
  return panel;
}

function renderTrayTabs(collections) {
  for (const c of collections) {
    const panel = addTrayTab(c.id, c.label);
    if (c.hint) {
      const hint = document.createElement("p");
      hint.className = "tray-hint";
      hint.textContent = c.hint;
      panel.appendChild(hint);
    }
    const swatches = document.createElement("div");
    swatches.className = c.isModifier ? "tray tray-mods" : "tray";
    panel.appendChild(swatches);
    buildSwatches(swatches, c.pigments, c.isModifier);
  }
}

// "Your theme": the colours currently applied to the preview (roles + chart
// series), so they can be reloaded onto the brush. Unlike the static pigment
// trays these swatches track live state and update as roles/series change.
function renderThemeTab() {
  const panel = addTrayTab("theme", "Your theme");

  const hint = document.createElement("p");
  hint.className = "tray-hint";
  hint.textContent = "Colours currently used in the preview";
  panel.appendChild(hint);

  const swatches = document.createElement("div");
  swatches.className = "tray tray-mods";
  panel.appendChild(swatches);

  const items = [
    ...ROLES.map((r) => ({ name: r.name, get: () => state.roles[r.id] })),
    ...SERIES.map((s) => ({ name: s.name, get: () => state.series[s.id] })),
  ];

  const buttons = items.map((item) => {
    const el = document.createElement("button");
    el.className = "pigment";
    el.style.background = rgbToCss(item.get());
    el.title = item.name;
    el.addEventListener("click", () => {
      palette.setBrushColor(item.get());
      palette.setPickMode(false);
      clearToolStates();
      el.classList.add("selected");
    });
    const lbl = document.createElement("span");
    lbl.className = "pigment-label";
    lbl.textContent = item.name;
    el.appendChild(lbl);
    swatches.appendChild(el);
    return { el, item };
  });

  state.subscribe(() => {
    for (const { el, item } of buttons) el.style.background = rgbToCss(item.get());
  });
}

function wireTrayTabInteractions() {
  const tablist = document.getElementById("tray-tablist");

  tablist.addEventListener("click", (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) activateTab(tab);
  });

  tablist.addEventListener("keydown", (e) => {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    let next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      activateTab(next);
    }
  });
}

renderTrayTabs(PIGMENT_COLLECTIONS);
renderThemeTab();
wireTrayTabInteractions();

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
document.getElementById(`panel-${PIGMENT_COLLECTIONS[0].id}`)?.querySelector(".pigment")?.click();

// verification API
window.app = {
  palette,
  state,
  pigments: { STARTER_PIGMENTS, MODIFIER_PIGMENTS, PIGMENT_COLLECTIONS },
  mix: { mixMany, mixLerp },
  assignRole,
  assignSeries,
  setTemplate: (id) => preview.setTemplate(id),
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
