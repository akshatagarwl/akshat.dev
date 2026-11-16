// Copyright (c) 2026 seedbed contributors. MIT; see ../vendor/seedbed/LICENSE.
// Upstream scripts/test-engine.mjs; local import paths adapted.
// Life-cycle tests for the engine: pure functions only, no browser. Also a no-network check.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { stepDot, normalize, normalizeStyle, targetFor, DEFAULTS } from "../vendor/seedbed/engine.js";

const o = normalize({});
const run = (d, from, to, step = 16) => { for (let t = from; t <= to; t += step) stepDot(d, t, step / 1000, o); return d; };

// grows to full near the pointer
let d = { g: 0, t: 1, near: 0, jit: 0 };
run(d, 0, 300); assert.ok(d.g > 0.8, `grows (${d.g})`);
// holds during wiltDelay, then wilts all the way back
d = { g: 1, t: 1, near: 0, jit: 0 };
run(d, 0, o.wiltDelay - 20); assert.equal(d.g, 1, "holds while the pointer just left");
run(d, o.wiltDelay, o.wiltDelay + 2000); assert.equal(d.g, 0, "wilts back to a dot");
assert.equal(d.t, 0);
// leave mid-growth, re-enter mid-wilt: reverses from where it is, no restart
d = { g: 0.5, t: 0, near: -1e9, jit: 0 };
stepDot(d, 1000, 0.1, o); const mid = d.g; assert.ok(mid < 0.5 && mid > 0.3, "wilting from mid-growth");
d.t = 1; d.near = 1100; stepDot(d, 1100, 0.016, o); assert.ok(d.g > mid, "re-enter reverses upward");
// huge dt after a background tab is clamped by the engine loop; stepDot itself never overshoots
d = { g: 0.2, t: 0.6, near: 0, jit: 0 }; stepDot(d, 0, 50, o); assert.equal(d.g, 0.6);
d = { g: 0.9, t: 0, near: -1e9, jit: 0 }; stepDot(d, 0, 50, o); assert.equal(d.g, 0);
// target falls off with distance
assert.equal(targetFor(0, 100), 1); assert.equal(targetFor(100, 100), 0); assert.ok(targetFor(80, 100) < 0.5);
// normalize clamps garbage
const bad = normalize({ pitch: NaN, radius: -5, height: 1e9, speed: "x", density: 2.7, seed: "12", preset: "nope", maxBlooms: Infinity, wiltDelay: null });
assert.equal(bad.pitch, DEFAULTS.pitch); assert.equal(bad.radius, 40); assert.equal(bad.height, 4); assert.equal(bad.speed, DEFAULTS.speed);
assert.equal(bad.density, 3); assert.equal(bad.seed, 12); assert.equal(bad.preset, "meadow"); assert.equal(bad.maxBlooms, DEFAULTS.maxBlooms);
assert.equal(normalize(null).pitch, DEFAULTS.pitch);
const st = normalizeStyle({ card: "red", petals: ["#123456", "nope"], heads: ["rose", "tulip"] });
assert.equal(st.card, "#f7f1e3"); assert.deepEqual(st.petals, ["#123456"]); assert.deepEqual(st.heads, ["tulip"]);
// no network inside the drop-in engine
const src = readFileSync(new URL("../vendor/seedbed/engine.js", import.meta.url), "utf8");
assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|<script[^>]+src=["']https?:/.test(src), "engine makes no network calls");
console.log("seedbed engine: all life-cycle tests pass");
