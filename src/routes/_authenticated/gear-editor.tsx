import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addGearItem,
  editCounts,
  listCategories,
  listGearEntries,
  listGroups,
  overrideCount,
  removeGearEntry,
  resetGearNames,
  saveGearNames,
  type GearEntry,
} from "@/lib/gear-names";
import {
  clearGearNamesInCloud,
  fetchGearNamesFromCloud,
  pushCustomItemToCloud,
  pushGearNamesToCloud,
  pushRemovalToCloud,
} from "@/lib/gear-names-remote";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { SlateStripes } from "@/components/checklist/SlateStripes";


export const Route = createFileRoute("/_authenticated/gear-editor")({
  head: () => ({
    meta: [
      { title: "Gear name editor — Camera Gear Checklist" },
      {
        name: "description",
        content:
          "Owner-only editor for renaming any camera, lens, filter or accessory in the shared gear catalogue.",
      },
      { property: "og:title", content: "Gear name editor — Camera Gear Checklist" },
      {
        property: "og:description",
        content: "Rename gear catalogue entries used by the camera department checklist.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GearEditor,
});

const KIND_LABEL: Record<GearEntry["kind"], string> = {
  item: "Item",
  family: "Family",
  variant: "Variant",
};

function GearEditor() {
  const navigate = useNavigate();
  const { session, isAdmin, adminExists, loading, claimAdmin } = useAdmin();
  const [version, setVersion] = useState(0);
  const entries = useMemo(() => listGearEntries(), [version]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newName, setNewName] = useState("");

  const allCats = useMemo(() => listCategories(), [version]);
  const groupOptions = useMemo(() => (newCat ? listGroups(newCat) : []), [newCat, version]);
  const counts = useMemo(() => editCounts(), [version]);

  const addItem = async () => {
    const created = addGearItem(newCat, newName, newGroup || null);
    if (!created) {
      setStatus("Pick a category and a name that is not already in the list.");
      return;
    }
    setNewName("");
    setVersion((v) => v + 1);
    try {
      await pushCustomItemToCloud(created);
      setStatus(`Added “${created.name}” to ${created.cat} for everyone.`);
    } catch {
      setStatus("Added locally, but the shared copy could not be updated.");
    }
  };

  const removeEntry = async (entry: GearEntry) => {
    if (!confirm(`Remove “${entry.current}” from ${entry.cat}?`)) return;
    const res = removeGearEntry(entry.key);
    setDrafts((d) => {
      const next = { ...d };
      delete next[entry.key];
      return next;
    });
    setVersion((v) => v + 1);
    try {
      await pushRemovalToCloud(entry.key, entry.cat, res.deletedCustom ? "deletedCustom" : "hidden");
      setStatus(`Removed “${entry.current}” for everyone.`);
    } catch {
      setStatus("Removed locally, but the shared copy could not be updated.");
    }
  };


  useEffect(() => {
    fetchGearNamesFromCloud()
      .then(() => setVersion((v) => v + 1))
      .catch(() => setStatus("Could not load the shared names."));
  }, []);

  const cats = useMemo(
    () => ["All", ...Array.from(new Set(entries.map((e) => e.cat)))],
    [entries],
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (cat !== "All" && e.cat !== cat) return false;
      if (!query) return true;
      return (
        e.current.toLowerCase().includes(query) ||
        e.original.toLowerCase().includes(query) ||
        (e.parent ?? "").toLowerCase().includes(query)
      );
    });
  }, [entries, q, cat]);

  const shown = filtered.slice(0, 400);
  const dirty = Object.keys(drafts).length;

  const save = async () => {
    const { upserted, removed } = saveGearNames(drafts);
    setDrafts({});
    setVersion((v) => v + 1);
    try {
      await pushGearNamesToCloud(upserted, removed);
      setStatus("Saved for everyone.");
    } catch {
      setStatus("Saved locally, but the shared copy could not be updated.");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-[520px] px-4 py-16">
        <SlateStripes />
        <h1 className="mt-5 text-2xl text-foreground">Owner access only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {session?.user.email ?? "unknown"}. This account is not the catalogue
          owner, so gear names are read-only here.
        </p>
        {adminExists === false && (
          <button
            type="button"
            onClick={async () => {
              const ok = await claimAdmin();
              setStatus(ok ? "You are now the owner." : "An owner already exists.");
            }}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Claim owner access
          </button>
        )}
        {status && <p className="mt-3 text-sm text-muted-foreground">{status}</p>}
        <div className="mt-6 flex gap-3 text-sm">
          <Link to="/" className="text-muted-foreground underline-offset-4 hover:underline">
            ← Back to checklist
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="text-muted-foreground underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pb-32">
      <header className="pt-8">
        <SlateStripes />
        <p className="slate-label mt-5">Catalogue · Names</p>
        <h1 className="mt-1 text-[clamp(1.75rem,5vw,2.75rem)] leading-[0.95] text-foreground">
          Gear name editor
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Rename any entry in the gear catalogue. Changes are shared with everyone using the
          checklist — {overrideCount()} custom name(s) active.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground transition-colors hover:bg-card"
          >
            ← Back to checklist
          </Link>
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Reset every name back to the original catalogue?")) return;
              resetGearNames();
              setDrafts({});
              setVersion((v) => v + 1);
              try {
                await clearGearNamesInCloud();
                setStatus("All names reset.");
              } catch {
                setStatus("Reset locally, but the shared copy could not be updated.");
              }
            }}
            className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset all names
          </button>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign out
          </button>
        </div>
        {status && <p className="mt-3 text-xs text-muted-foreground">{status}</p>}
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="flex-1 rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70"
          placeholder="Search gear…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground sm:w-56"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {filtered.length} match(es)
        {filtered.length > shown.length ? ` — showing first ${shown.length}, refine the search` : ""}
      </p>

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {shown.map((e) => {
          const value = drafts[e.key] ?? e.current;
          const changed = value !== e.current;
          return (
            <div key={e.key} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 shrink-0 flex-col sm:w-56">
                <span className="slate-label truncate">{e.cat}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {KIND_LABEL[e.kind]}
                  {e.parent ? ` · ${e.parent}` : e.group ? ` · ${e.group}` : ""}
                </span>
              </div>
              <input
                className={`min-w-0 flex-1 rounded-md border bg-elevated px-3 py-2 text-sm text-foreground ${
                  changed ? "border-primary" : "border-border"
                }`}
                value={value}
                onChange={(ev) => setDrafts((d) => ({ ...d, [e.key]: ev.target.value }))}
              />
              {e.current !== e.original && (
                <span
                  className="shrink-0 text-[11px] text-muted-foreground"
                  title={`Original: ${e.original}`}
                >
                  renamed
                </span>
              )}
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>
        )}
      </div>

      {dirty > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-elevated/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{dirty} unsaved change(s)</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDrafts({})}
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Save names
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
