// Contrast metrics: WCAG 2 ratio (familiar) + APCA Lc (modern readability).
//
// A UI palette has a readability contract a painting does not. These give the
// guardrails on the preview side.

function srgbToLin(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// --- WCAG 2.x contrast ratio (1..21) ---
export function wcagRatio(rgb1, rgb2) {
  const lum = (rgb) =>
    0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]);
  const l1 = lum(rgb1);
  const l2 = lum(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- APCA (Lc), simplified per the APCA-W3 0.1.9 public algorithm ---
// Returns signed-ish Lc magnitude (0..~108). text over bg.
export function apcaLc(textRgb, bgRgb) {
  const Ys = (rgb) =>
    0.2126729 * Math.pow(rgb[0] / 255, 2.4) +
    0.7151522 * Math.pow(rgb[1] / 255, 2.4) +
    0.072175 * Math.pow(rgb[2] / 255, 2.4);

  let Ytxt = Ys(textRgb);
  let Ybg = Ys(bgRgb);

  const blkThrs = 0.022;
  const blkClmp = 1.414;
  const clamp = (Y) => (Y < blkThrs ? Y + Math.pow(blkThrs - Y, blkClmp) : Y);
  Ytxt = clamp(Ytxt);
  Ybg = clamp(Ybg);

  if (Math.abs(Ybg - Ytxt) < 0.0005) return 0;

  let Lc;
  const scaleBoW = 1.14;
  const scaleWoB = 1.14;
  const loBoWoffset = 0.027;
  const loWoBoffset = 0.027;

  if (Ybg > Ytxt) {
    // normal polarity: dark text on light bg
    Lc = (Math.pow(Ybg, 0.56) - Math.pow(Ytxt, 0.57)) * scaleBoW;
    Lc = Lc < 0.001 ? 0 : Lc - loBoWoffset;
  } else {
    // reverse polarity: light text on dark bg
    Lc = (Math.pow(Ybg, 0.65) - Math.pow(Ytxt, 0.62)) * scaleWoB;
    Lc = Lc > -0.001 ? 0 : Lc + loWoBoffset;
  }
  return Math.abs(Lc) * 100;
}

// Judgement helpers for UI display.
export function wcagLevel(ratio, large = false) {
  if (large) return ratio >= 3 ? "AA" : "fail";
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "fail";
}

// Rough APCA usage guide: body text wants ~Lc 75+, large/heading ~Lc 60+.
export function apcaLevel(lc, large = false) {
  const min = large ? 60 : 75;
  if (lc >= min + 15) return "good";
  if (lc >= min) return "ok";
  return "fail";
}
