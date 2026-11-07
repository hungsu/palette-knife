// Snowsight-style analytics dashboard template.
//
// Left nav rail + top bar, a row of stat tiles, the shared stacked-area chart,
// and a compact table. Evokes Snowflake's Snowsight (layout/colour/type feel only
// — no logo or proprietary assets). Reuses chart.js unchanged.

import { chartSVG, legendHTML, tooltipFor, chartGeom } from "../chart.js";

const TILES = [
  { label: "Credits used", value: "1,284", delta: "+8.2%", up: true },
  { label: "Avg. daily", value: "42.7", delta: "-3.1%", up: false },
  { label: "Warehouses", value: "17", delta: "+2", up: true },
  { label: "Failed queries", value: "0.4%", delta: "-0.2%", up: true },
];

const ROWS = [
  ["ANALYTICS_WH", "X-Large", "312", "Running"],
  ["ETL_WH", "Large", "208", "Running"],
  ["REPORTING_WH", "Medium", "141", "Suspended"],
  ["ADHOC_WH", "Small", "63", "Running"],
];

export default {
  id: "dashboard",
  name: "Analytics dashboard",

  swatches: [
    { kind: "role", id: "surface", label: "Surface" },
    { kind: "role", id: "surfaceAlt", label: "Nav / tiles" },
    { kind: "role", id: "border", label: "Border" },
    { kind: "role", id: "heading", label: "Heading" },
    { kind: "role", id: "body", label: "Body" },
    { kind: "role", id: "muted", label: "Muted" },
    { kind: "role", id: "primary", label: "Primary" },
    { kind: "role", id: "onPrimary", label: "On primary" },
    { kind: "series", id: "s0", label: "Compute" },
    { kind: "series", id: "s1", label: "Storage" },
    { kind: "series", id: "s2", label: "Cloud Svc" },
    { kind: "series", id: "s3", label: "Serverless" },
    { kind: "series", id: "s4", label: "Transfer" },
  ],

  pairs: [
    { text: "heading", on: "surface", large: true },
    { text: "body", on: "surface" },
    { text: "muted", on: "surface" },
    { text: "body", on: "surfaceAlt" },
    { text: "onPrimary", on: "primary" },
  ],

  render(state, ctx) {
    const nav = ["Overview", "Warehouses", "Databases", "Query History", "Billing"];
    const navItems = nav
      .map((n, i) => {
        const active = i === 0;
        const bg = active ? ctx.rc("primary") : "transparent";
        const fg = active ? ctx.rc("onPrimary") : ctx.rc("muted");
        return `<div class="ss-nav-item" style="background:${bg};color:${fg}">${n}</div>`;
      })
      .join("");

    const tiles = TILES.map(
      (t) => `
      <div class="ss-tile" style="background:${ctx.rc("surface")};border-color:${ctx.rc("border")}">
        <div class="ss-tile-label" style="color:${ctx.rc("muted")}">${t.label}</div>
        <div class="ss-tile-value" style="color:${ctx.rc("heading")}">${t.value}</div>
        <div class="ss-tile-delta" style="color:${ctx.rc(t.up ? "success" : "danger")}">${t.delta}</div>
      </div>`
    ).join("");

    const rows = ROWS.map((r) => {
      const suspended = r[3] === "Suspended";
      const badgeCol = suspended ? ctx.rc("muted") : ctx.rc("success");
      return `
        <tr style="border-color:${ctx.rc("border")}">
          <td style="color:${ctx.rc("body")}">${r[0]}</td>
          <td style="color:${ctx.rc("muted")}">${r[1]}</td>
          <td style="color:${ctx.rc("body")}">${r[2]}</td>
          <td><span class="ss-badge" style="color:${badgeCol};border-color:${badgeCol}">${r[3]}</span></td>
        </tr>`;
    }).join("");

    return `
      <div class="ss-app" style="background:${ctx.rc("bg")}">
        <aside class="ss-rail" style="background:${ctx.rc("surfaceAlt")};border-color:${ctx.rc("border")}">
          <div class="ss-brand">
            <span class="ss-mark" style="background:${ctx.rc("primary")}"></span>
            <span style="color:${ctx.rc("heading")}">Data Cloud</span>
          </div>
          ${navItems}
        </aside>
        <main class="ss-main">
          <div class="ss-topbar" style="border-color:${ctx.rc("border")}">
            <h2 style="color:${ctx.rc("heading")}">Usage overview</h2>
            <button class="ss-btn" style="background:${ctx.rc("primary")};color:${ctx.rc("onPrimary")}">
              + New warehouse
            </button>
          </div>
          <div class="ss-tiles">${tiles}</div>
          <div class="chart-block" style="background:${ctx.rc("surface")};border-color:${ctx.rc("border")}">
            <div class="chart-head">
              <h3 class="chart-title" style="color:${ctx.rc("heading")}">Credit usage by category</h3>
              <p class="chart-sub" style="color:${ctx.rc("muted")}">Drop a mixed colour on a series to recolour its band live.</p>
            </div>
            <div class="chart-figure">
              ${chartSVG(state)}
              <div class="chart-tooltip" style="display:none"></div>
            </div>
            <div class="series-legend">${legendHTML(state)}</div>
          </div>
          <div class="ss-table-wrap" style="background:${ctx.rc("surface")};border-color:${ctx.rc("border")}">
            <table class="ss-table">
              <thead>
                <tr style="border-color:${ctx.rc("border")}">
                  <th style="color:${ctx.rc("muted")}">Warehouse</th>
                  <th style="color:${ctx.rc("muted")}">Size</th>
                  <th style="color:${ctx.rc("muted")}">Credits</th>
                  <th style="color:${ctx.rc("muted")}">State</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </main>
      </div>
    `;
  },

  // Chart crosshair + tooltip on hover (moved out of preview.js).
  wire(root, ctx) {
    const svg = root.querySelector(".chart-svg");
    const tip = root.querySelector(".chart-tooltip");
    const cross = root.querySelector(".chart-cross");
    if (!svg || !tip || !cross) return;
    const line = cross.querySelector("line");
    const fig = root.querySelector(".chart-figure");

    const show = (i) => {
      const cx = chartGeom.x(i);
      line.setAttribute("x1", cx);
      line.setAttribute("x2", cx);
      cross.style.display = "";
      tip.innerHTML = tooltipFor(ctx.state, i);
      tip.style.display = "";
      const figW = fig.clientWidth;
      const px = (cx / 480) * figW;
      tip.style.left = `${Math.min(Math.max(px + 12, 8), figW - 150)}px`;
    };
    const hide = () => {
      cross.style.display = "none";
      tip.style.display = "none";
    };

    svg.querySelectorAll(".chart-hot").forEach((r) => {
      r.addEventListener("mouseenter", () => show(Number(r.dataset.i)));
    });
    svg.addEventListener("mouseleave", hide);
  },
};
