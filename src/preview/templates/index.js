// Template registry. Add a template module here to add a UI to the switcher —
// no other markup/JS changes needed.

import dashboard from "./dashboard.js";
import adminForm from "./admin-form.js";
import marketing from "./marketing.js";

export const TEMPLATES = [dashboard, adminForm, marketing];

export function templateById(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
