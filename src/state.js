// App state: the currently picked color and the color assigned to each UI role.

export const ROLES = [
  { id: "bg", name: "Background", kind: "surface" },
  { id: "surface", name: "Surface", kind: "surface" },
  { id: "heading", name: "Heading", kind: "text" },
  { id: "body", name: "Body text", kind: "text" },
  { id: "accent", name: "Accent / link", kind: "text" },
];

const DEFAULTS = {
  bg: [250, 249, 246],
  surface: [255, 255, 255],
  heading: [30, 30, 34],
  body: [70, 70, 78],
  accent: [40, 90, 200],
};

// Categorical series for the data-viz preview. Defaults are the dataviz skill's
// validated categorical palette (slots 1-5), so the chart starts colour-correct
// and the tool's job is to re-mix these into a client's own harmonious set.
export const SERIES = [
  { id: "s0", name: "Direct" },
  { id: "s1", name: "Organic" },
  { id: "s2", name: "Referral" },
  { id: "s3", name: "Social" },
  { id: "s4", name: "Email" },
];

const SERIES_DEFAULTS = {
  s0: [42, 120, 214], // blue   #2a78d6
  s1: [235, 104, 52], // orange #eb6834
  s2: [27, 175, 122], // aqua   #1baf7a
  s3: [237, 161, 0], //  yellow #eda100
  s4: [232, 123, 164], // magenta #e87ba4
};

export class State {
  constructor() {
    this.pickedColor = null; // [r,g,b]
    this.roles = {};
    for (const r of ROLES) this.roles[r.id] = DEFAULTS[r.id].slice();
    this.series = {};
    for (const s of SERIES) this.series[s.id] = SERIES_DEFAULTS[s.id].slice();
    this._subs = [];
  }

  assignSeries(seriesId, rgb) {
    this.series[seriesId] = rgb.slice();
    this._emit();
  }

  subscribe(fn) {
    this._subs.push(fn);
  }

  _emit() {
    for (const fn of this._subs) fn(this);
  }

  setPicked(rgb) {
    this.pickedColor = rgb;
    this._emit();
  }

  assign(roleId, rgb) {
    this.roles[roleId] = rgb.slice();
    this._emit();
  }
}
