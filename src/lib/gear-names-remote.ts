// Shared (cloud) gear catalogue overrides. Everyone reads them so the whole site
// shows the same catalogue; only an admin can write (enforced by row-level security).
import { supabase } from "@/integrations/supabase/client";
import { setGearCatalogEdits, setGearNameOverrides, type CustomItem } from "@/lib/gear-names";

export async function fetchGearNamesFromCloud() {
  const [names, edits] = await Promise.all([
    supabase.from("gear_name_overrides").select("key, name"),
    supabase.from("gear_catalog_edits").select("key, kind, cat, group, name"),
  ]);
  if (names.error) throw names.error;
  if (edits.error) throw edits.error;

  const custom: CustomItem[] = [];
  const hidden: string[] = [];
  for (const row of edits.data ?? []) {
    if (row.kind === "custom") {
      custom.push({ key: row.key, cat: row.cat, group: row.group ?? null, name: row.name ?? "" });
    } else {
      hidden.push(row.key);
    }
  }
  setGearCatalogEdits(custom, hidden);

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
    updated_at: new Date().toISOString(),
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
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Share a removal with everyone: built-in entries get hidden, custom ones deleted. */
export async function pushRemovalToCloud(
  key: string,
  cat: string,
  mode: "hidden" | "deletedCustom",
) {
  if (mode === "deletedCustom") {
    const { error } = await supabase.from("gear_catalog_edits").delete().eq("key", key);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("gear_catalog_edits").upsert({
    key,
    kind: "hidden",
    cat,
    group: null,
    name: null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function clearGearNamesInCloud() {
  const { error } = await supabase.from("gear_name_overrides").delete().neq("key", "");
  if (error) throw error;
  const { error: e2 } = await supabase.from("gear_catalog_edits").delete().neq("key", "");
  if (e2) throw e2;
}
