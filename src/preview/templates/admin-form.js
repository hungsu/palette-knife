// Snowflake-console-style settings form template.
//
// Section headings, labelled inputs, a toggle, an inline validation error, and a
// primary Save button. Exercises borders, muted text and semantic states — the
// hardest contrast case for a palette.

export default {
  id: "admin",
  name: "Settings form",

  swatches: [
    { kind: "role", id: "bg", label: "Page bg" },
    { kind: "role", id: "surface", label: "Card" },
    { kind: "role", id: "surfaceAlt", label: "Input fill" },
    { kind: "role", id: "border", label: "Border" },
    { kind: "role", id: "heading", label: "Heading" },
    { kind: "role", id: "body", label: "Label / value" },
    { kind: "role", id: "muted", label: "Helper text" },
    { kind: "role", id: "primary", label: "Primary" },
    { kind: "role", id: "onPrimary", label: "On primary" },
    { kind: "role", id: "danger", label: "Danger" },
  ],

  pairs: [
    { text: "heading", on: "surface", large: true },
    { text: "body", on: "surface" },
    { text: "body", on: "surfaceAlt" },
    { text: "muted", on: "surface" },
    { text: "onPrimary", on: "primary" },
    { text: "danger", on: "surface" },
  ],

  render(state, ctx) {
    const field = (label, value, helper, opts = {}) => {
      const invalid = opts.invalid;
      const bcol = invalid ? ctx.rc("danger") : ctx.rc("border");
      return `
        <div class="af-field">
          <label class="af-label" style="color:${ctx.rc("body")}">${label}</label>
          <div class="af-input" style="background:${ctx.rc("surfaceAlt")};border-color:${bcol};color:${ctx.rc("body")}">
            ${value}
          </div>
          ${
            invalid
              ? `<div class="af-error" style="color:${ctx.rc("danger")}">${helper}</div>`
              : `<div class="af-help" style="color:${ctx.rc("muted")}">${helper}</div>`
          }
        </div>`;
    };

    return `
      <div class="af-page" style="background:${ctx.rc("bg")}">
        <div class="af-card" style="background:${ctx.rc("surface")};border-color:${ctx.rc("border")}">
          <h2 class="af-title" style="color:${ctx.rc("heading")}">Account settings</h2>
          <p class="af-sub" style="color:${ctx.rc("muted")}">Manage your organization's defaults and access.</p>

          <h3 class="af-section" style="color:${ctx.rc("heading")};border-color:${ctx.rc("border")}">Profile</h3>
          ${field("Organization name", "ACME_ANALYTICS", "Shown across the console.")}
          ${field("Primary email", "ops@acme", "Enter a valid email address.", { invalid: true })}

          <h3 class="af-section" style="color:${ctx.rc("heading")};border-color:${ctx.rc("border")}">Preferences</h3>
          <div class="af-toggle-row">
            <div>
              <div class="af-label" style="color:${ctx.rc("body")}">Auto-suspend warehouses</div>
              <div class="af-help" style="color:${ctx.rc("muted")}">Pause idle compute after 10 minutes.</div>
            </div>
            <span class="af-toggle" style="background:${ctx.rc("primary")}">
              <span class="af-knob" style="background:${ctx.rc("onPrimary")}"></span>
            </span>
          </div>
          ${field("Default role", "SYSADMIN", "Applied to new sessions.")}

          <div class="af-actions" style="border-color:${ctx.rc("border")}">
            <button class="af-btn-secondary" style="color:${ctx.rc("primary")};border-color:${ctx.rc("primary")}">Cancel</button>
            <button class="af-btn-primary" style="background:${ctx.rc("primary")};color:${ctx.rc("onPrimary")}">Save changes</button>
          </div>
        </div>
      </div>
    `;
  },
};
