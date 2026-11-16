export type Head = "cosmos" | "daisy" | "tulip" | "spike";
export type Style = { label: string; card: string; dot: string; stem: string; leaf: string; petals: string[]; center: string; heads: Head[]; line: boolean; glow: number };
export type PresetKey = "meadow" | "night" | "tulip" | "lavender" | "ink";
export type Options = {
  preset: PresetKey; custom: Style | null; night: boolean; pitch: number; radius: number; height: number; speed: number;
  wiltDelay: number; density: number; seed: number; maxBlooms: number; ghost: boolean;
};
export type Garden = { set(o: Partial<Options>): void; sweep(): void; clear(): void; destroy(): void; readonly activeCount: number };
export const PRESETS: Record<PresetKey, Style>;
export const HEADS: Head[];
export const DEFAULTS: Options;
export function normalize(o: unknown): Options;
export function normalizeStyle(s: unknown): Style;
export function resolveStyle(o: Options): Style;
export function targetFor(d: number, radius: number): number;
export function stepDot(d: { g: number; t: number; near: number; jit: number }, now: number, dt: number, o: Options): number;
export function createGarden(el: HTMLElement, o?: Partial<Options>): Garden;
