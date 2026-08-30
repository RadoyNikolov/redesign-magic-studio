// Editable gear-name overrides.
// The gear catalogue lives in src/data/gear.ts. Instead of editing that file,
// renames are stored as overrides in localStorage and applied to the in-memory
// SUGGESTIONS / FAMILIES arrays on app start, so every screen shows the new name.
import { FAMILIES, SUGGESTIONS } from "@/data/gear";

const STORAGE_KEY = "gearNameOverrides_v1";

export type GearEntry = {
  /** stable key of the entry — never changes when renamed */
  key: string;
  cat: string;
  group: string | null;
  kind: "item" | "family" | "variant";
  /** name from the catalogue file */
  original: string;
  /** current (possibly renamed) name */
  current: string;
  /** parent family label, for variants */
  parent?: string;
};

type Overrides = Record<string, string>;

function readOverrides(): Overrides {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Overrides) : {};
  } catch {
    return {};
  }
}

function writeOverrides(map: Overrides) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

/** Original catalogue names, captured before any override is applied. */
const originals = {
  items: SUGGESTIONS.map((s) => s.name),
  families: FAMILIES.map((f) => f.label),
  variants: FAMILIES.map((f) => [...f.variants]),
};

export const itemKey = (cat: string, original: string) => `i|${cat}|${original}`;
export const familyKey = (cat: string, original: string) => `f|${cat}|${original}`;
export const variantKey = (cat: string, familyOriginal: string, original: string) =>
  `v|${cat}|${familyOriginal}|${original}`;

let applied = false;

/** Apply the stored overrides to the in-memory catalogue arrays. */
export function applyGearNameOverrides() {
  const map = readOverrides();
  SUGGESTIONS.forEach((s, i) => {
    const orig = originals.items[i]!;
    s.name = map[itemKey(s.cat, orig)] || orig;
  });
  FAMILIES.forEach((f, i) => {
    const origLabel = originals.families[i]!;
    f.label = map[familyKey(f.cat, origLabel)] || origLabel;
    const origVariants = originals.variants[i]!;
    f.variants = origVariants.map((v) => map[variantKey(f.cat, origLabel, v)] || v);
  });
  applied = true;
}

if (!applied) applyGearNameOverrides();

/** Flat, editable view of every name in the catalogue. */
export function listGearEntries(): GearEntry[] {
  const map = readOverrides();
  const out: GearEntry[] = [];
  SUGGESTIONS.forEach((s, i) => {
    const original = originals.items[i]!;
    const key = itemKey(s.cat, original);
    out.push({
      key,
      cat: s.cat,
      group: s.group,
      kind: "item",
      original,
      current: map[key] || original,
    });
  });
  FAMILIES.forEach((f, i) => {
    const original = originals.families[i]!;
    const key = familyKey(f.cat, original);
    out.push({
      key,
      cat: f.cat,
      group: f.group ?? null,
      kind: "family",
      original,
      current: map[key] || original,
    });
    originals.variants[i]!.forEach((v) => {
      const vk = variantKey(f.cat, original, v);
      out.push({
        key: vk,
        cat: f.cat,
        group: f.group ?? null,
        kind: "variant",
        original: v,
        current: map[vk] || v,
        parent: map[key] || original,
      });
    });
  });
  return out;
}

/** Save a batch of renames locally. Empty / unchanged values clear the override. */
export function saveGearNames(changes: Record<string, string>) {
  const map = readOverrides();
  const byKey = new Map(listGearEntries().map((e) => [e.key, e]));
  const removed: string[] = [];
  const upserted: Record<string, string> = {};
  for (const [key, value] of Object.entries(changes)) {
    const entry = byKey.get(key);
    const next = value.trim();
    if (!entry || !next || next === entry.original) {
      delete map[key];
      removed.push(key);
    } else {
      map[key] = next;
      upserted[key] = next;
    }
  }
  writeOverrides(map);
  applyGearNameOverrides();
  return { upserted, removed };
}

export function resetGearNames() {
  writeOverrides({});
  applyGearNameOverrides();
}

/** Replace the whole local cache with the shared (cloud) name map. */
export function setGearNameOverrides(map: Record<string, string>) {
  writeOverrides(map);
  applyGearNameOverrides();
}

export function overrideCount() {
  return Object.keys(readOverrides()).length;

}
