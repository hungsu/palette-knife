// Typography-focused preview. Renders a text mock using the role colors and
// shows live contrast (APCA Lc + WCAG ratio) for each text/background pair.
// Clicking a role assigns the currently picked color to it.

import { ROLES } from "../state.js";
import { rgbToCss, rgbToHex } from "../palette/mixing.js";
import { wcagRatio, wcagLevel, apcaLc, apcaLevel } from "./contrast.js";
import { chartSVG, legendHTML, tooltipFor, chartGeom } from "./chart.js";

export class Preview {
  constructor(root, state, { onAssign } = {}) {
    this.root = root;
    this.state = state;
    this.onAssign = onAssign || ((id, rgb) => state.assign(id, rgb));
    this.render();
    state.subscribe(() => this.render());
  }

  render() {
    const s = this.state;
    const r = (id) => s.roles[id];
    const bg = r("bg");
    const surface = r("surface");

    this.root.innerHTML = `
      <div class="chart-block">
        <div class="chart-head">
          <h2 class="chart-title">Sessions by channel</h2>
          <p class="chart-sub">Drop a mixed colour on a channel to recolour its band live.</p>
        </div>
        <div class="chart-figure">
          ${chartSVG(s)}
          <div class="chart-tooltip" style="display:none"></div>
        </div>
        <div class="series-legend">${legendHTML(s)}</div>
      </div>
      <div class="preview-mock" style="background:${rgbToCss(bg)}">
        <div class="mock-card" style="background:${rgbToCss(surface)}">
          <h1 style="color:${rgbToCss(r("heading"))}">Mixing color, not values</h1>
          <p class="lede" style="color:${rgbToCss(r("body"))}">
            Drop a color from the palette onto any role below. The type updates
            live, and readability is checked the moment you assign it.
          </p>
          <p style="color:${rgbToCss(r("body"))}">
            A painter fixes a color by mixing, not by solving for a channel.
            This preview keeps the readability contract a UI needs, showing
            <a href="#" style="color:${rgbToCss(r("accent"))}">contrast</a>
            for every pair as you go.
          </p>
          <button class="mock-btn" style="background:${rgbToCss(r("accent"))};color:${rgbToCss(surface)}">
            Accent button
          </button>
        </div>
      </div>
      <div class="roles">
        ${ROLES.map((role) => this._roleRow(role, r(role.id), bg, surface)).join("")}
      </div>
    `;

    this.root.querySelectorAll("[data-role]").forEach((el) => {
      el.addEventListener("click", () => {
        if (this.state.pickedColor) this.onAssign(el.dataset.role, this.state.pickedColor);
      });
    });

    this.root.querySelectorAll("[data-series]").forEach((el) => {
      el.addEventListener("click", () => {
        if (this.state.pickedColor) this.state.assignSeries(el.dataset.series, this.state.pickedColor);
      });
    });

    this._wireChartHover();
  }

  _wireChartHover() {
    const svg = this.root.querySelector(".chart-svg");
    const tip = this.root.querySelector(".chart-tooltip");
    const cross = this.root.querySelector(".chart-cross");
    if (!svg || !tip) return;
    const line = cross.querySelector("line");
    const fig = this.root.querySelector(".chart-figure");

    const show = (i, el) => {
      const cx = chartGeom.x(i);
      line.setAttribute("x1", cx);
      line.setAttribute("x2", cx);
      cross.style.display = "";
      tip.innerHTML = tooltipFor(this.state, i);
      tip.style.display = "";
      // position tooltip near the column, within the figure box
      const figW = fig.clientWidth;
      const px = (cx / 480) * figW;
      tip.style.left = `${Math.min(Math.max(px + 12, 8), figW - 150)}px`;
    };
    const hide = () => {
      cross.style.display = "none";
      tip.style.display = "none";
    };

    svg.querySelectorAll(".chart-hot").forEach((r) => {
      r.addEventListener("mouseenter", () => show(Number(r.dataset.i), r));
    });
    svg.addEventListener("mouseleave", hide);
  }

  _roleRow(role, rgb, bg, surface) {
    let metrics = "";
    if (role.kind === "text") {
      // text roles evaluated against the surface they sit on
      const against = role.id === "heading" || role.id === "body" || role.id === "accent" ? surface : bg;
      const ratio = wcagRatio(rgb, against);
      const lc = apcaLc(rgb, against);
      const large = role.id === "heading";
      const wl = wcagLevel(ratio, large);
      const al = apcaLevel(lc, large);
      metrics = `
        <span class="metric ${al}">APCA ${lc.toFixed(0)}</span>
        <span class="metric ${wl === "fail" ? "fail" : "ok"}">WCAG ${ratio.toFixed(1)} ${wl}</span>
      `;
    }
    return `
      <button class="role" data-role="${role.id}" title="Assign picked color">
        <span class="swatch" style="background:${rgbToCss(rgb)}"></span>
        <span class="role-name">${role.name}</span>
        <span class="role-hex">${rgbToHex(rgb)}</span>
        ${metrics}
      </button>
    `;
  }
}
