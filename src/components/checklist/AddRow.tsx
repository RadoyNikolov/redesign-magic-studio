import { useMemo, useRef, useState } from "react";
import { FAMILIES, SUGGESTIONS, extractMm } from "@/data/gear";
import type { Family } from "@/data/gear";
import type { Category, Item } from "@/lib/checklist-store";

type Flat = { name: string; qty: number; cat: string; group: string | null };

type Props = {
  cat: Category;
  onAdd: (name: string, group?: string | null) => void;
  onAddFamily: (family: Family, selectedIdx: number[]) => void;
};

type Mode = "closed" | "search" | "browseCats" | "browseItems" | "picker";

function getCategoryGroups(catName: string) {
  const groups = new Map<string, { flats: Flat[]; families: Family[] }>();
  SUGGESTIONS.forEach((s) => {
    if (s.cat !== catName || !s.group) return;
    if (!groups.has(s.group)) groups.set(s.group, { flats: [], families: [] });
    groups.get(s.group)!.flats.push(s);
  });
  FAMILIES.forEach((f) => {
    if (f.cat !== catName || !f.group) return;
    if (!groups.has(f.group)) groups.set(f.group, { flats: [], families: [] });
    groups.get(f.group)!.families.push(f);
  });
  return groups;
}

function getAllCategoryItems(catName: string) {
  const families = FAMILIES.filter((f) => f.cat === catName).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  const flats = SUGGESTIONS.filter((s) => s.cat === catName).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return { families, flats };
}

const panelCls =
  "absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[340px] overflow-y-auto rounded-lg border border-border bg-popover shadow-lift";
const rowCls =
  "flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent";
const chevronCls =
  "ml-auto shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-primary";

export function AddRow({ cat, onAdd, onAddFamily }: Props) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("closed");
  const [sel, setSel] = useState(-1);
  const [family, setFamily] = useState<Family | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [pickerFilter, setPickerFilter] = useState("");
  const [browseGroup, setBrowseGroup] = useState<string | null>(null);
  const [browsePath, setBrowsePath] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [] as ({ kind: "family"; family: Family } | { kind: "flat"; item: Flat })[];
    const fams = (FAMILIES as Family[])
      .filter((f) => f.cat === cat.name && f.label.toLowerCase().includes(query))
      .map((f) => ({ kind: "family" as const, family: f }));
    const flats = (SUGGESTIONS as Flat[])
      .filter((s) => s.cat === cat.name && s.name.toLowerCase().includes(query))
      .map((s) => ({ kind: "flat" as const, item: s }));
    return [...fams, ...flats].slice(0, 20);
  }, [q, cat.name]);

  const closeAll = () => {
    setMode("closed");
    setFamily(null);
    setChecked(new Set());
    setPickerFilter("");
    setBrowseGroup(null);
    setBrowsePath([]);
    setSel(-1);
  };

  const openPicker = (f: Family) => {
    setFamily(f);
    // Pre-check whichever focal lengths this family already contributes to the
    // category, so the picker reflects the row's current content.
    const existing = cat.items.find((x) => x.familyKey === f.label);
    const next = new Set<number>();
    if (existing?.mmList) {
      f.variants.forEach((v, i) => {
        if (existing.mmList?.includes(extractMm(v))) next.add(i);
      });
    }
    setChecked(next);
    setPickerFilter("");
    setMode("picker");
  };

  const addFlat = (name: string, group?: string | null) => {
    onAdd(name, group ?? null);
    setQ("");
    closeAll();
    inputRef.current?.focus();
  };

  const commitPicker = () => {
    if (!family) return;
    const hadExisting = cat.items.some((x) => x.familyKey === family.label);
    if (checked.size === 0 && !hadExisting) {
      closeAll();
      return;
    }
    onAddFamily(family, [...checked]);
    setQ("");
    closeAll();
    inputRef.current?.focus();
  };

  const stop = (e: React.MouseEvent) => e.preventDefault();

  const browseOpen = () => {
    if (mode !== "closed") {
      closeAll();
      return;
    }
    setQ("");
    setBrowseGroup(null);
    setBrowsePath([]);
    const groups = getCategoryGroups(cat.name);
    setMode(groups.size > 0 ? "browseCats" : "browseItems");
    inputRef.current?.focus();
  };

  const SEP = " · ";
  const groups = getCategoryGroups(cat.name);
  const groupNamesAll = [...groups.keys()];
  /** Sub-sections directly under the current browse path, alphabetical. */
  const childSegments = (path: string[]) => {
    const prefix = path.length ? path.join(SEP) + SEP : "";
    const out = new Set<string>();
    groupNamesAll.forEach((name) => {
      if (path.length && !name.startsWith(prefix)) return;
      const rest = name.slice(prefix.length);
      if (!rest) return;
      out.add(rest.split(SEP)[0]!);
    });
    return [...out].sort((a, b) => a.localeCompare(b));
  };
  /** Items reachable at or below the given group path. */
  const collectAt = (path: string[]) => {
    const full = path.join(SEP);
    const flats: Flat[] = [];
    const families: Family[] = [];
    groupNamesAll.forEach((name) => {
      if (name !== full && !name.startsWith(full + SEP)) return;
      const g = groups.get(name)!;
      flats.push(...g.flats);
      families.push(...g.families);
    });
    return { flats, families };
  };

  const browseList = (() => {
    if (mode !== "browseItems") return null;
    if (browseGroup) {
      const path = browseGroup.split(SEP);
      const g = collectAt(path);
      return {
        title: path.join(SEP),
        families: [...g.families].sort((a, b) => a.label.localeCompare(b.label)),
        flats: [...g.flats].sort((a, b) => a.name.localeCompare(b.name)),
        back: () => {
          setBrowseGroup(null);
          setBrowsePath(path.slice(0, -1));
          setMode("browseCats");
        },
      };
    }
    const all = getAllCategoryItems(cat.name);
    return { title: `${cat.name} — browse`, ...all, back: null };
  })();

  const [browseFilter, setBrowseFilter] = useState("");

  return (
    <div className="no-print mt-2 flex items-center gap-2 border-t border-border/60 pt-3">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={q}
          placeholder={`Type to add to ${cat.name}…`}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(-1);
            if (e.target.value.trim()) {
              setBrowseGroup(null);
              setFamily(null);
              setMode("search");
            } else if (mode === "search") {
              setMode("closed");
            }
          }}
          onKeyDown={(e) => {
            if (mode === "picker" || mode === "browseCats" || mode === "browseItems") {
              if (e.key === "Escape") {
                e.preventDefault();
                closeAll();
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (results.length) setSel((s) => (s + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (results.length) setSel((s) => (s - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              const res = sel >= 0 ? results[sel] : undefined;
              if (res) {
                if (res.kind === "family") openPicker(res.family);
                else addFlat(res.item.name, res.item.group);
              } else if (q.trim()) {
                addFlat(q);
              }
            } else if (e.key === "Escape") {
              closeAll();
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              if (panelRef.current?.contains(document.activeElement)) return;
              closeAll();
            }, 150);
          }}
          className="w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
        />

        {mode !== "closed" && (
          <div ref={panelRef} className={panelCls}>
            {mode === "search" &&
              (results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-muted-foreground">
                  No matches — press Enter to add it as a custom item.
                </p>
              ) : (
                results.map((res, i) =>
                  res.kind === "family" ? (
                    <button
                      key={`f${res.family.label}`}
                      type="button"
                      onMouseDown={(e) => {
                        stop(e);
                        openPicker(res.family);
                      }}
                      className={`${rowCls} ${i === sel ? "bg-accent" : ""}`}
                    >
                      <span>{res.family.label}</span>
                      <span className={chevronCls}>
                        {res.family.variants.length}{" "}
                        {res.family.variants.length === 1 ? "option ›" : "options ›"}
                      </span>
                    </button>
                  ) : (
                    <button
                      key={`s${res.item.name}`}
                      type="button"
                      onMouseDown={(e) => {
                        stop(e);
                        addFlat(res.item.name, res.item.group);
                      }}
                      className={`${rowCls} ${i === sel ? "bg-accent" : ""}`}
                    >
                      <span>
                        {res.item.qty > 1 ? `${res.item.qty} × ` : ""}
                        {res.item.name}
                      </span>
                    </button>
                  ),
                )
              ))}

            {mode === "browseCats" && (
              <>
                <div className="sticky top-0 border-b border-border bg-popover px-3 py-2">
                  <div className="flex items-center gap-2">
                    {browsePath.length > 0 && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          stop(e);
                          setBrowsePath(browsePath.slice(0, -1));
                        }}
                        className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ←
                      </button>
                    )}
                    <span className="slate-label">
                      {browsePath.length ? browsePath.join(SEP) : `${cat.name} — browse`}
                    </span>
                  </div>
                </div>
                {(() => {
                  const seen = new Set<string>();
                  const recent = cat.items.filter((it: Item) => {
                    if (!it.name || seen.has(it.name)) return false;
                    seen.add(it.name);
                    return true;
                  });
                  if (recent.length === 0) return null;
                  return (
                    <div className="border-b border-border/60">
                      <div className="px-3 pb-1 pt-2">
                        <span className="slate-label">Already added</span>
                      </div>
                      {recent.map((it: Item) => {
                        const src = (SUGGESTIONS as Flat[]).find((s) => s.name === it.name);
                        return (
                          <button
                            key={`recent-${it.name}`}
                            type="button"
                            onMouseDown={(e) => {
                              stop(e);
                              addFlat(it.name, src?.group ?? null);
                            }}
                            className={rowCls}
                          >
                            <span>{it.name}</span>
                            <span className={chevronCls}>+ again</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
                {childSegments(browsePath).map((seg) => {
                  const path = [...browsePath, seg];
                  const hasChildren = childSegments(path).length > 0;
                  const g = collectAt(path);
                  const count = g.flats.length + g.families.length;
                  return (
                    <button
                      key={path.join(SEP)}
                      type="button"
                      onMouseDown={(e) => {
                        stop(e);
                        setBrowseFilter("");
                        if (hasChildren) {
                          setBrowsePath(path);
                        } else {
                          setBrowseGroup(path.join(SEP));
                          setMode("browseItems");
                        }
                      }}
                      className={rowCls}
                    >
                      <span>{seg}</span>
                      <span className={chevronCls}>
                        {hasChildren
                          ? `${childSegments(path).length} brands ›`
                          : `${count} ${count === 1 ? "item ›" : "items ›"}`}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {mode === "browseItems" && browseList && (
              <>
                <div className="sticky top-0 border-b border-border bg-popover px-3 py-2">
                  <div className="flex items-center gap-2">
                    {browseList.back && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          stop(e);
                          browseList.back?.();
                        }}
                        className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ←
                      </button>
                    )}
                    <span className="slate-label">{browseList.title}</span>
                  </div>
                  {browseList.families.length + browseList.flats.length > 8 && (
                    <input
                      value={browseFilter}
                      onChange={(e) => setBrowseFilter(e.target.value)}
                      placeholder={`Filter ${browseList.title}…`}
                      className="mt-2 w-full rounded-md border border-border bg-elevated px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  )}
                </div>
                {(() => {
                  const f = browseFilter.trim().toLowerCase();
                  const fams = browseList.families.filter(
                    (x) => !f || x.label.toLowerCase().includes(f),
                  );
                  const flats = browseList.flats.filter(
                    (x) => !f || x.name.toLowerCase().includes(f),
                  );
                  if (fams.length + flats.length === 0)
                    return <p className="px-3 py-3 text-sm text-muted-foreground">No matches.</p>;
                  return (
                    <>
                      {fams.map((x) => (
                        <button
                          key={`bf${x.label}`}
                          type="button"
                          onMouseDown={(e) => {
                            stop(e);
                            openPicker(x);
                          }}
                          className={rowCls}
                        >
                          <span>{x.label}</span>
                          <span className={chevronCls}>
                            {x.variants.length} {x.variants.length === 1 ? "option ›" : "options ›"}
                          </span>
                        </button>
                      ))}
                      {flats.map((x) => (
                        <button
                          key={`bs${x.name}`}
                          type="button"
                          onMouseDown={(e) => {
                            stop(e);
                            addFlat(x.name, x.group);
                          }}
                          className={rowCls}
                        >
                          <span>
                            {x.qty > 1 ? `${x.qty} × ` : ""}
                            {x.name}
                          </span>
                        </button>
                      ))}
                    </>
                  );
                })()}
              </>
            )}

            {mode === "picker" && family && (
              <>
                <div className="sticky top-0 border-b border-border bg-popover px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        stop(e);
                        setFamily(null);
                        setChecked(new Set());
                        setPickerFilter("");
                        setMode(q.trim() ? "search" : "closed");
                      }}
                      className="rounded border border-border px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ←
                    </button>
                    <span className="font-display text-xs uppercase tracking-[0.08em] text-foreground">
                      {family.label}
                    </span>
                  </div>
                  {family.info && (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {family.info}
                    </p>
                  )}
                  {family.variants.length > 8 && (
                    <input
                      value={pickerFilter}
                      onChange={(e) => setPickerFilter(e.target.value)}
                      placeholder={`Filter ${family.label}…`}
                      className="mt-2 w-full rounded-md border border-border bg-elevated px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  )}
                </div>

                {family.wholeSetSpec &&
                  (() => {
                    const allOn =
                      family.variants.length > 0 && checked.size === family.variants.length;
                    return (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          stop(e);
                          setChecked(
                            allOn ? new Set<number>() : new Set(family.variants.map((_, i) => i)),
                          );
                        }}
                        className={`${rowCls} border-b border-border/60`}
                      >
                        <span
                          className={`grid size-4 shrink-0 place-items-center rounded-sm border text-[10px] ${
                            allOn
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {allOn ? "✓" : ""}
                        </span>
                        <span className="font-semibold">
                          Whole Set — {family.wholeSetSpec.replace(/^Set\s*·?\s*/, "")}
                        </span>
                      </button>
                    );
                  })()}

                {family.variants.map((v, i) => {
                  const f = pickerFilter.trim().toLowerCase();
                  if (f && !v.toLowerCase().includes(f)) return null;
                  const on = checked.has(i);
                  return (
                    <button
                      key={v + i}
                      type="button"
                      onMouseDown={(e) => {
                        stop(e);
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        });
                      }}
                      className={rowCls}
                    >
                      <span
                        className={`grid size-4 shrink-0 place-items-center rounded-sm border text-[10px] ${
                          on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span>{v}</span>
                    </button>
                  );
                })}

                <div className="sticky bottom-0 border-t border-border bg-popover p-2">
                  {(() => {
                    const n = checked.size;
                    return (
                      <button
                        type="button"
                        disabled={n === 0}
                        onMouseDown={(e) => {
                          stop(e);
                          commitPicker();
                        }}
                        className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                      >
                        {n > 0 ? `Add ${n} selected` : "Select items to add"}
                      </button>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        title={`Browse ${cat.name}`}
        onMouseDown={(e) => {
          e.preventDefault();
          browseOpen();
        }}
        className="rounded-md border border-border bg-elevated px-2.5 py-2 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        ☰
      </button>
      <button
        type="button"
        onClick={() => q.trim() && addFlat(q)}
        className="rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
      >
        + Add
      </button>
    </div>
  );
}
