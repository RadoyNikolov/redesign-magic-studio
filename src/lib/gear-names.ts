// Editable gear catalogue overrides.
// The gear catalogue lives in src/data/gear.ts. Instead of editing that file,
// renames, additions and removals are stored as overrides (localStorage cache +
// shared cloud copy) and re-applied to the in-memory SUGGESTIONS / FAMILIES
// arrays, so every screen shows the edited catalogue.
import { FAMILIES, SUGGESTIONS } from "@/data/gear";
import type { Family, Suggestion } from "@/data/gear";

const STORAGE_KEY = "gearNameOverrides_v1";
const EDITS_KEY = "gearCatalogEdits_v1";

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
  /** true for entries added through the editor */
  custom?: boolean;
};

export type CustomItem = { key: string; cat: string; group: string | null; name: string };

type Overrides = Record<string, string>;
type Edits = { custom: CustomItem[]; hidden: string[] };

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

const readOverrides = (): Overrides => readJson<Overrides>(STORAGE_KEY, {});
const writeOverrides = (map: Overrides) => writeJson(STORAGE_KEY, map);
const readEdits = (): Edits => {
  const e = readJson<Partial<Edits>>(EDITS_KEY, {});
  return { custom: Array.isArray(e.custom) ? e.custom : [], hidden: Array.isArray(e.hidden) ? e.hidden : [] };
};
const writeEdits = (e: Edits) => writeJson(EDITS_KEY, e);

/** Pristine catalogue snapshot, captured before any override is applied. */
const baseItems: Suggestion[] = SUGGESTIONS.map((s) => ({ ...s }));
const baseFamilies: Family[] = FAMILIES.map((f) => ({ ...f, variants: [...f.variants] }));

export const itemKey = (cat: string, original: string) => `i|${cat}|${original}`;
export const familyKey = (cat: string, original: string) => `f|${cat}|${original}`;
export const variantKey = (cat: string, familyOriginal: string, original: string) =>
  `v|${cat}|${familyOriginal}|${original}`;
export const customKey = (cat: string, name: string) => `c|${cat}|${name}`;

/** Rebuild the in-memory catalogue arrays from the snapshot + stored edits. */
export function applyGearNameOverrides() {
  const map = readOverrides();
  const { custom, hidden } = readEdits();
  const hiddenSet = new Set(hidden);

  SUGGESTIONS.length = 0;
  baseItems.forEach((s) => {
    const key = itemKey(s.cat, s.name);
    if (hiddenSet.has(key)) return;
    SUGGESTIONS.push({ ...s, name: map[key] || s.name });
  });
  custom.forEach((c) => {
    if (hiddenSet.has(c.key)) return;
    SUGGESTIONS.push({
      name: map[c.key] || c.name,
      qty: 1,
      cat: c.cat,
      group: c.group,
    } as Suggestion);
  });

  FAMILIES.length = 0;
  baseFamilies.forEach((f) => {
    const key = familyKey(f.cat, f.label);
    if (hiddenSet.has(key)) return;
    const variants = f.variants
      .filter((v) => !hiddenSet.has(variantKey(f.cat, f.label, v)))
      .map((v) => map[variantKey(f.cat, f.label, v)] || v);
    if (variants.length === 0) return;
    FAMILIES.push({ ...f, label: map[key] || f.label, variants });
  });
}

applyGearNameOverrides();

/** Flat, editable view of every name in the catalogue. */
export function listGearEntries(): GearEntry[] {
  const map = readOverrides();
  const { custom, hidden } = readEdits();
  const hiddenSet = new Set(hidden);
  const out: GearEntry[] = [];
  baseItems.forEach((s) => {
    const key = itemKey(s.cat, s.name);
    if (hiddenSet.has(key)) return;
    out.push({
      key,
      cat: s.cat,
      group: s.group,
      kind: "item",
      original: s.name,
      current: map[key] || s.name,
    });
  });
  custom.forEach((c) => {
    if (hiddenSet.has(c.key)) return;
    out.push({
      key: c.key,
      cat: c.cat,
      group: c.group,
      kind: "item",
      original: c.name,
      current: map[c.key] || c.name,
      custom: true,
    });
  });
  baseFamilies.forEach((f) => {
    const key = familyKey(f.cat, f.label);
    if (hiddenSet.has(key)) return;
    out.push({
      key,
      cat: f.cat,
      group: f.group ?? null,
      kind: "family",
      original: f.label,
      current: map[key] || f.label,
    });
    f.variants.forEach((v) => {
      const vk = variantKey(f.cat, f.label, v);
      if (hiddenSet.has(vk)) return;
      out.push({
        key: vk,
        cat: f.cat,
        group: f.group ?? null,
        kind: "variant",
        original: v,
        current: map[vk] || v,
        parent: map[key] || f.label,
      });
    });
  });
  return out;
}

/** Every category name present in the catalogue. */
export function listCategories(): string[] {
  return Array.from(
    new Set([...baseItems.map((s) => s.cat), ...baseFamilies.map((f) => f.cat)]),
  ).sort((a, b) => a.localeCompare(b));
}

/** Groups (sub-sections) known for a category. */
export function listGroups(cat: string): string[] {
  const set = new Set<string>();
  baseItems.forEach((s) => s.cat === cat && s.group && set.add(s.group));
  baseFamilies.forEach((f) => f.cat === cat && f.group && set.add(f.group));
  readEdits().custom.forEach((c) => c.cat === cat && c.group && set.add(c.group));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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

/** Add a brand-new item to a category. Returns the created record, or null if it exists. */
export function addGearItem(cat: string, name: string, group: string | null): CustomItem | null {
  const trimmed = name.trim();
  if (!cat || !trimmed) return null;
  const edits = readEdits();
  const key = customKey(cat, trimmed);
  const exists =
    edits.custom.some((c) => c.key === key) ||
    listGearEntries().some((e) => e.cat === cat && e.current.toLowerCase() === trimmed.toLowerCase());
  if (exists) return null;
  const record: CustomItem = { key, cat, group: group?.trim() || null, name: trimmed };
  edits.custom.push(record);
  edits.hidden = edits.hidden.filter((k) => k !== key);
  writeEdits(edits);
  applyGearNameOverrides();
  return record;
}

/**
 * Remove an entry from the catalogue. Custom entries are deleted outright,
 * built-in entries are hidden.
 */
export function removeGearEntry(key: string): { hidden: string | null; deletedCustom: string | null } {
  const edits = readEdits();
  const isCustom = edits.custom.some((c) => c.key === key);
  if (isCustom) {
    edits.custom = edits.custom.filter((c) => c.key !== key);
    writeEdits(edits);
    applyGearNameOverrides();
    return { hidden: null, deletedCustom: key };
  }
  if (!edits.hidden.includes(key)) edits.hidden.push(key);
  writeEdits(edits);
  applyGearNameOverrides();
  return { hidden: key, deletedCustom: null };
}

export function resetGearNames() {
  writeOverrides({});
  writeEdits({ custom: [], hidden: [] });
  applyGearNameOverrides();
}

/** Replace the whole local cache with the shared (cloud) name map. */
export function setGearNameOverrides(map: Record<string, string>) {
  writeOverrides(map);
  applyGearNameOverrides();
}

/** Replace the whole local cache with the shared (cloud) add/remove edits. */
export function setGearCatalogEdits(custom: CustomItem[], hidden: string[]) {
  writeEdits({ custom, hidden });
  applyGearNameOverrides();
}

export function overrideCount() {
  return Object.keys(readOverrides()).length;
}

export function editCounts() {
  const { custom, hidden } = readEdits();
  return { added: custom.length, removed: hidden.length };
}
