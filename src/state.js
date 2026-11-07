// App state: the currently picked color and the color assigned to each UI role.
//
// Roles are a shared, template-agnostic semantic palette; every preview template
// draws from these same ids. Defaults are Snowflake's brand colours so the preview
// opens "Snowflake-flavoured" and the exercise becomes re-mixing their set.

export const ROLES = [
  { id: "bg", name: "Background", kind: "surface" },
  { id: "surface", name: "Surface", kind: "surface" },
  { id: "surfaceAlt", name: "Surface alt", kind: "surface" },
  { id: "border", name: "Border", kind: "line" },
  { id: "heading", name: "Heading", kind: "text" },
  { id: "body", name: "Body text", kind: "text" },
  { id: "muted", name: "Muted text", kind: "text" },
  { id: "primary", name: "Primary", kind: "fill" },
  { id: "onPrimary", name: "On primary", kind: "text" },
  { id: "success", name: "Success", kind: "fill" },
  { id: "warning", name: "Warning", kind: "fill" },
  { id: "danger", name: "Danger", kind: "fill" },
  { id: "heroBg", name: "Hero background", kind: "surface" },
];

// Snowflake brand palette (snowflake.com/brand-guidelines):
// Snowflake Blue #29B5E8, Mid Blue #11567F, Winter #24323D, Windy City #8A999E,
// Valencia Orange #FF9F36, First Light #D45B90.
const DEFAULTS = {
  bg: [245, 250, 252], //   #f5fafc  cool near-white
  surface: [255, 255, 255], // #ffffff
  surfaceAlt: [238, 244, 248], // #eef4f8  subtle panel / input fill
  border: [213, 222, 227], //   #d5dee3  windy-city tint
  heading: [17, 86, 127], //    #11567f  Mid Blue
  body: [36, 50, 61], //        #24323d  Winter
  muted: [138, 153, 158], //    #8a999e  Windy City
  primary: [41, 181, 232], //   #29b5e8  Snowflake Blue
  onPrimary: [255, 255, 255], //#ffffff
  success: [24, 160, 120], //   #18a078  Snowflake-toned green
  warning: [255, 159, 54], //   #ff9f36  Valencia Orange
  danger: [196, 59, 107], //    #c43b6b  First-Light-derived red-pink
  heroBg: [0, 41, 54], //       #002936  Iceberg-toned dark brand surface
};

// Categorical series for the dashboard chart. Defaults are Snowflake's secondary
// palette — a ready-made categorical set. Names read like Snowsight usage buckets.
export const SERIES = [
  { id: "s0", name: "Compute" },
  { id: "s1", name: "Storage" },
  { id: "s2", name: "Cloud Services" },
  { id: "s3", name: "Serverless" },
  { id: "s4", name: "Data Transfer" },
];

const SERIES_DEFAULTS = {
  s0: [41, 181, 232], //  #29b5e8  Snowflake Blue
  s1: [255, 159, 54], //  #ff9f36  Valencia Orange
  s2: [113, 221, 220], // #71d3dc  Star Blue
  s3: [125, 68, 207], //  #7d44cf  Purple Moon
  s4: [212, 91, 144], //  #d45b90  First Light
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
