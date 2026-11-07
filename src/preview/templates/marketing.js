// snowflake.com-style marketing landing template.
//
// A dark hero section with a big heading + CTA, then light feature cards below.
// Shows the palette on both dark and light surfaces. The hero's background is
// the `heroBg` role (defaults to a dark Iceberg-toned brand surface), while
// cards sit on the light `surface` role.

const FEATURES = [
  { title: "Elastic compute", body: "Scale warehouses up and down instantly, paying only for what you run." },
  { title: "Secure sharing", body: "Share governed, live data across teams and clouds without copies." },
  { title: "Unified governance", body: "One model for access, lineage and policy across every workload." },
];

export default {
  id: "marketing",
  name: "Marketing landing",

  swatches: [
    { kind: "role", id: "bg", label: "Page bg" },
    { kind: "role", id: "surface", label: "Card" },
    { kind: "role", id: "border", label: "Border" },
    { kind: "role", id: "heading", label: "Card heading" },
    { kind: "role", id: "body", label: "Body" },
    { kind: "role", id: "muted", label: "Muted" },
    { kind: "role", id: "primary", label: "Primary / CTA" },
    { kind: "role", id: "onPrimary", label: "On primary" },
    { kind: "role", id: "heroBg", label: "Hero bg" },
  ],

  pairs: [
    { text: "primary", on: "heroBg", label: "Hero accent on dark", large: true },
    { text: "onPrimary", on: "primary" },
    { text: "heading", on: "surface", large: true },
    { text: "body", on: "surface" },
    { text: "muted", on: "surface" },
  ],

  render(state, ctx) {
    const cards = FEATURES.map(
      (f) => `
      <div class="mk-card" style="background:${ctx.rc("surface")};border-color:${ctx.rc("border")}">
        <span class="mk-card-mark" style="background:${ctx.rc("primary")}"></span>
        <h3 style="color:${ctx.rc("heading")}">${f.title}</h3>
        <p style="color:${ctx.rc("body")}">${f.body}</p>
      </div>`
    ).join("");

    return `
      <div class="mk-page" style="background:${ctx.rc("bg")}">
        <section class="mk-hero" style="background:${ctx.rc("heroBg")}">
          <nav class="mk-nav">
            <span class="mk-brand">
              <span class="mk-mark" style="background:${ctx.rc("primary")}"></span>
              <span style="color:#fff">Data Cloud</span>
            </span>
            <span class="mk-nav-links" style="color:rgba(255,255,255,0.7)">Product · Pricing · Docs</span>
            <button class="mk-cta-sm" style="background:${ctx.rc("primary")};color:${ctx.rc("onPrimary")}">Start free</button>
          </nav>
          <div class="mk-hero-body">
            <h1 class="mk-h1" style="color:#ffffff">Mobilize your data<br/><span style="color:${ctx.rc("primary")}">without limits</span></h1>
            <p class="mk-lede" style="color:rgba(255,255,255,0.78)">
              One platform for data warehousing, engineering and AI — across every cloud.
            </p>
            <div class="mk-hero-actions">
              <button class="mk-cta" style="background:${ctx.rc("primary")};color:${ctx.rc("onPrimary")}">Get started</button>
              <button class="mk-cta-outline" style="color:#fff;border-color:rgba(255,255,255,0.5)">Watch demo</button>
            </div>
          </div>
        </section>
        <section class="mk-features">
          ${cards}
        </section>
      </div>
    `;
  },
};
