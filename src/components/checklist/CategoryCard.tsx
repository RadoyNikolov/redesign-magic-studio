import type { Category, Item, Status } from "@/lib/checklist-store";
import { AddRow } from "./AddRow";

type Props = {
  cat: Category;
  color: string;
  visible: Item[];
  showAddRow: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onQty: (itemId: string, delta: number) => void;
  onStatus: (itemId: string, status: Exclude<Status, null>) => void;
  onRemoveItem: (itemId: string) => void;
  onAdd: (name: string, qty: number, group?: string | null) => void;
  onAddFamily: (family: any, selectedIdx: number[], qty: number) => void;
};

const STATUS_META = [
  { key: "have" as const, label: "✓ Have", on: "border-have/60 bg-have/15 text-have" },
  { key: "looking" as const, label: "◎ Looking", on: "border-look/60 bg-look/15 text-look" },
  { key: "tbc" as const, label: "▷ TBC", on: "border-tbc/60 bg-tbc/15 text-tbc" },
];

const STATUS_ACCENT: Record<string, string> = {
  have: "border-l-have",
  looking: "border-l-look",
  tbc: "border-l-tbc",
};

export function CategoryCard({
  cat,
  color,
  visible,
  showAddRow,
  collapsed,
  onToggle,
  onDelete,
  onQty,
  onStatus,
  onRemoveItem,
  onAdd,
  onAddFamily,
}: Props) {
  const cHave = cat.items.filter((i) => i.status === "have").length;
  const cLook = cat.items.filter((i) => i.status === "looking").length;
  const cTbc = cat.items.filter((i) => i.status === "tbc").length;

  const grouped = new Map<string, Item[]>();
  const ungrouped: Item[] = [];
  visible.forEach((it) => {
    if (it.group) {
      if (!grouped.has(it.group)) grouped.set(it.group, []);
      grouped.get(it.group)!.push(it);
    } else ungrouped.push(it);
  });
  const groupNames = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  const renderItem = (it: Item) => (
    <div
      key={it.id}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 py-2 pl-3 transition-colors sm:flex-nowrap ${
        it.status ? STATUS_ACCENT[it.status] : "border-l-transparent"
      }`}
    >
      <span className="no-print flex shrink-0 items-center gap-1">
        <button
          type="button"
          title="Decrease quantity"
          disabled={it.qty <= 1}
          onClick={() => onQty(it.id, -1)}
          className="size-6 rounded border border-border text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          −
        </button>
        <span className="w-9 text-center font-mono text-xs text-foreground">
          {it.qty} ×
        </span>
        <button
          type="button"
          title="Increase quantity"
          onClick={() => onQty(it.id, 1)}
          className="size-6 rounded border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          +
        </button>
      </span>
      <span className="hidden shrink-0 font-mono text-xs print:inline">
        {it.qty} ×
      </span>
      <span className="min-w-0 flex-1 text-sm leading-snug text-foreground">
        {it.name}
      </span>
      <span className="no-print flex shrink-0 gap-1">
        {STATUS_META.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onStatus(it.id, s.key)}
            className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
              it.status === s.key
                ? s.on
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </span>
      <span className="hidden font-mono text-[10px] uppercase print:inline">
        {it.status === "have"
          ? "Have"
          : it.status === "looking"
            ? "Looking"
            : it.status === "tbc"
              ? "TBC"
              : "—"}
      </span>
      <button
        type="button"
        title="Remove item"
        onClick={() => onRemoveItem(it.id)}
        className="no-print shrink-0 rounded border border-transparent px-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
      >
        ✕
      </button>
    </div>
  );

  return (
    <section
      className="relative rounded-xl border border-border bg-card shadow-panel"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-elevated"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className={`shrink-0 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`}
          aria-hidden
        >
          <path
            d="M3 5l4 4 4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="text-sm tracking-[0.08em] text-foreground">{cat.name}</h2>
        <span className="ml-auto flex items-center gap-2 font-mono text-[11px]">
          <span className="text-have">{cHave}✓</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-look">{cLook}◎</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-tbc">{cTbc}▷</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="text-muted-foreground">{cat.items.length}</span>
        </span>
        <button
          type="button"
          title="Delete category"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="no-print rounded border border-transparent px-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          ✕
        </button>
      </div>

      {!collapsed && (
        <div className="border-t border-border px-4 pb-3 pt-1">
          {cat.items.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">
              Empty — start typing below and pick from the suggestions.
            </p>
          )}

          {groupNames.map((g) => (
            <div key={g}>
              <p className="slate-label mt-3 border-b border-border/60 pb-1">
                {g}
              </p>
              <div className="divide-y divide-border/40">
                {grouped.get(g)!.map(renderItem)}
              </div>
            </div>
          ))}
          <div className="divide-y divide-border/40">
            {ungrouped.map(renderItem)}
          </div>

          {showAddRow && (
            <AddRow cat={cat} onAdd={onAdd} onAddFamily={onAddFamily} />
          )}
        </div>
      )}
    </section>
  );
}
