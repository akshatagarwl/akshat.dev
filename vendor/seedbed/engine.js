/*!
 * seedbed: a hover garden for any website. MIT licence.
 * https://github.com/VedSoni-dev/seedbed
 *
 * A quiet dot grid; flowers grow up out of the dots under the pointer, then wilt back into dots.
 * No dependencies, no network. One canvas, one requestAnimationFrame loop that sleeps when nothing moves.
 *
 *   <script type="module" src="seedbed.js"></script>
 *   <seedbed-garden preset="meadow" style="height:320px"></seedbed-garden>
 *
 * or from code:  import { createGarden } from "./seedbed.js";  const g = createGarden(el, { preset: "tulip" });
 */

// ---------------------------------------------------------------- styles

/** Each preset: card + dot colours, stem/leaf colours, petal palette, which head shapes, line mode. */
export const PRESETS = {
  meadow: {
    label: "Meadow",
    card: "#f7f1e3", dot: "#bdb4a3", stem: "#3e6a3c", leaf: "#68904d",
    petals: ["#ea7aa7", "#a57dd8", "#e3b23c", "#f6ecd4", "#d8628c", "#b993e6"],
    center: "#f0bf37", heads: ["cosmos", "cosmos", "daisy"], line: false, glow: 0,
  },
  night: {
    label: "Night",
    card: "#18203a", dot: "#435071", stem: "#8db9a2", leaf: "#6c9c86",
    petals: ["#f4f1ff", "#cdd7ff", "#ffe8b6", "#e6d3ff", "#ffffff"],
    center: "#ffd468", heads: ["cosmos", "daisy", "daisy"], line: false, glow: 8,
  },
  tulip: {
    label: "Tulip",
    card: "#fbf0e4", dot: "#c9b6a2", stem: "#4c7a3d", leaf: "#6f9a4f",
    petals: ["#e2483b", "#f08a3a", "#f3b33d", "#d93a63", "#f26f5c"],
    center: "#7a3b22", heads: ["tulip"], line: false, glow: 0,
  },
  lavender: {
    label: "Lavender",
    card: "#f3f0f8", dot: "#bab3c9", stem: "#55784f", leaf: "#7d9c6e",
    petals: ["#8f6bd1", "#a587e0", "#7656bf", "#b9a2ea", "#6c4fb0"],
    center: "#f3e7a8", heads: ["spike", "spike", "spike", "daisy"], line: false, glow: 0,
  },
  ink: {
    label: "Ink",
    card: "#fbfaf6", dot: "#c4c0b6", stem: "#1d1d1b", leaf: "#1d1d1b",
    petals: ["#1d1d1b"], center: "#1d1d1b", heads: ["cosmos", "daisy", "tulip"], line: true, glow: 0,
  },
};

export const HEADS = ["cosmos", "daisy", "tulip", "spike"];

export const DEFAULTS = {
  preset: "meadow",   // a key of PRESETS
  custom: null,       // or a full style object (same shape as a preset) that wins over `preset`
  night: false,       // flips any light preset to the Night palette
  pitch: 39,          // px between dots
  radius: 130,        // px around the pointer that blooms
  height: 1.5,        // stem height, in dot pitches
  speed: 1,           // grow / wilt speed multiplier
  wiltDelay: 380,     // ms a flower holds after the pointer leaves it
  density: 1,         // every Nth dot can bloom
  seed: 7,            // changes which flower grows where
  maxBlooms: 260,     // cap on growing plants at once
  ghost: true,        // one demo sweep on load until someone moves
};

const RANGES = {
  pitch: [18, 90], radius: [40, 420], height: [0.4, 4], speed: [0.2, 4],
  wiltDelay: [0, 4000], density: [1, 6], seed: [0, 99999], maxBlooms: [10, 2000],
};

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v, fb) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : fb);

/** Clean a style object: any bad colour falls back to Meadow's; heads limited to known shapes. */
export function normalizeStyle(s) {
  const base = PRESETS.meadow;
  if (!s || typeof s !== "object") return { ...base };
  const petals = Array.isArray(s.petals) ? s.petals.map((p) => hex(p, null)).filter(Boolean).slice(0, 8) : [];
  const heads = Array.isArray(s.heads) ? s.heads.filter((h) => HEADS.includes(h)).slice(0, 6) : [];
  return {
    label: typeof s.label === "string" && s.label.trim() ? s.label.trim().slice(0, 32) : "Custom",
    card: hex(s.card, base.card), dot: hex(s.dot, base.dot), stem: hex(s.stem, base.stem), leaf: hex(s.leaf, base.leaf),
    petals: petals.length ? petals : base.petals.slice(), center: hex(s.center, base.center),
    heads: heads.length ? heads : base.heads.slice(), line: !!s.line, glow: Math.max(0, Math.min(16, Number(s.glow) || 0)),
  };
}

/** Clamp every option. NaN, negatives, strings and huge numbers can never reach the engine. */
export function normalize(o) {
  const out = { ...DEFAULTS };
  if (!o || typeof o !== "object") return out;
  for (const k of Object.keys(RANGES)) {
    const n = Number(o[k]);
    if (o[k] !== undefined && o[k] !== null && o[k] !== "" && Number.isFinite(n)) {
      const [lo, hi] = RANGES[k];
      out[k] = Math.min(hi, Math.max(lo, n));
    }
  }
  out.density = Math.round(out.density);
  out.maxBlooms = Math.round(out.maxBlooms);
  out.seed = Math.round(out.seed);
  if (typeof o.preset === "string" && PRESETS[o.preset]) out.preset = o.preset;
  out.custom = o.custom ? normalizeStyle(o.custom) : null;
  out.night = o.night === true || o.night === "true" || o.night === "";
  out.ghost = !(o.ghost === false || o.ghost === "false");
  return out;
}

export function resolveStyle(opts) {
  if (opts.night) return PRESETS.night;
  return opts.custom || PRESETS[opts.preset] || PRESETS.meadow;
}

// ---------------------------------------------------------------- life cycle (pure, unit-tested)

/** How far a dot wants to grow for a pointer at distance d: full bloom in the inner half, partial at the edge. */
export function targetFor(d, radius) {
  if (d >= radius) return 0;
  return Math.min(1, (1 - d / radius) * 1.9);
}

/**
 * One dot, one step. Growth eases toward the target; a dot the pointer left holds for wiltDelay (+ its own
 * jitter), then wilts in reverse. Re-entering mid-wilt reverses from where it is: nothing restarts.
 * @param {{g:number,t:number,near:number,jit:number}} d  mutable dot state; near = last time (ms) the pointer reached it
 */
export function stepDot(d, now, dt, o) {
  if (d.t > 0 && now - d.near > o.wiltDelay + d.jit) d.t = 0;
  const growRate = 2.9 * o.speed;  // ~350 ms from seed to open head
  const wiltRate = 0.85 * o.speed; // ~1.2 s back to a dot
  if (d.g < d.t) d.g = Math.min(d.t, d.g + growRate * dt);
  else if (d.g > d.t) d.g = Math.max(d.t, d.g - wiltRate * dt);
  if (d.g < 0.002 && d.t === 0) d.g = 0;
  return d.g;
}

// ---------------------------------------------------------------- drawing

function rand(seed) { // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function leaf(ctx, x, y, len, ang, style) {
  if (len < 0.6) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.42, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.42, 0, 0);
  if (style.line) { ctx.strokeStyle = style.leaf; ctx.lineWidth = 1; ctx.stroke(); }
  else {
    ctx.fillStyle = style.leaf; ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(len * 0.1, 0); ctx.lineTo(len * 0.8, 0); ctx.stroke();
  }
  ctx.restore();
}

function petalPath(ctx, len, w) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(w, -len * 0.25, w * 0.8, -len * 0.95, 0, -len);
  ctx.bezierCurveTo(-w * 0.8, -len * 0.95, -w, -len * 0.25, 0, 0);
}

function paint(ctx, style, color) {
  if (style.line) { ctx.strokeStyle = style.stem; ctx.lineWidth = 1; ctx.stroke(); }
  else { ctx.fillStyle = color; ctx.fill(); }
}

function head(ctx, kind, x, y, r, open, rot, color, style) {
  if (r * open < 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (style.glow) { ctx.shadowColor = color; ctx.shadowBlur = style.glow * open; }
  const s = easeBack(open);
  if (kind === "cosmos" || kind === "daisy") {
    const n = kind === "cosmos" ? 8 : 13;
    const len = r * s, w = kind === "cosmos" ? r * 0.42 * s : r * 0.2 * s;
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.rotate((i / n) * Math.PI * 2); petalPath(ctx, len, w); paint(ctx, style, color); ctx.restore();
    }
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(0, 0, r * (kind === "cosmos" ? 0.26 : 0.3) * s, 0, Math.PI * 2);
    if (style.line) { ctx.strokeStyle = style.stem; ctx.lineWidth = 1; ctx.stroke(); } else { ctx.fillStyle = style.center; ctx.fill(); }
  } else if (kind === "tulip") {
    const h = r * 1.3 * s, w = r * 0.62 * Math.min(1, s);
    for (const side of [-1, 1, 0]) {
      ctx.beginPath();
      ctx.moveTo(side * w * 0.25, h * 0.15);
      ctx.bezierCurveTo(side * w * 1.2 - (side === 0 ? w * 0.6 : 0), h * 0.05, side * w * 0.9 - (side === 0 ? w * 0.55 : 0), -h * 0.75, side * w * 0.35, -h * 0.85);
      ctx.bezierCurveTo(side * w * 0.2 + (side === 0 ? w * 0.55 : 0), -h * 0.5, side * w * 0.1 + (side === 0 ? w * 0.6 : 0), h * 0.05, side * w * 0.25, h * 0.15);
      paint(ctx, style, color);
      if (!style.line) { ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 0.6; ctx.stroke(); }
    }
  } else { // spike: lavender-like stack of buds up the top of the stem
    const n = 7;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), grown = clamp01(open * 1.6 - k * 0.6);
      if (grown <= 0) continue;
      const by = -k * r * 1.7, bw = r * 0.3 * (1 - k * 0.45) * grown;
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.ellipse(side * bw * 0.7, by, bw, bw * 0.62, side * 0.5, 0, Math.PI * 2); paint(ctx, style, color);
      }
    }
  }
  ctx.restore();
}

function drawPlant(ctx, x, y, g, p, o, style) {
  const pitch = o.pitch;
  const sp = easeOut(clamp01(g / 0.4));
  const lp = easeOut(clamp01((g - 0.4) / 0.3));
  const hp = clamp01((g - 0.7) / 0.3);
  const L = pitch * o.height * p.h * sp;
  if (L < 0.5) return;
  const tx = x + p.tilt * L * 0.35, ty = y - L;
  const cx = x + p.tilt * L * 0.05 + p.bend * L * 0.25, cy = y - L * 0.55;
  ctx.strokeStyle = style.stem;
  ctx.lineWidth = Math.max(1, pitch * 0.04);
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
  if (lp > 0) {
    const at = (t) => [ (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx, (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ty ];
    const ll = pitch * 0.34 * lp * p.leaf;
    const [ax, ay] = at(0.32), [bx, by] = at(0.58);
    leaf(ctx, ax, ay, ll, p.side > 0 ? -0.55 : Math.PI + 0.55, style);
    if (p.two) leaf(ctx, bx, by, ll * 0.8, p.side > 0 ? Math.PI + 0.6 : -0.6, style);
  }
  if (hp > 0) {
    const kind = style.heads[p.kind % style.heads.length];
    const color = style.petals[p.color % style.petals.length];
    const r = pitch * 0.36 * p.size;
    head(ctx, kind, tx, ty, r, hp, kind === "spike" || kind === "tulip" ? p.tilt * 0.35 : p.rot, color, style);
  }
}

// ---------------------------------------------------------------- the garden

const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Mount a garden in `el` (any block element with a size). Returns { set(opts), sweep(), clear(), destroy() }.
 */
export function createGarden(el, input) {
  let o = normalize(input);
  let style = resolveStyle(o);
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none";
  if (getComputedStyle(el).position === "static") el.style.position = "relative";
  el.appendChild(canvas);
  const ctx = canvas.getContext && canvas.getContext("2d");
  const dotLayer = document.createElement("canvas");
  const dctx = dotLayer.getContext && dotLayer.getContext("2d");

  let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, ox = 0, oy = 0;
  let dots = [];          // per-dot state
  let plants = [];        // per-dot seeded look
  let active = new Set(); // indices with growth or target > 0
  let ptr = null;         // {x,y} in CSS px, or null
  let ghost = null;       // {t0} while the demo sweep runs
  let raf = 0, last = 0, visible = true, inView = true, dead = false, errors = 0;
  let reduce = reducedMotion();

  function fallback() { // no canvas 2D: a plain CSS dot grid, never throw
    canvas.remove();
    el.style.backgroundColor = style.card;
    el.style.backgroundImage = `radial-gradient(${style.dot} 1.6px, transparent 1.8px)`;
    el.style.backgroundSize = `${o.pitch}px ${o.pitch}px`;
    if (typeof console !== "undefined") console.warn("seedbed: canvas 2D is unavailable, showing a static dot grid.");
  }
  if (!ctx || !dctx) { fallback(); return { set() {}, sweep() {}, clear() {}, destroy() {} }; }

  function seedPlants() {
    plants = new Array(cols * rows);
    for (let i = 0; i < plants.length; i++) {
      const r = rand(i * 7919 + o.seed * 104729 + 13);
      plants[i] = {
        h: 0.7 + r() * 0.65, tilt: (r() - 0.5) * 0.9, bend: (r() - 0.5) * 0.6, rot: r() * Math.PI,
        size: 0.75 + r() * 0.5, leaf: 0.8 + r() * 0.4, side: r() < 0.5 ? -1 : 1, two: r() < 0.6,
        kind: Math.floor(r() * 997), color: Math.floor(r() * 991), can: true,
      };
      const c = i % cols, row = Math.floor(i / cols);
      plants[i].can = (c + row * 2) % o.density === 0;
    }
  }

  function layout() {
    const rect = el.getBoundingClientRect();
    W = Math.max(0, Math.round(rect.width)); H = Math.max(0, Math.round(rect.height));
    dpr = Math.min(2, typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
    for (const c of [canvas, dotLayer]) { c.width = Math.max(1, W * dpr); c.height = Math.max(1, H * dpr); }
    const p = o.pitch;
    cols = Math.max(0, Math.floor((W - p * 0.5) / p));
    rows = Math.max(0, Math.floor((H - p * 0.5) / p));
    ox = (W - (cols - 1) * p) / 2; oy = (H - (rows - 1) * p) / 2 + p * 0.25;
    if (cols <= 0 || rows <= 0) cols = rows = 0;
    dots = new Array(cols * rows);
    for (let i = 0; i < dots.length; i++) dots[i] = { g: 0, t: 0, near: -1e9, jit: 0 };
    for (let i = 0; i < dots.length; i++) dots[i].jit = rand(i * 31 + o.seed)() * 260;
    active = new Set();
    seedPlants();
    paintDots();
    draw();
  }

  function paintDots() {
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.clearRect(0, 0, W, H);
    dctx.fillStyle = style.card; dctx.fillRect(0, 0, W, H);
    dctx.fillStyle = style.dot;
    const r = Math.max(1.2, o.pitch * 0.045);
    for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
      dctx.beginPath(); dctx.arc(ox + c * o.pitch, oy + row * o.pitch, r, 0, Math.PI * 2); dctx.fill();
    }
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(dotLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // back to front: top rows first so lower plants overlap the ones behind them
    const list = Array.from(active).sort((a, b) => a - b);
    for (const i of list) {
      const g = dots[i].g;
      if (g <= 0) continue;
      const c = i % cols, row = (i / cols) | 0;
      drawPlant(ctx, ox + c * o.pitch, oy + row * o.pitch, g, plants[i], o, style);
    }
  }

  function touch(px, py, now) {
    if (!cols) return;
    const p = o.pitch, R = o.radius;
    const c0 = Math.max(0, Math.floor((px - R - ox) / p)), c1 = Math.min(cols - 1, Math.ceil((px + R - ox) / p));
    // flowers rise above their dot, so reach a little further below the pointer than above it
    const r0 = Math.max(0, Math.floor((py - R - oy) / p)), r1 = Math.min(rows - 1, Math.ceil((py + R + p * o.height * 0.5 - oy) / p));
    for (let row = r0; row <= r1; row++) for (let c = c0; c <= c1; c++) {
      const i = row * cols + c;
      if (!plants[i].can) continue;
      const dx = ox + c * p - px, dy = (oy + row * p - p * o.height * 0.45) - py;
      const t = targetFor(Math.hypot(dx, dy), R);
      if (t <= 0) continue;
      const d = dots[i];
      if (!active.has(i)) { if (active.size >= o.maxBlooms) continue; active.add(i); }
      if (t >= d.t) d.t = t;
      d.near = now;
    }
  }

  function frame(now) {
    raf = 0;
    if (dead) return;
    try {
      const dt = Math.min(0.05, Math.max(0, (now - (last || now)) / 1000)); // clamp: a background tab never jumps
      last = now;
      if (ghost) {
        if (ghost.t0 == null) ghost.t0 = now; // the sweep's clock starts on its first frame in view, not at mount
        const k = (now - ghost.t0) / 2600;
        if (k >= 1) ghost = null;
        else touch(W * (0.08 + 0.84 * k), H * (0.5 + 0.28 * Math.sin(k * Math.PI * 2.2)), now);
      }
      if (ptr) touch(ptr.x, ptr.y, now);
      for (const i of active) {
        const d = dots[i];
        if (reduce) { if (d.t > 0 && now - d.near > o.wiltDelay + d.jit) d.t = 0; d.g = d.t; }
        else stepDot(d, now, dt, o);
        if (d.g === 0 && d.t === 0) active.delete(i);
      }
      draw();
      errors = 0;
    } catch (e) {
      if (++errors > 3) { dead = true; console.warn("seedbed: stopped after repeated errors", e); return; }
    }
    if ((active.size || ptr || ghost) && visible && inView) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  const wake = () => { if (!raf && !dead && visible && inView) raf = requestAnimationFrame(frame); };

  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const onMove = (e) => { ghost = null; ptr = pos(e); wake(); };
  const onLeave = () => { ptr = null; wake(); };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointercancel", onLeave);
  canvas.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") onLeave(); });

  const onVis = () => { visible = document.visibilityState !== "hidden"; if (visible) wake(); };
  document.addEventListener("visibilitychange", onVis);
  const io = typeof IntersectionObserver === "function" ? new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; if (inView) wake(); }) : null;
  io && io.observe(el);
  let rzT = 0;
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { clearTimeout(rzT); rzT = setTimeout(layout, 60); }) : null;
  ro && ro.observe(el);
  const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  const onMq = () => { reduce = reducedMotion(); };
  mq && mq.addEventListener && mq.addEventListener("change", onMq);

  layout();
  if (o.ghost && !reduce) { ghost = { t0: null }; wake(); }

  return {
    /** Change options live. Pitch or seed changes rebuild the grid; style changes repaint in place. */
    set(next) {
      const prev = o;
      o = normalize({ ...prev, ...next, custom: next && "custom" in next ? next.custom : prev.custom });
      style = resolveStyle(o);
      if (o.pitch !== prev.pitch || o.seed !== prev.seed || o.density !== prev.density) layout();
      else { paintDots(); draw(); }
      wake();
    },
    /** Run the demo sweep again. */
    sweep() { if (!reduce) { ghost = { t0: performance.now() }; wake(); } },
    /** Everything back to dots at once. */
    clear() { for (const i of active) { dots[i].g = 0; dots[i].t = 0; } active.clear(); draw(); },
    /** For tests: how many plants are growing. */
    get activeCount() { return active.size; },
    destroy() {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      io && io.disconnect(); ro && ro.disconnect();
      mq && mq.removeEventListener && mq.removeEventListener("change", onMq);
      clearTimeout(rzT);
      canvas.remove();
    },
  };
}

// ---------------------------------------------------------------- <seedbed-garden>

const ATTRS = { preset: "preset", night: "night", pitch: "pitch", radius: "radius", height: "height", speed: "speed",
  "wilt-delay": "wiltDelay", density: "density", seed: "seed", "max-blooms": "maxBlooms", ghost: "ghost", "custom-style": "custom" };

if (typeof window !== "undefined" && typeof customElements !== "undefined" && !customElements.get("seedbed-garden")) {
  class SeedbedGarden extends HTMLElement {
    static get observedAttributes() { return Object.keys(ATTRS); }
    opts() {
      const o = { custom: null };
      for (const [a, k] of Object.entries(ATTRS)) {
        if (!this.hasAttribute(a)) continue;
        const v = this.getAttribute(a);
        if (k === "custom") { try { o.custom = JSON.parse(v); } catch { /* bad JSON: ignore */ } }
        else o[k] = v;
      }
      return o;
    }
    connectedCallback() {
      if (!this.style.display) this.style.display = "block";
      if (!this.style.height && !this.getAttribute("style")?.includes("height")) this.style.height = "320px";
      this.garden = createGarden(this, this.opts());
    }
    attributeChangedCallback() { this.garden && this.garden.set(this.opts()); }
    disconnectedCallback() { this.garden && this.garden.destroy(); this.garden = null; }
  }
  customElements.define("seedbed-garden", SeedbedGarden);
}
