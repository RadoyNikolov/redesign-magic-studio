import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  listGearEntries,
  overrideCount,
  resetGearNames,
  saveGearNames,
  type GearEntry,
} from "@/lib/gear-names";
import { SlateStripes } from "@/components/checklist/SlateStripes";

export const Route = createFileRoute("/gear-editor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gear name editor — Camera Gear Checklist" },
      {
        name: "description",
        content:
          "Rename any camera, lens, filter or accessory in the gear catalogue directly in the browser — no file downloads needed.",
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
  const [version, setVersion] = useState(0);
  const entries = useMemo(() => listGearEntries(), [version]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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

  const save = () => {
    saveGearNames(drafts);
    setDrafts({});
    setVersion((v) => v + 1);
  };

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pb-32">
      <header className="pt-8">
        <SlateStripes />
        <p className="slate-label mt-5">Catalogue · Names</p>
        <h1 className="mt-1 text-[clamp(1.75rem,5vw,2.75rem)] leading-[0.95] text-foreground">
          Gear name editor
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Rename any entry in the gear catalogue. Changes are saved in this browser and used
          everywhere in the checklist — {overrideCount()} custom name(s) active.
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
            onClick={() => {
              if (confirm("Reset every name back to the original catalogue?")) {
                resetGearNames();
                setDrafts({});
                setVersion((v) => v + 1);
              }
            }}
            className="rounded-md border border-border bg-elevated px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset all names
          </button>
        </div>
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
                onChange={(ev) =>
                  setDrafts((d) => ({ ...d, [e.key]: ev.target.value }))
                }
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
