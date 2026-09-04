import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addGearCategory,
  addGearFamily,
  addGearItem,
  addGearVariant,
  editCounts,
  listCategories,
  listGearEntries,
  listGroups,
  moveGearEntry,
  overrideCount,
  removeGearEntry,
  resetGearNames,
  saveGearNames,
  type GearEntry,
} from "@/lib/gear-names";
import {
  clearGearNamesInCloud,
  fetchGearNamesFromCloud,
  pushCategoryToCloud,
  pushCustomItemToCloud,
  pushFamilyToCloud,
  pushGearNamesToCloud,
  pushMoveToCloud,
  pushRemovalToCloud,
  pushVariantToCloud,
} from "@/lib/gear-names-remote";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { SlateStripes } from "@/components/checklist/SlateStripes";


export const Route = createFileRoute("/_authenticated/gear-editor")({
  head: () => ({
    meta: [
      { title: "Gear catalogue editor — Camera Gear Checklist" },
      {
        name: "description",
        content:
          "Owner-only editor for categories, lens sets and every camera, lens, filter or accessory in the shared gear catalogue.",
      },
      { property: "og:title", content: "Gear catalogue editor — Camera Gear Checklist" },
      {
        property: "og:description",
        content:
          "Create categories and lens sets, add gear by hand and move entries in the shared camera department catalogue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GearEditor,
});

const KIND_LABEL: Record<GearEntry["kind"], string> = {
  item: "Item",
  family: "Set",
  variant: "Lens / variant",
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

  const [newCategory, setNewCategory] = useState("");

  const [newCat, setNewCat] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newName, setNewName] = useState("");

  const [famCat, setFamCat] = useState("");
  const [setGroup, setSetGroup] = useState("");
  const [setLabel, setSetLabel] = useState("");
  const [setInfo, setSetInfo] = useState("");
  const [setWhole, setSetWhole] = useState("");

  /** family key currently showing its "add lens" field */
  const [openSet, setOpenSet] = useState<string | null>(null);
  const [lensDraft, setLensDraft] = useState("");

  const allCats = useMemo(() => listCategories(), [version]);
  const groupOptions = useMemo(() => (newCat ? listGroups(newCat) : []), [newCat, version]);
  const setGroupOptions = useMemo(() => (famCat ? listGroups(famCat) : []), [famCat, version]);
  const counts = useMemo(() => editCounts(), [version]);
  const families = useMemo(
    () => entries.filter((e) => e.kind === "family"),
    [entries],
  );

  const addCategory = async () => {
    const created = addGearCategory(newCategory);
    if (!created) {
      setStatus("Give the category a name that is not already in the list.");
      return;
    }
    setNewCategory("");
    setVersion((v) => v + 1);
    try {
      await pushCategoryToCloud(created);
      setStatus(`Category “${created}” created for everyone.`);
    } catch {
      setStatus("Created locally, but the shared copy could not be updated.");
    }
  };

  const addSet = async () => {
    const created = addGearFamily({
      cat: famCat,
      group: setGroup || null,
      label: setLabel,
      info: setInfo || null,
      wholeSetSpec: setWhole || null,
    });
    if (!created) {
      setStatus("Pick a category and a set name that is not already in the list.");
      return;
    }
    setSetLabel("");
    setSetInfo("");
    setSetWhole("");
    setOpenSet(created.key);
    setVersion((v) => v + 1);
    try {
      await pushFamilyToCloud(created);
      setStatus(`Set “${created.label}” created — now add its lenses below.`);
    } catch {
      setStatus("Created locally, but the shared copy could not be updated.");
    }
  };

  const addLens = async (family: GearEntry, name: string) => {
    const created = addGearVariant(family.key, name);
    if (!created) {
      setStatus("Type a lens spec that is not already in this set.");
      return;
    }
    setLensDraft("");
    setVersion((v) => v + 1);
    try {
      await pushVariantToCloud(created, family.cat);
      setStatus(`Added “${created.name}” to ${family.current}.`);
    } catch {
      setStatus("Added locally, but the shared copy could not be updated.");
    }
  };

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

  const move = async (
    entry: GearEntry,
    target: { cat?: string; group?: string | null; parent?: string | null },
  ) => {
    const next = moveGearEntry(entry.key, {
      cat: target.cat ?? entry.cat,
      group: target.group !== undefined ? target.group : entry.group,
      parent: target.parent !== undefined ? target.parent : (entry.parentKey ?? null),
    });
    setVersion((v) => v + 1);
    try {
      await pushMoveToCloud(entry.key, next);
      setStatus(`Moved “${entry.current}”.`);
    } catch {
      setStatus("Moved locally, but the shared copy could not be updated.");
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
      await pushRemovalToCloud(
        entry.key,
        entry.cat,
        res.deletedCustom ? "deletedCustom" : "hidden",
        res.alsoDeleted,
      );
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

  const cats = useMemo(() => ["All", ...allCats], [allCats]);

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

  const inputCls =
    "min-w-0 rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70";
  const selectCls = "rounded-md border border-border bg-elevated px-2 py-1.5 text-xs text-foreground";

  return (
    <div className="mx-auto w-full max-w-[1040px] px-4 pb-32">
      <header className="pt-8">
        <SlateStripes />
        <p className="slate-label mt-5">Catalogue · Editor</p>
        <h1 className="mt-1 text-[clamp(1.75rem,5vw,2.75rem)] leading-[0.95] text-foreground">
          Gear catalogue editor
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Create categories and sets, add gear by hand, rename, move or remove entries. Everything
          is shared with everyone using the checklist — {overrideCount()} renamed, {counts.added}{" "}
          added, {counts.sets} set(s), {counts.moved} moved, {counts.removed} removed.
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
              if (!confirm("Reset the catalogue: undo every rename, addition, move and removal?"))
                return;
              resetGearNames();
              setDrafts({});
              setVersion((v) => v + 1);
              try {
                await clearGearNamesInCloud();
                setStatus("Catalogue reset.");
              } catch {
                setStatus("Reset locally, but the shared copy could not be updated.");
              }
            }}
            className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset catalogue
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

      <section className="mt-6 rounded-lg border border-border bg-card p-3">
        <p className="slate-label">New category</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className={`${inputCls} flex-1`}
            placeholder="Category name…"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addCategory();
            }}
          />
          <button
            type="button"
            onClick={() => void addCategory()}
            disabled={!newCategory.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Create category
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card p-3">
        <p className="slate-label">New set (lens set, filter set…)</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select
            className={`${inputCls}`}
            value={famCat}
            onChange={(e) => {
              setFamCat(e.target.value);
              setSetGroup("");
            }}
          >
            <option value="">Category…</option>
            {allCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            list="set-group-options"
            placeholder="Sub-group, e.g. Prime · ARRI"
            value={setGroup}
            onChange={(e) => setSetGroup(e.target.value)}
            disabled={!famCat}
          />
          <datalist id="set-group-options">
            {setGroupOptions.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <input
            className={inputCls}
            placeholder="Set name, e.g. ARRI Signature Prime II"
            value={setLabel}
            onChange={(e) => setSetLabel(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Mount / info, e.g. LPL Mount"
            value={setInfo}
            onChange={(e) => setSetInfo(e.target.value)}
          />
          <input
            className={`${inputCls} sm:col-span-2`}
            placeholder="Whole Set text, e.g. Set · LPL Mount (12 lenses)"
            value={setWhole}
            onChange={(e) => setSetWhole(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => void addSet()}
          disabled={!famCat || !setLabel.trim()}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          Create set
        </button>
        <p className="mt-2 text-xs text-muted-foreground">
          After creating a set, open it in the list below and type each lens by hand. A set only
          shows up in the checklist once it has at least one lens.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-card p-3">
        <p className="slate-label">Add a single item</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select
            className={`${inputCls} sm:w-52`}
            value={newCat}
            onChange={(e) => {
              setNewCat(e.target.value);
              setNewGroup("");
            }}
          >
            <option value="">Category…</option>
            {allCats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className={`${inputCls} sm:w-52`}
            list="item-group-options"
            placeholder="Sub-group (optional)"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            disabled={!newCat}
          />
          <datalist id="item-group-options">
            {groupOptions.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <input
            className={`${inputCls} flex-1`}
            placeholder="New item name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addItem();
            }}
          />
          <button
            type="button"
            onClick={() => void addItem()}
            disabled={!newCat || !newName.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </section>


      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          className={`${inputCls} flex-1`}
          placeholder="Search gear…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={`${inputCls} sm:w-56`}
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
          const isOpen = openSet === e.key;
          return (
            <div key={e.key} className="px-3 py-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 shrink-0 flex-col sm:w-52">
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
                {e.custom && <span className="shrink-0 text-[11px] text-primary">added</span>}
                {e.kind === "family" && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenSet(isOpen ? null : e.key);
                      setLensDraft("");
                    }}
                    className="shrink-0 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {isOpen ? "Close" : "Add lens"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void removeEntry(e)}
                  title="Remove from catalogue"
                  className="shrink-0 rounded-md border border-border px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  Remove
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 sm:pl-52">
                <span className="text-[11px] text-muted-foreground">Move to</span>
                {e.kind === "variant" ? (
                  <select
                    className={selectCls}
                    value={e.parentKey ?? ""}
                    onChange={(ev) => void move(e, { parent: ev.target.value })}
                  >
                    {families.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.cat} · {f.current}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <select
                      className={selectCls}
                      value={e.cat}
                      onChange={(ev) => void move(e, { cat: ev.target.value, group: null })}
                    >
                      {allCats.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      className={selectCls}
                      value={e.group ?? ""}
                      onChange={(ev) => void move(e, { group: ev.target.value || null })}
                    >
                      <option value="">No sub-group</option>
                      {listGroups(e.cat).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {e.kind === "family" && isOpen && (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:pl-52">
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="New lens, e.g. 35mm T2.0 · CF 0.50m · Ø114"
                    value={lensDraft}
                    onChange={(ev) => setLensDraft(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") void addLens(e, lensDraft);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void addLens(e, lensDraft)}
                    disabled={!lensDraft.trim()}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    Add lens
                  </button>
                </div>
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
          <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-3">
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
