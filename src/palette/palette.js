// Fluid raster paint surface.
//
// Pixels are the source of truth (an in-memory ImageData buffer). A loaded brush
// mixes pigment INTO whatever it drags across, and picks up paint as it goes, so
// smearing one color through another produces a smooth, pigment-correct gradient
// (blue dragged through yellow -> green mid-stroke). All mixing goes through
// mixbox.lerp so it stays subtractive per pixel.
//
// Perf note: CPU per-pixel mixing on the brush's dirty rect. If this drops
// frames, the escape hatch is mixbox.glsl on a WebGL surface.

// Paper is only a display backdrop, never a pigment. The surface is genuinely
// colourless: the alpha channel is paint coverage (0 = no paint). This is what
// makes smudging empty palette into paint a no-op.
const PAPER = [138, 138, 134];

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class Palette {
  constructor(canvas, { onPick, onStrokeStart } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.onPick = onPick || (() => {});
    this.onStrokeStart = onStrokeStart || (() => {});

    // kind: "paint" loads fresh pigment; "smudge" only drags existing paint.
    this.brush = { rgb: [25, 0, 89], radius: 26, kind: "paint", load: 0.6, pickup: 0.09 };
    this.mode = "paint"; // "paint" | "pick"

    this._painting = false;
    this._last = null;
    this._carried = null; // rgb the brush currently holds
    this._carriedA = 0; // how much paint the brush holds (0-255)

    this._initBuffer();
    this._bindPointer();
  }

  _initBuffer() {
    const { width, height } = this.canvas;
    // createImageData is all-zero => fully transparent = no paint anywhere.
    this.img = this.ctx.createImageData(width, height);
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.putImageData(this.img, 0, 0);
  }

  // Resize keeps existing paint (draw old buffer, re-read at new size).
  resize(width, height) {
    const old = this.img;
    this.canvas.width = width;
    this.canvas.height = height;
    this._initBuffer();
    if (old) {
      const tmp = document.createElement("canvas");
      tmp.width = old.width;
      tmp.height = old.height;
      tmp.getContext("2d").putImageData(old, 0, 0);
      this.ctx.drawImage(tmp, 0, 0);
      this.img = this.ctx.getImageData(0, 0, width, height);
    }
  }

  setBrushColor(rgb) {
    this.brush.rgb = rgb.slice();
    this.brush.kind = "paint";
    this.brush.load = 0.6;
    this.brush.pickup = 0.09;
    this.mode = "paint";
  }

  // Smudge: no fresh pigment. Strong pickup + gentle deposit drags whatever is
  // already on the surface, blending two painted colors without adding a third.
  setSmudge() {
    this.brush.kind = "smudge";
    this.brush.load = 0.5;
    this.brush.pickup = 0.5;
    this.mode = "paint";
  }

  // Wipe back to fresh paper.
  clear() {
    this._initBuffer();
  }

  setBrushRadius(r) {
    this.brush.radius = r;
  }

  setPickMode(on) {
    this.mode = on ? "pick" : "paint";
    this.canvas.style.cursor = on ? "crosshair" : "cell";
  }

  // --- undo support ---
  snapshot() {
    return new ImageData(new Uint8ClampedArray(this.img.data), this.img.width, this.img.height);
  }
  restore(snap) {
    this.img = new ImageData(new Uint8ClampedArray(snap.data), snap.width, snap.height);
    this.ctx.putImageData(this.img, 0, 0);
  }

  // --- sampling ---
  // raw: straight color + paint coverage at a pixel.
  pixelRaw(x, y) {
    const w = this.img.width;
    const px = Math.max(0, Math.min(w - 1, x | 0));
    const py = Math.max(0, Math.min(this.img.height - 1, y | 0));
    const i = (py * w + px) * 4;
    const d = this.img.data;
    return { rgb: [d[i], d[i + 1], d[i + 2]], a: d[i + 3] };
  }

  // visible color = paint composited over paper (what the eye/eyedropper sees).
  pixel(x, y) {
    const { rgb, a } = this.pixelRaw(x, y);
    const f = a / 255;
    return [
      Math.round(rgb[0] * f + PAPER[0] * (1 - f)),
      Math.round(rgb[1] * f + PAPER[1] * (1 - f)),
      Math.round(rgb[2] * f + PAPER[2] * (1 - f)),
    ];
  }

  pick(x, y) {
    const rgb = this.pixel(x, y);
    this.onPick(rgb);
    return rgb;
  }

  // --- painting ---
  _pos(evt) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - r.left) * (this.canvas.width / r.width),
      y: (evt.clientY - r.top) * (this.canvas.height / r.height),
    };
  }

  // Stamp the brush at (cx,cy). Coverage (alpha) gates everything:
  //  - the brush only picks up paint where coverage > 0 (empty picks up nothing);
  //  - deposit strength scales by how much paint the brush actually holds, so a
  //    brush carrying nothing (over colourless palette) deposits nothing.
  // Result: smearing empty palette into paint is a no-op; smearing paint spreads
  // and blends it. Mutates the buffer's dirty rect only.
  stamp(cx, cy) {
    const mixbox = window.mixbox;
    const { radius, load, pickup } = this.brush;
    const w = this.img.width;
    const h = this.img.height;
    const d = this.img.data;

    // pick up the paint under the brush centre, gated by its coverage. Blend the
    // carried colour toward the picked-up colour in proportion to how much paint
    // is being added vs already held: an empty brush (carriedA≈0) fully adopts
    // the colour instead of averaging with leftover [0,0,0] (which looked black).
    const center = this.pixelRaw(cx, cy);
    if (center.a > 0) {
      const k = pickup * (center.a / 255);
      const added = (255 - this._carriedA) * k;
      const newA = this._carriedA + added;
      const frac = newA > 0 ? added / newA : 0;
      this._carried = mixbox.lerp(this._carried, center.rgb, frac);
      this._carriedA = newA;
    }
    const carriedFrac = this._carriedA / 255;

    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(w - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(h - 1, Math.ceil(cy + radius));

    let deposited = 0; // paint mass handed to the surface this stamp
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dist = Math.hypot(px - cx, py - cy);
        if (dist > radius) continue;
        const falloff = 1 - smoothstep(radius * 0.15, radius, dist);
        const te = load * falloff * carriedFrac; // scaled by paint held
        if (te <= 0.001) continue;
        const i = (py * w + px) * 4;
        const a0 = d[i + 3];
        if (a0 === 0) {
          // laying paint onto bare palette: take the carried colour directly
          d[i] = this._carried[0];
          d[i + 1] = this._carried[1];
          d[i + 2] = this._carried[2];
        } else {
          const out = mixbox.lerp([d[i], d[i + 1], d[i + 2]], this._carried, te);
          d[i] = out[0];
          d[i + 1] = out[1];
          d[i + 2] = out[2];
        }
        const dA = (255 - a0) * te; // coverage added at this pixel
        d[i + 3] = a0 + dA; // coverage grows toward opaque
        deposited += te; // spend proportional to how strongly we deposited
      }
    }

    // Conserve paint: depositing costs the reservoir, so a smudge that leaves
    // its source runs dry and tapers instead of smearing forever. Normalise the
    // summed deposit by the disc area so depletion is scale-independent, then
    // spend that fraction of the carried coverage.
    const discArea = Math.PI * radius * radius || 1;
    const spend = Math.min(1, deposited / discArea);
    this._carriedA *= 1 - spend;
    return { x0, y0, x1, y1 };
  }

  // Stroke from last point to (x,y), stamping at regular spacing to avoid gaps.
  strokeTo(x, y) {
    const spacing = Math.max(1, this.brush.radius * 0.3);
    const from = this._last || { x, y };
    const dx = x - from.x;
    const dy = y - from.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / spacing));
    let bounds = null;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const b = this.stamp(from.x + dx * t, from.y + dy * t);
      bounds = bounds ? merge(bounds, b) : b;
    }
    if (steps === 0) bounds = this.stamp(x, y);
    this._last = { x, y };
    if (bounds) this._flush(bounds);
  }

  _flush(b) {
    // putImageData can't take a sub-rect source directly; blit whole buffer.
    // (Fast enough; swap for dirtyRect variant if needed.)
    this.ctx.putImageData(this.img, 0, 0, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1);
  }

  _bindPointer() {
    this.canvas.addEventListener("pointerdown", (e) => {
      const { x, y } = this._pos(e);
      if (this.mode === "pick") {
        this.pick(x, y);
        return;
      }
      this.onStrokeStart(); // lets host push an undo snapshot
      this._painting = true;
      this._last = null;
      if (this.brush.kind === "smudge") {
        // smudge holds only real paint found under the brush (none = no-op)
        const s = this.pixelRaw(x, y);
        this._carried = s.rgb;
        this._carriedA = s.a;
      } else {
        // paint reloads fresh, fully-loaded pigment
        this._carried = this.brush.rgb.slice();
        this._carriedA = 255;
      }
      this.canvas.setPointerCapture(e.pointerId);
      this.strokeTo(x, y);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!this._painting) return;
      const { x, y } = this._pos(e);
      this.strokeTo(x, y);
    });
    const end = () => {
      this._painting = false;
      this._last = null;
    };
    this.canvas.addEventListener("pointerup", end);
    this.canvas.addEventListener("pointercancel", end);
  }
}

function merge(a, b) {
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}
