import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { catColor, extractMm, mmSortKey, uid } from "@/data/gear";
import type { Family } from "@/data/gear";
import { useChecklist, type Item, type Status } from "@/lib/checklist-store";
import { CategoryCard } from "@/components/checklist/CategoryCard";
import { ProjectCard } from "@/components/checklist/ProjectCard";
import { SetupScreen } from "@/components/checklist/SetupScreen";
import { SlateStripes } from "@/components/checklist/SlateStripes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Camera Gear Checklist — Production Prep Slate" },
      {
        name: "description",
        content:
          "Build a camera department gear list per project: track what you have, what you're looking for, and what's still to be confirmed.",
      },
      { property: "og:title", content: "Camera Gear Checklist — Production Prep Slate" },
      {
        property: "og:description",
        content:
          "Per-project camera gear checklist with prep, shoot and return dates, crew contacts and printable PDF export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FILTERS = [
  { key: "all", label: "All" },
  { key: "have", label: "✓ Have" },
  { key: "looking", label: "◎ Looking for" },
  { key: "tbc", label: "▷ To be confirmed" },
  { key: "none", label: "– Unmarked" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

function Index() {
  const { state, mutate, reset } = useChecklist();
  const [filter, setFilter] = useState<Filter>("all");
  const [newCatName, setNewCatName] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [printPrivate, setPrintPrivate] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2200);
  }, []);

  if (state.view === "setup") {
    return (
      <SetupScreen
        state={state}
        mutate={mutate}
        onContinue={() => {
          console.log("onContinue called");
          mutate((d) => {
            d.view = "checklist";
          });
        }}
      />
    );
  }

  const matchesFilter = (it: Item) => {
    if (filter === "have" && it.status !== "have") return false;
    if (filter === "looking" && it.status !== "looking") return false;
    if (filter === "tbc" && it.status !== "tbc") return false;
    if (filter === "none" && it.status !== null) return false;
    return true;
  };

  let tHave = 0;
  let tLook = 0;
  let tTbc = 0;
  let tAll = 0;
  state.categories.forEach((cat) => {
    tHave += cat.items.filter((i) => i.status === "have").length;
    tLook += cat.items.filter((i) => i.status === "looking").length;
    tTbc += cat.items.filter((i) => i.status === "tbc").length;
    tAll += cat.items.length;
  });
  const pct = (n: number) => (tAll ? `${(n / tAll) * 100}%` : "0%");

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    mutate((d) => {
      d.categories.push({ id: uid(), name, collapsed: false, items: [] });
    });
    setNewCatName("");
    toast("Category added");
  };

  const addItem = (catId: string, name: string, qty: number, group?: string | null) => {
    const clean = name.trim();
    if (!clean) return;
    let message = "";
    mutate((d) => {
      const cat = d.categories.find((c) => c.id === catId);
      if (!cat) return;
      const existing = cat.items.find((x) => x.name.toLowerCase() === clean.toLowerCase());
      if (existing) {
        existing.qty += Math.max(1, qty || 1);
        message = `Quantity increased to ${existing.qty} ×`;
      } else {
        cat.items.push({
          id: uid(),
          name: clean,
          qty: Math.max(1, qty || 1),
          status: null,
          group: group ?? null,
        });
      }
    });
    if (message) toast(message);
  };

  const addFamily = (catId: string, family: Family, selectedIdx: number[], qty: number) => {
    // The picker opens with already-added focal lengths pre-checked, so whatever
    // is checked now is the row's full intended content.
    const newMm = selectedIdx
      .map((i) => extractMm(family.variants[i]!))
      .sort((a, b) => mmSortKey(a) - mmSortKey(b));
    let prevCount = 0;
    let existed = false;
    mutate((d) => {
      const cat = d.categories.find((c) => c.id === catId);
      if (!cat) return;
      const idx = cat.items.findIndex((x) => x.familyKey === family.label);
      const row = idx >= 0 ? cat.items[idx] : undefined;
      existed = !!row;
      prevCount = row ? (row.mmList?.length ?? 0) : 0;
      if (newMm.length === 0) {
        if (row) cat.items.splice(idx, 1);
        return;
      }
      if (row) {
        row.mmList = newMm;
        row.name = `${family.label} ${newMm.join(", ")}`;
      } else {
        cat.items.push({
          id: uid(),
          name: `${family.label} ${newMm.join(", ")}`,
          qty,
          status: null,
          group: family.group ?? null,
          familyKey: family.label,
          mmList: newMm,
        });
      }
    });
    if (newMm.length === 0 && !existed) return;
    const diff = newMm.length - prevCount;
    if (newMm.length === 0) toast("Removed from list");
    else if (diff > 0) toast(diff === 1 ? "Added 1 focal length" : `Added ${diff} focal lengths`);
    else if (diff < 0)
      toast(
        Math.abs(diff) === 1 ? "Removed 1 focal length" : `Removed ${Math.abs(diff)} focal lengths`,
      );
    else toast("No changes");
  };

  const handlePrint = () => {
    const hasPrivate = state.categories.some((c) =>
      c.items.some((i) => i.details?.privateNotes?.trim()),
    );
    const includePrivate = hasPrivate
      ? confirm("Include Private Notes in the PDF?\n\nOK = include · Cancel = leave them out")
      : false;
    setPrintPrivate(includePrivate);
    const hadCollapsed = state.project.collapsed || state.categories.some((c) => c.collapsed);
    if (hadCollapsed) {
      const collapsedIds = state.categories.filter((c) => c.collapsed).map((c) => c.id);
      const projectWasCollapsed = state.project.collapsed;
      mutate((d) => {
        d.project.collapsed = false;
        d.categories.forEach((c) => {
          c.collapsed = false;
        });
      });
      setTimeout(() => {
        window.print();
        mutate((d) => {
          d.project.collapsed = projectWasCollapsed;
          d.categories.forEach((c) => {
            if (collapsedIds.includes(c.id)) c.collapsed = true;
          });
        });
      }, 80);
    } else {
      setTimeout(() => window.print(), 30);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pb-28">
      <header className="pt-8">
        <SlateStripes />
        <p className="slate-label mt-5">Camera Department · Prep Slate</p>
        <h1 className="mt-1 text-[clamp(2rem,6.5vw,3.25rem)] leading-[0.92] text-foreground">
          Camera gear checklist
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Track what you own and what you're still looking for — saved automatically in this
          browser.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: tHave, label: "Have", cls: "text-have" },
            { n: tLook, label: "Looking for", cls: "text-look" },
            { n: tTbc, label: "To be confirmed", cls: "text-tbc" },
            { n: tAll, label: "Total items", cls: "text-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
              <div className={`font-mono text-2xl leading-none ${s.cls}`}>{s.n}</div>
              <div className="slate-label mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
          <div className="bg-have transition-all" style={{ width: pct(tHave) }} />
          <div className="bg-look transition-all" style={{ width: pct(tLook) }} />
          <div className="bg-tbc transition-all" style={{ width: pct(tTbc) }} />
        </div>
      </header>

      <div className="mt-6">
        <ProjectCard
          project={state.project}
          onToggle={() =>
            mutate((d) => {
              d.project.collapsed = !d.project.collapsed;
            })
          }
          onEdit={() =>
            mutate((d) => {
              d.view = "setup";
            })
          }
        />
      </div>

      <div className="no-print mt-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handlePrint}
          title="Print or save a clean PDF of the finished checklist"
          className="ml-auto rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          🖨 Export PDF
        </button>
        <button
          type="button"
          title="Clear everything and start a blank checklist"
          onClick={() => {
            if (
              confirm(
                "Start fresh? This clears every category, item, and the project info panel from this browser. This can't be undone.",
              )
            ) {
              reset();
              toast("Started fresh");
            }
          }}
          className="rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          🗑 Start fresh
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {state.categories.map((cat, catIndex) => {
          const visible = cat.items.filter(matchesFilter);
          if (filter !== "all" && visible.length === 0) return null;
          return (
            <CategoryCard
              key={cat.id}
              cat={cat}
              color={catColor(catIndex, cat.name)}
              visible={visible}
              collapsed={cat.collapsed && filter === "all"}
              showAddRow={filter === "all"}
              printPrivateNotes={printPrivate}
              contacts={state.project.contacts.filter((c) => c.name.trim() || c.role.trim())}
              onAssign={(itemId, contactId) =>
                mutate((d) => {
                  const t = d.categories
                    .find((c) => c.id === cat.id)
                    ?.items.find((i) => i.id === itemId);
                  if (t) t.assigneeId = contactId;
                })
              }
              onDetails={(itemId, patch) =>
                mutate((d) => {
                  const t = d.categories
                    .find((c) => c.id === cat.id)
                    ?.items.find((i) => i.id === itemId);
                  if (t) t.details = { ...(t.details ?? {}), ...patch };
                })
              }
              onLetterIndex={(itemId, letter) =>
                mutate((d) => {
                  const t = d.categories
                    .find((c) => c.id === cat.id)
                    ?.items.find((i) => i.id === itemId);
                  if (t) t.letterIndex = letter;
                })
              }
              onToggle={() =>
                mutate((d) => {
                  const t = d.categories.find((c) => c.id === cat.id);
                  if (t) t.collapsed = !t.collapsed;
                })
              }
              onDelete={() => {
                if (confirm(`Delete category "${cat.name}" and all its items?`)) {
                  mutate((d) => {
                    d.categories = d.categories.filter((c) => c.id !== cat.id);
                  });
                  toast("Category deleted");
                }
              }}
              onQty={(itemId, delta) =>
                mutate((d) => {
                  const t = d.categories
                    .find((c) => c.id === cat.id)
                    ?.items.find((i) => i.id === itemId);
                  if (t && (delta > 0 || t.qty > 1)) t.qty += delta;
                })
              }
              onStatus={(itemId, status: Exclude<Status, null>) =>
                mutate((d) => {
                  const t = d.categories
                    .find((c) => c.id === cat.id)
                    ?.items.find((i) => i.id === itemId);
                  if (t) t.status = t.status === status ? null : status;
                })
              }
              onRemoveItem={(itemId) =>
                mutate((d) => {
                  const t = d.categories.find((c) => c.id === cat.id);
                  if (t) t.items = t.items.filter((i) => i.id !== itemId);
                })
              }
              onAdd={(name, qty, group) => addItem(cat.id, name, qty, group)}
              onAddFamily={(family, idx, qty) => addFamily(cat.id, family, idx, qty)}
            />
          );
        })}
      </div>

      <div className="no-print mt-5 flex flex-wrap gap-2">
        <input
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addCategory();
          }}
          placeholder="New category name…"
          className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={addCategory}
          className="rounded-md bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground"
        >
          + Add category
        </button>
      </div>

      {toastMsg && (
        <div className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-popover px-4 py-2.5 text-sm text-foreground shadow-lift">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
