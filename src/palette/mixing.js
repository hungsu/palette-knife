// Mixbox wrapper: subtractive pigment mixing via latent space.
//
// This is the single most important module. Naive RGB averaging produces gray
// mud (blue + yellow -> gray). Mixbox mixes in a spectral latent space so
// blue + yellow -> green, like real paint. Everything mixes through mixMany()
// so two-blob blends and multi-dab modifiers share one correct code path.
//
// Mixbox is loaded as a global (vendor/mixbox.js, CC BY-NC 4.0).

const LATENT_SIZE = 7; // mixbox latent vectors are length 7

function assertMixbox() {
  if (typeof window.mixbox === "undefined") {
    throw new Error("mixbox global not loaded (vendor/mixbox.js)");
  }
}

// pigments: [{ rgb: [r,g,b], weight: number }, ...]
// Returns mixed rgb as [r,g,b] (0-255 ints). Weights are normalized here so
// callers can pass raw dab counts / areas without pre-normalizing.
export function mixMany(pigments) {
  assertMixbox();
  if (!pigments.length) return [0, 0, 0];

  const total = pigments.reduce((s, p) => s + p.weight, 0);
  if (total <= 0) return pigments[0].rgb.slice();

  const latent = new Array(LATENT_SIZE).fill(0);
  for (const p of pigments) {
    const w = p.weight / total;
    const l = window.mixbox.rgbToLatent(p.rgb);
    for (let i = 0; i < LATENT_SIZE; i++) latent[i] += w * l[i];
  }
  const rgb = window.mixbox.latentToRgb(latent);
  return [Math.round(rgb[0]), Math.round(rgb[1]), Math.round(rgb[2])];
}

// Convenience two-color interpolation, t in [0,1].
export function mixLerp(rgbA, rgbB, t) {
  return mixMany([
    { rgb: rgbA, weight: 1 - t },
    { rgb: rgbB, weight: t },
  ]);
}

export function rgbToHex([r, g, b]) {
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function rgbToCss([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}
