// Stacked area chart for the preview. A colour-complex form: five categorical
// series whose fills meet edge-to-edge, so the palette's harmony (or lack of it)
// is immediately legible. Each series colour is an assignable role — pick a mixed
// colour and drop it on a legend entry to recolour that band live.
//
// Follows the dataviz skill's mark specs: recessive hairline grid, a 2px surface
// gap between stacked fills, thin marks, and a crosshair + tooltip on hover.

import { SERIES } from "../state.js";
import { rgbToCss, rgbToHex } from "../palette/mixing.js";

// 12 months of synthetic "sessions by channel" data, one row per month.
// Order of columns matches SERIES.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATA = [
  [42, 30, 14, 10, 6],
  [45, 33, 15, 12, 7],
  [40, 38, 16, 14, 8],
  [44, 41, 18, 15, 9],
  [48, 45, 17, 18, 11],
  [52, 49, 20, 22, 12],
  [50, 55, 23, 26, 14],
  [55, 60, 24, 30, 15],
  [58, 66, 27, 34, 18],
  [61, 72, 30, 39, 20],
  [66, 78, 32, 45, 23],
  [70, 85, 35, 52, 26],
];

const W = 480;
const H = 300;
const M = { top: 16, right: 16, bottom: 30, left: 40 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

const SURFACE = "#fcfcfb"; // chart surface (matches the gap-stroke colour)
const GRID = "#e1e0d9";
const AXIS = "#c3c2b7";
const MUTED = "#898781";

function stackTotals() {
  return DATA.map((row) => row.reduce((a, b) => a + b, 0));
}

// Build the layout once (positions are colour-independent); colours are applied
// at render time so re-assigning a series doesn't recompute geometry.
function layout() {
  const totals = stackTotals();
  const yMax = Math.ceil(Math.max(...totals) / 50) * 50;
  const x = (i) => M.left + (IW * i) / (MONTHS.length - 1);
  const y = (v) => M.top + IH - (IH * v) / yMax;

  // cumulative upper edge per series per month
  const cum = DATA.map((row) => {
    const out = [];
    let acc = 0;
    for (const v of row) {
      acc += v;
      out.push(acc);
    }
    return out; // out[k] = top of band k in this month
  });

  // For each series k, an area path between its lower and upper boundary.
  const bands = SERIES.map((s, k) => {
    const upper = cum.map((c, i) => `${x(i)},${y(c[k])}`);
    const lowerVal = (i) => (k === 0 ? 0 : cum[i][k - 1]);
    const lower = cum.map((c, i) => `${x(i)},${y(lowerVal(i))}`).reverse();
    const d = `M${upper.join(" L")} L${lower.join(" L")} Z`;
    // top edge only, for the 2px surface separator between fills
    const edge = `M${upper.join(" L")}`;
    return { id: s.id, name: s.name, d, edge };
  });

  return { yMax, x, y, cum, bands };
}

const L = layout();

export function chartSVG(state) {
  const col = (id) => rgbToCss(state.series[id]);

  // horizontal gridlines every 50
  const grid = [];
  for (let v = 0; v <= L.yMax; v += 50) {
    const yy = L.y(v);
    grid.push(
      `<line x1="${M.left}" y1="${yy}" x2="${W - M.right}" y2="${yy}" stroke="${GRID}" stroke-width="1"/>` +
        `<text x="${M.left - 6}" y="${yy + 3}" text-anchor="end" font-size="10" fill="${MUTED}">${v}</text>`
    );
  }

  const xLabels = MONTHS.map(
    (m, i) => `<text x="${L.x(i)}" y="${H - 12}" text-anchor="middle" font-size="10" fill="${MUTED}">${m}</text>`
  ).join("");

  // fills bottom-up, then separator strokes so gaps sit on top of the fills
  const fills = L.bands.map((b) => `<path d="${b.d}" fill="${col(b.id)}"/>`).join("");
  const seps = L.bands
    .map((b) => `<path d="${b.edge}" fill="none" stroke="${SURFACE}" stroke-width="2" stroke-linejoin="round"/>`)
    .join("");

  // invisible hover columns; positions read by preview.js for the tooltip
  const hot = MONTHS.map((m, i) => {
    const left = i === 0 ? M.left : (L.x(i - 1) + L.x(i)) / 2;
    const right = i === MONTHS.length - 1 ? W - M.right : (L.x(i) + L.x(i + 1)) / 2;
    return `<rect class="chart-hot" data-i="${i}" x="${left}" y="${M.top}" width="${right - left}" height="${IH}" fill="transparent"/>`;
  }).join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img"
         aria-label="Stacked area chart of credit usage by category over twelve months">
      <rect x="0" y="0" width="${W}" height="${H}" fill="${SURFACE}" rx="8"/>
      ${grid.join("")}
      ${fills}
      ${seps}
      ${xLabels}
      <g class="chart-cross" style="display:none">
        <line y1="${M.top}" y2="${M.top + IH}" stroke="${AXIS}" stroke-width="1"/>
      </g>
      ${hot}
    </svg>
  `;
}

// Legend rows double as assign targets.
export function legendHTML(state) {
  return SERIES.map((s) => {
    const rgb = state.series[s.id];
    return `
      <button class="series" data-series="${s.id}" title="Assign picked colour to ${s.name}">
        <span class="swatch" style="background:${rgbToCss(rgb)}"></span>
        <span class="series-name">${s.name}</span>
        <span class="series-hex">${rgbToHex(rgb)}</span>
      </button>`;
  }).join("");
}

// Tooltip content for a given month index, ordered top band first.
export function tooltipFor(state, i) {
  const rows = SERIES.map((s, k) => {
    const v = DATA[i][k];
    return `<div class="tt-row"><span class="tt-dot" style="background:${rgbToCss(
      state.series[s.id]
    )}"></span>${s.name}<b>${v}k</b></div>`;
  })
    .reverse()
    .join("");
  const total = DATA[i].reduce((a, b) => a + b, 0);
  return `<div class="tt-title">${MONTHS[i]} · ${total}k credits</div>${rows}`;
}

export const chartGeom = { x: L.x, top: M.top, bottom: M.top + IH, months: MONTHS.length };
