// Shared (cloud) gear catalogue overrides. Everyone reads them so the whole site
// shows the same catalogue; only an admin can write (enforced by row-level security).
import { supabase } from "@/integrations/supabase/client";
import {
  setGearCatalogEdits,
  setGearNameOverrides,
  type CustomFamily,
  type CustomItem,
  type CustomVariant,
  type MoveTarget,
} from "@/lib/gear-names";

const now = () => new Date().toISOString();
export const categoryRowKey = (name: string) => `cat|${name}`;
const moveRowKey = (key: string) => `mv|${key}`;

export async function fetchGearNamesFromCloud() {
  const [names, edits] = await Promise.all([
    supabase.from("gear_name_overrides").select("key, name"),
    supabase
      .from("gear_catalog_edits")
      .select("key, kind, cat, group, name, info, whole_set_spec, parent"),
  ]);
  if (names.error) throw names.error;
  if (edits.error) throw edits.error;

  const custom: CustomItem[] = [];
  const hidden: string[] = [];
  const categories: string[] = [];
  const families: CustomFamily[] = [];
  const variants: CustomVariant[] = [];
  const moves: Record<string, MoveTarget> = {};

  for (const row of edits.data ?? []) {
    switch (row.kind) {
      case "custom":
        custom.push({ key: row.key, cat: row.cat, group: row.group ?? null, name: row.name ?? "" });
        break;
      case "customCategory":
        if (row.cat) categories.push(row.cat);
        break;
      case "customFamily":
        families.push({
          key: row.key,
          cat: row.cat,
          group: row.group ?? null,
          label: row.name ?? "",
          info: row.info ?? null,
          wholeSetSpec: row.whole_set_spec ?? null,
        });
        break;
      case "customVariant":
        variants.push({ key: row.key, parentKey: row.parent ?? "", name: row.name ?? "" });
        break;
      case "move":
        moves[row.parent && row.name === "__parent__" ? row.key : row.key] = {
          cat: row.cat,
          group: row.group ?? null,
          parent: row.kind === "move" ? (row.info ?? null) : null,
        };
        break;
      default:
        hidden.push(row.key);
    }
  }
  setGearCatalogEdits({ custom, hidden, categories, families, variants, moves });

  const map: Record<string, string> = {};
  for (const row of names.data ?? []) map[row.key] = row.name;
  setGearNameOverrides(map);
  return map;
}

export async function pushGearNamesToCloud(
  upserted: Record<string, string>,
  removed: string[],
) {
  const rows = Object.entries(upserted).map(([key, name]) => ({
    key,
    name,
    updated_at: now(),
  }));
  if (rows.length) {
    const { error } = await supabase.from("gear_name_overrides").upsert(rows);
    if (error) throw error;
  }
  if (removed.length) {
    const { error } = await supabase.from("gear_name_overrides").delete().in("key", removed);
    if (error) throw error;
  }
}

/** Share a newly added catalogue item with everyone. */
export async function pushCustomItemToCloud(item: CustomItem) {
  const { error } = await supabase.from("gear_catalog_edits").upsert({
    key: item.key,
    kind: "custom",
    cat: item.cat,
    group: item.group,
    name: item.name,
    updated_at: now(),
  });
  if (error) throw error;
}

/** Share a brand-new category with everyone. */
export async function pushCategoryToCloud(name: string) {
  const { error } = await supabase.from("gear_catalog_edits").upsert({
    key: categoryRowKey(name),
    kind: "customCategory",
    cat: name,
    group: null,
    name,
    updated_at: now(),
  });
  if (error) throw error;
}

/** Share a newly created set (family) with everyone. */
export async function pushFamilyToCloud(family: CustomFamily) {
  const { error } = await supabase.from("gear_catalog_edits").upsert({
    key: family.key,
    kind: "customFamily",
    cat: family.cat,
    group: family.group,
    name: family.label,
    info: family.info,
    whole_set_spec: family.wholeSetSpec,
    updated_at: now(),
  });
  if (error) throw error;
}

/** Share a hand-typed lens inside a set with everyone. */
export async function pushVariantToCloud(variant: CustomVariant, cat: string) {
  const { error } = await supabase.from("gear_catalog_edits").upsert({
    key: variant.key,
    kind: "customVariant",
    cat,
    group: null,
    name: variant.name,
    parent: variant.parentKey,
    updated_at: now(),
  });
  if (error) throw error;
}

/** Share a move (new category / sub-group / parent set) with everyone. */
export async function pushMoveToCloud(key: string, target: MoveTarget) {
  const { error } = await supabase.from("gear_catalog_edits").upsert({
    key: moveRowKey(key),
    kind: "move",
    cat: target.cat,
    group: target.group,
    name: key,
    info: target.parent,
    parent: key,
    updated_at: now(),
  });
  if (error) throw error;
}

/** Share a removal with everyone: built-in entries get hidden, custom ones deleted. */
export async function pushRemovalToCloud(
  key: string,
  cat: string,
  mode: "hidden" | "deletedCustom",
  alsoDeleted: string[] = [],
) {
  const keys = [key, ...alsoDeleted];
  if (mode === "deletedCustom") {
    const { error } = await supabase.from("gear_catalog_edits").delete().in("key", keys);
    if (error) throw error;
    const { error: e2 } = await supabase
      .from("gear_catalog_edits")
      .delete()
      .in("key", keys.map(moveRowKey));
    if (e2) throw e2;
    return;
  }
  const { error } = await supabase.from("gear_catalog_edits").upsert({
    key,
    kind: "hidden",
    cat,
    group: null,
    name: null,
    updated_at: now(),
  });
  if (error) throw error;
}

export async function clearGearNamesInCloud() {
  const { error } = await supabase.from("gear_name_overrides").delete().neq("key", "");
  if (error) throw error;
  const { error: e2 } = await supabase.from("gear_catalog_edits").delete().neq("key", "");
  if (e2) throw e2;
}
