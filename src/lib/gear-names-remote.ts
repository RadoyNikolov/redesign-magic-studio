// Shared (cloud) gear-name overrides. Everyone reads them so the whole site
// shows the same names; only an admin can write (enforced by row-level security).
import { supabase } from "@/integrations/supabase/client";
import { setGearNameOverrides } from "@/lib/gear-names";

export async function fetchGearNamesFromCloud() {
  const { data, error } = await supabase.from("gear_name_overrides").select("key, name");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.name;
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

export async function clearGearNamesInCloud() {
  const { error } = await supabase.from("gear_name_overrides").delete().neq("key", "");
  if (error) throw error;
}
