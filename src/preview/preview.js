// Preview host. Renders a template switcher, the active UI template, and a
// roles/contrast inspector driven by that template's own declarations.
//
// Templates are self-contained render(state, ctx) modules keyed to shared role
// ids (see src/preview/templates/). The host owns nothing about any specific UI —
// adding a template file adds a tab.

import { TEMPLATES, templateById } from "./templates/index.js";
import { rgbToCss, rgbToHex } from "../palette/mixing.js";
import { wcagRatio, wcagLevel, apcaLc, apcaLevel } from "./contrast.js";

export class Preview {
  constructor(root, state, { onAssign } = {}) {
    this.root = root;
    this.state = state;
    this.onAssign = onAssign || ((kind, id, rgb) => state.assign(id, rgb));
    this.activeId = TEMPLATES[0].id;
    this.render();
    state.subscribe(() => this.render());
  }

  setTemplate(id) {
    this.activeId = templateById(id).id;
    this.render();
  }

  // ctx passed to templates: role/series colour accessors.
  _ctx() {
    const s = this.state;
    return {
      state: s,
      role: (id) => s.roles[id],
      rc: (id) => rgbToCss(s.roles[id]),
      series: (id) => s.series[id],
      sc: (id) => rgbToCss(s.series[id]),
    };
  }

  // Resolve any pair endpoint id to an rgb: template override, then role, series.
  _resolve(template, id, ctx) {
    if (template.resolve) {
      const r = template.resolve(id, ctx);
      if (r) return r;
    }
    if (this.state.roles[id]) return this.state.roles[id];
    if (this.state.series[id]) return this.state.series[id];
    return [0, 0, 0];
  }

  render() {
    const template = templateById(this.activeId);
    const ctx = this._ctx();

    const tabs = TEMPLATES.map(
      (t) =>
        `<button class="tpl-tab${t.id === this.activeId ? " active" : ""}" data-tpl="${t.id}">${t.name}</button>`
    ).join("");

    this.root.innerHTML = `
      <div class="tpl-switcher">${tabs}</div>
      <div class="tpl-mock">${template.render(this.state, ctx)}</div>
      <div class="inspector">
        <h3 class="insp-title">Palette roles <small>click a swatch to apply the picked colour</small></h3>
        <div class="insp-swatches">${this._swatches(template, ctx)}</div>
        <h3 class="insp-title">Contrast <small>pairs that matter for this UI</small></h3>
        <div class="insp-pairs">${this._pairs(template, ctx)}</div>
      </div>
    `;

    // template switcher
    this.root.querySelectorAll("[data-tpl]").forEach((el) => {
      el.addEventListener("click", () => this.setTemplate(el.dataset.tpl));
    });

    // assign targets
    this.root.querySelectorAll("[data-assign]").forEach((el) => {
      el.addEventListener("click", () => {
        if (!this.state.pickedColor) return;
        const [kind, id] = el.dataset.assign.split(":");
        this.onAssign(kind, id, this.state.pickedColor);
      });
    });

    // template-owned interactions (e.g. chart hover)
    template.wire?.(this.root, ctx);
  }

  _swatches(template, ctx) {
    return template.swatches
      .map((sw) => {
        const rgb = sw.kind === "series" ? this.state.series[sw.id] : this.state.roles[sw.id];
        return `
        <button class="insp-swatch" data-assign="${sw.kind}:${sw.id}" title="Assign picked colour to ${sw.label}">
          <span class="swatch" style="background:${rgbToCss(rgb)}"></span>
          <span class="insp-name">${sw.label}</span>
          <span class="insp-hex">${rgbToHex(rgb)}</span>
        </button>`;
      })
      .join("");
  }

  _pairs(template, ctx) {
    return template.pairs
      .map((p) => {
        const textRgb = this._resolve(template, p.text, ctx);
        const onRgb = this._resolve(template, p.on, ctx);
        const ratio = wcagRatio(textRgb, onRgb);
        const lc = apcaLc(textRgb, onRgb);
        const large = !!p.large;
        const wl = wcagLevel(ratio, large);
        const al = apcaLevel(lc, large);
        const label = p.label || `${this._roleName(p.text)} on ${this._roleName(p.on)}`;
        return `
        <div class="insp-pair">
          <span class="pair-chips">
            <span class="pair-chip" style="background:${rgbToCss(textRgb)}"></span>
            <span class="pair-chip" style="background:${rgbToCss(onRgb)}"></span>
          </span>
          <span class="pair-label">${label}</span>
          <span class="metric ${al}">APCA ${lc.toFixed(0)}</span>
          <span class="metric ${wl === "fail" ? "fail" : "ok"}">WCAG ${ratio.toFixed(1)} ${wl}</span>
        </div>`;
      })
      .join("");
  }

  _roleName(id) {
    const r = this.state.roles[id] ? id : id;
    // humanise a couple of common ids; fall back to the id itself
    const names = {
      bg: "Background",
      surface: "Surface",
      surfaceAlt: "Surface alt",
      heading: "Heading",
      body: "Body",
      muted: "Muted",
      primary: "Primary",
      onPrimary: "On primary",
      danger: "Danger",
    };
    return names[id] || r;
  }
}
