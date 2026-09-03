// Editable gear catalogue overrides.
// The gear catalogue lives in src/data/gear.ts. Instead of editing that file,
// renames, additions, removals and moves are stored as overrides (localStorage
// cache + shared cloud copy) and re-applied to the in-memory SUGGESTIONS /
// FAMILIES / GEAR structures, so every screen shows the edited catalogue.
import { FAMILIES, GEAR, SUGGESTIONS } from "@/data/gear";
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
  /** parent family key, for variants */
  parentKey?: string;
  /** true for entries added through the editor */
  custom?: boolean;
};

export type CustomItem = { key: string; cat: string; group: string | null; name: string };
export type CustomFamily = {
  key: string;
  cat: string;
  group: string | null;
  label: string;
  info: string | null;
  wholeSetSpec: string | null;
};
export type CustomVariant = { key: string; parentKey: string; name: string };
export type MoveTarget = { cat: string; group: string | null; parent: string | null };

type Overrides = Record<string, string>;
type Edits = {
  custom: CustomItem[];
  hidden: string[];
  categories: string[];
  families: CustomFamily[];
  variants: CustomVariant[];
  moves: Record<string, MoveTarget>;
};

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
  return {
    custom: Array.isArray(e.custom) ? e.custom : [],
    hidden: Array.isArray(e.hidden) ? e.hidden : [],
    categories: Array.isArray(e.categories) ? e.categories : [],
    families: Array.isArray(e.families) ? e.families : [],
    variants: Array.isArray(e.variants) ? e.variants : [],
    moves: e.moves && typeof e.moves === "object" ? e.moves : {},
  };
};
const writeEdits = (e: Edits) => writeJson(EDITS_KEY, e);

/** Pristine catalogue snapshot, captured before any override is applied. */
const baseItems: Suggestion[] = SUGGESTIONS.map((s) => ({ ...s }));
const baseFamilies: Family[] = FAMILIES.map((f) => ({ ...f, variants: [...f.variants] }));
const baseCategories: string[] = Object.keys(GEAR);

export const itemKey = (cat: string, original: string) => `i|${cat}|${original}`;
export const familyKey = (cat: string, original: string) => `f|${cat}|${original}`;
export const variantKey = (cat: string, familyOriginal: string, original: string) =>
  `v|${cat}|${familyOriginal}|${original}`;
export const customKey = (cat: string, name: string) => `c|${cat}|${name}`;
export const customFamilyKey = (cat: string, label: string) => `cf|${cat}|${label}`;
export const customVariantKey = (parentKey: string, name: string) => `cv|${parentKey}|${name}`;

type FamilyDraft = {
  key: string;
  cat: string;
  group: string | null;
  label: string;
  info: string | null;
  wholeSetSpec: string | null;
  /** [variant key, original variant name] */
  variants: [string, string][];
  custom: boolean;
};

/** Family records (built-in + custom) with moves applied, before renaming. */
function buildFamilyDrafts(edits: Edits): FamilyDraft[] {
  const { families, variants, moves, hidden } = edits;
  const hiddenSet = new Set(hidden);
  const drafts: FamilyDraft[] = [];

  baseFamilies.forEach((f) => {
    const key = familyKey(f.cat, f.label);
    if (hiddenSet.has(key)) return;
    const move = moves[key];
    drafts.push({
      key,
      cat: move?.cat ?? f.cat,
      group: move ? move.group : (f.group ?? null),
      label: f.label,
      info: f.info,
      wholeSetSpec: f.wholeSetSpec,
      variants: f.variants
        .map((v) => [variantKey(f.cat, f.label, v), v] as [string, string])
        .filter(([vk]) => !hiddenSet.has(vk) && !moves[vk]?.parent),
      custom: false,
    });
  });

  families.forEach((cf) => {
    if (hiddenSet.has(cf.key)) return;
    const move = moves[cf.key];
    drafts.push({
      key: cf.key,
      cat: move?.cat ?? cf.cat,
      group: move ? move.group : cf.group,
      label: cf.label,
      info: cf.info,
      wholeSetSpec: cf.wholeSetSpec,
      variants: [],
      custom: true,
    });
  });

  const byKey = new Map(drafts.map((d) => [d.key, d]));

  // custom variants land in their parent family unless moved elsewhere
  variants.forEach((cv) => {
    if (hiddenSet.has(cv.key)) return;
    const parentKey = moves[cv.key]?.parent ?? cv.parentKey;
    byKey.get(parentKey)?.variants.push([cv.key, cv.name]);
  });

  // built-in variants explicitly moved into another family
  baseFamilies.forEach((f) => {
    f.variants.forEach((v) => {
      const vk = variantKey(f.cat, f.label, v);
      if (hiddenSet.has(vk)) return;
      const target = moves[vk]?.parent;
      if (target) byKey.get(target)?.variants.push([vk, v]);
    });
  });

  return drafts;
}

/** Rebuild the in-memory catalogue arrays from the snapshot + stored edits. */
export function applyGearNameOverrides() {
  const map = readOverrides();
  const edits = readEdits();
  const hiddenSet = new Set(edits.hidden);

  SUGGESTIONS.length = 0;
  baseItems.forEach((s) => {
    const key = itemKey(s.cat, s.name);
    if (hiddenSet.has(key)) return;
    const move = edits.moves[key];
    SUGGESTIONS.push({
      ...s,
      cat: move?.cat ?? s.cat,
      group: move ? move.group : s.group,
      name: map[key] || s.name,
    });
  });
  edits.custom.forEach((c) => {
    if (hiddenSet.has(c.key)) return;
    const move = edits.moves[c.key];
    SUGGESTIONS.push({
      name: map[c.key] || c.name,
      qty: 1,
      cat: move?.cat ?? c.cat,
      group: move ? move.group : c.group,
    } as Suggestion);
  });

  FAMILIES.length = 0;
  buildFamilyDrafts(edits).forEach((d) => {
    if (d.variants.length === 0) return;
    FAMILIES.push({
      cat: d.cat,
      label: map[d.key] || d.label,
      info: d.info,
      wholeSetSpec: d.wholeSetSpec,
      group: d.group,
      variants: d.variants.map(([vk, original]) => map[vk] || original),
    });
  });

  // register categories created through the editor so every screen knows them
  const cats = new Set<string>(edits.categories);
  Object.values(edits.moves).forEach((m) => m.cat && cats.add(m.cat));
  const gear = GEAR as Record<string, [string, number, string?][]>;
  Object.keys(gear).forEach((k) => {
    if (!baseCategories.includes(k) && !cats.has(k)) delete gear[k];
  });
  cats.forEach((c) => {
    if (!gear[c]) gear[c] = [];
  });
}

applyGearNameOverrides();

/** Flat, editable view of every name in the catalogue. */
export function listGearEntries(): GearEntry[] {
  const map = readOverrides();
  const edits = readEdits();
  const hiddenSet = new Set(edits.hidden);
  const out: GearEntry[] = [];

  baseItems.forEach((s) => {
    const key = itemKey(s.cat, s.name);
    if (hiddenSet.has(key)) return;
    const move = edits.moves[key];
    out.push({
      key,
      cat: move?.cat ?? s.cat,
      group: move ? move.group : s.group,
      kind: "item",
      original: s.name,
      current: map[key] || s.name,
    });
  });
  edits.custom.forEach((c) => {
    if (hiddenSet.has(c.key)) return;
    const move = edits.moves[c.key];
    out.push({
      key: c.key,
      cat: move?.cat ?? c.cat,
      group: move ? move.group : c.group,
      kind: "item",
      original: c.name,
      current: map[c.key] || c.name,
      custom: true,
    });
  });

  buildFamilyDrafts(edits).forEach((d) => {
    const label = map[d.key] || d.label;
    out.push({
      key: d.key,
      cat: d.cat,
      group: d.group,
      kind: "family",
      original: d.label,
      current: label,
      custom: d.custom,
    });
    d.variants.forEach(([vk, original]) => {
      out.push({
        key: vk,
        cat: d.cat,
        group: d.group,
        kind: "variant",
        original,
        current: map[vk] || original,
        parent: label,
        parentKey: d.key,
        custom: vk.startsWith("cv|"),
      });
    });
  });
  return out;
}

/** Every category name present in the catalogue. */
export function listCategories(): string[] {
  const edits = readEdits();
  return Array.from(
    new Set([
      ...baseCategories,
      ...baseItems.map((s) => s.cat),
      ...baseFamilies.map((f) => f.cat),
      ...edits.categories,
      ...edits.custom.map((c) => c.cat),
      ...edits.families.map((f) => f.cat),
      ...Object.values(edits.moves).map((m) => m.cat),
    ].filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

/** Groups (sub-sections) known for a category. */
export function listGroups(cat: string): string[] {
  const edits = readEdits();
  const set = new Set<string>();
  baseItems.forEach((s) => s.cat === cat && s.group && set.add(s.group));
  baseFamilies.forEach((f) => f.cat === cat && f.group && set.add(f.group));
  edits.custom.forEach((c) => c.cat === cat && c.group && set.add(c.group));
  edits.families.forEach((f) => f.cat === cat && f.group && set.add(f.group));
  Object.values(edits.moves).forEach((m) => m.cat === cat && m.group && set.add(m.group));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Sets (families) available in a category — used when moving lenses around. */
export function listFamilies(cat?: string): GearEntry[] {
  return listGearEntries().filter((e) => e.kind === "family" && (!cat || e.cat === cat));
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

/** Add a brand-new category. Returns the trimmed name, or null when invalid. */
export function addGearCategory(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (listCategories().some((c) => c.toLowerCase() === trimmed.toLowerCase())) return null;
  const edits = readEdits();
  edits.categories.push(trimmed);
  writeEdits(edits);
  applyGearNameOverrides();
  return trimmed;
}

/** Add a brand-new item to a category. Returns the created record, or null if it exists. */
export function addGearItem(cat: string, name: string, group: string | null): CustomItem | null {
  const trimmed = name.trim();
  if (!cat || !trimmed) return null;
  const edits = readEdits();
  const key = customKey(cat, trimmed);
  const exists =
    edits.custom.some((c) => c.key === key) ||
    listGearEntries().some(
      (e) => e.cat === cat && e.kind === "item" && e.current.toLowerCase() === trimmed.toLowerCase(),
    );
  if (exists) return null;
  const record: CustomItem = { key, cat, group: group?.trim() || null, name: trimmed };
  edits.custom.push(record);
  edits.hidden = edits.hidden.filter((k) => k !== key);
  writeEdits(edits);
  applyGearNameOverrides();
  return record;
}

/** Create a new set (family) — e.g. a lens set inside Prime · <brand>. */
export function addGearFamily(input: {
  cat: string;
  group: string | null;
  label: string;
  info: string | null;
  wholeSetSpec: string | null;
}): CustomFamily | null {
  const cat = input.cat.trim();
  const label = input.label.trim();
  if (!cat || !label) return null;
  const edits = readEdits();
  const key = customFamilyKey(cat, label);
  const exists =
    edits.families.some((f) => f.key === key) ||
    listGearEntries().some(
      (e) => e.kind === "family" && e.cat === cat && e.current.toLowerCase() === label.toLowerCase(),
    );
  if (exists) return null;
  const record: CustomFamily = {
    key,
    cat,
    group: input.group?.trim() || null,
    label,
    info: input.info?.trim() || null,
    wholeSetSpec: input.wholeSetSpec?.trim() || null,
  };
  edits.families.push(record);
  edits.hidden = edits.hidden.filter((k) => k !== key);
  writeEdits(edits);
  applyGearNameOverrides();
  return record;
}

/** Add one lens (variant) to a set, typed by hand. */
export function addGearVariant(parentKey: string, name: string): CustomVariant | null {
  const trimmed = name.trim();
  if (!parentKey || !trimmed) return null;
  const edits = readEdits();
  const key = customVariantKey(parentKey, trimmed);
  const siblings = listGearEntries().filter((e) => e.kind === "variant" && e.parentKey === parentKey);
  if (
    edits.variants.some((v) => v.key === key) ||
    siblings.some((s) => s.current.toLowerCase() === trimmed.toLowerCase())
  )
    return null;
  const record: CustomVariant = { key, parentKey, name: trimmed };
  edits.variants.push(record);
  edits.hidden = edits.hidden.filter((k) => k !== key);
  writeEdits(edits);
  applyGearNameOverrides();
  return record;
}

/** Move an entry to another category / sub-group, or a lens to another set. */
export function moveGearEntry(key: string, target: MoveTarget): MoveTarget {
  const edits = readEdits();
  const normalised: MoveTarget = {
    cat: target.cat,
    group: target.group?.trim() || null,
    parent: target.parent || null,
  };
  edits.moves[key] = normalised;
  writeEdits(edits);
  applyGearNameOverrides();
  return normalised;
}

/**
 * Remove an entry from the catalogue. Custom entries are deleted outright,
 * built-in entries are hidden. Removing a set also drops its custom lenses.
 */
export function removeGearEntry(key: string): { hidden: string | null; deletedCustom: string | null; alsoDeleted: string[] } {
  const edits = readEdits();
  const alsoDeleted: string[] = [];
  const isCustomItem = edits.custom.some((c) => c.key === key);
  const isCustomFamily = edits.families.some((f) => f.key === key);
  const isCustomVariant = edits.variants.some((v) => v.key === key);

  if (isCustomFamily) {
    edits.families = edits.families.filter((f) => f.key !== key);
    edits.variants = edits.variants.filter((v) => {
      if (v.parentKey !== key) return true;
      alsoDeleted.push(v.key);
      return false;
    });
  }
  if (isCustomItem) edits.custom = edits.custom.filter((c) => c.key !== key);
  if (isCustomVariant) edits.variants = edits.variants.filter((v) => v.key !== key);

  if (isCustomItem || isCustomFamily || isCustomVariant) {
    delete edits.moves[key];
    writeEdits(edits);
    applyGearNameOverrides();
    return { hidden: null, deletedCustom: key, alsoDeleted };
  }

  if (!edits.hidden.includes(key)) edits.hidden.push(key);
  writeEdits(edits);
  applyGearNameOverrides();
  return { hidden: key, deletedCustom: null, alsoDeleted };
}

export function resetGearNames() {
  writeOverrides({});
  writeEdits({ custom: [], hidden: [], categories: [], families: [], variants: [], moves: {} });
  applyGearNameOverrides();
}

/** Replace the whole local cache with the shared (cloud) name map. */
export function setGearNameOverrides(map: Record<string, string>) {
  writeOverrides(map);
  applyGearNameOverrides();
}

/** Replace the whole local cache with the shared (cloud) add/remove/move edits. */
export function setGearCatalogEdits(next: Partial<Edits>) {
  writeEdits({
    custom: next.custom ?? [],
    hidden: next.hidden ?? [],
    categories: next.categories ?? [],
    families: next.families ?? [],
    variants: next.variants ?? [],
    moves: next.moves ?? {},
  });
  applyGearNameOverrides();
}

export function overrideCount() {
  return Object.keys(readOverrides()).length;
}

export function editCounts() {
  const e = readEdits();
  return {
    added: e.custom.length + e.families.length + e.variants.length,
    removed: e.hidden.length,
    categories: e.categories.length,
    sets: e.families.length,
    moved: Object.keys(e.moves).length,
  };
}
