import { useEffect, useRef, useState } from "react";
import type { Category, Contact, Item, Status } from "@/lib/checklist-store";
import type { Family } from "@/data/gear";
import { AddRow } from "./AddRow";
import { LetterBadge } from "./LetterIndexSelect";
import { ItemDetailsDialog } from "./ItemDetailsDialog";
import {
  detailSummary,
  fieldsForCategory,
  hasFieldSchema,
  providerLabel,
  type ItemDetails,
} from "@/lib/item-fields";
import { formatDateRange } from "@/lib/dates";

type Props = {
  cat: Category;
  color: string;
  visible: Item[];
  showAddRow: boolean;
  collapsed: boolean;
  contacts: Contact[];
  /** when false, private notes are hidden from the print/PDF output */
  printPrivateNotes: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onQty: (itemId: string, delta: number) => void;
  onStatus: (itemId: string, status: Exclude<Status, null>) => void;
  onAssign: (itemId: string, contactId: string | null) => void;
  onLetterIndex: (itemId: string, letter: string | null) => void;
  onDetails: (itemId: string, patch: ItemDetails) => void;
  onRemoveItem: (itemId: string) => void;
  onAdd: (name: string, qty: number, group?: string | null, assigneeId?: string | null) => void;
  onAddFamily: (
    family: Family,
    selectedIdx: number[],
    qty: number,
    assigneeId?: string | null,
  ) => void;
};

const contactLabel = (c: Contact) => c.name?.trim() || c.role?.trim() || "Unnamed";

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
  contacts,
  printPrivateNotes,
  onToggle,
  onDelete,
  onQty,
  onStatus,
  onAssign,
  onLetterIndex,
  onDetails,
  onRemoveItem,
  onAdd,
  onAddFamily,
}: Props) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const openItem = cat.items.find((i) => i.id === openItemId) ?? null;

  // When a new item is picked from the suggestions, open its spec sheet right away.
  const autoOpenName = useRef<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set(cat.items.map((i) => i.id)));

  useEffect(() => {
    const fresh = cat.items.filter((i) => !knownIds.current.has(i.id));
    knownIds.current = new Set(cat.items.map((i) => i.id));
    if (!autoOpenName.current) return;
    const target =
      fresh.find((i) => i.name === autoOpenName.current) ?? (fresh.length === 1 ? fresh[0] : null);
    if (target) {
      autoOpenName.current = null;
      setOpenItemId(target.id);
    }
  }, [cat.items]);

  const handleAdd: Props["onAdd"] = (name, qty, group, assigneeId) => {
    if (hasFieldSchema(cat.name)) autoOpenName.current = name;
    onAdd(name, qty, group, assigneeId);
  };

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

  const fields = fieldsForCategory(cat.name);

  const renderItem = (it: Item) => {
    const assigned = contacts.find((c) => c.id === it.assigneeId);
    const statusText =
      it.status === "have"
        ? "Have"
        : it.status === "looking"
          ? "Looking"
          : it.status === "tbc"
            ? "TBC"
            : "—";

    const details = it.details ?? {};
    const chips = detailSummary(details, contacts);
    const rentalText = details.rental?.start
      ? formatDateRange({ start: details.rental.start, end: details.rental.end })
      : "";

    const printRows = fields
      .filter((f) => (f.private ? printPrivateNotes : true))
      .map((f) => {
        const raw = (details[f.key] as string | null) ?? "";
        const value = f.key === "provider" ? providerLabel(raw, contacts) ?? "" : raw;
        return { label: f.label, value };
      })
      .filter((r) => r.value.trim());

    return (
      <div
        key={it.id}
        className={`border-l-2 py-2 pl-3 transition-colors ${
          it.status ? STATUS_ACCENT[it.status] : "border-l-transparent"
        }`}
      >
        {/* Top row: quantity + index badge + name + print info + remove */}
        <div className="flex items-start gap-2">
          <span className="no-print flex shrink-0 items-center gap-1 pt-0.5">
            <button
              type="button"
              title="Decrease quantity"
              disabled={it.qty <= 1}
              onClick={() => onQty(it.id, -1)}
              className="size-6 rounded border border-border text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-xs text-foreground">{it.qty}×</span>
            <button
              type="button"
              title="Increase quantity"
              onClick={() => onQty(it.id, 1)}
              className="size-6 rounded border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              +
            </button>
          </span>
          <span className="hidden font-mono text-xs print:inline">{it.qty} ×</span>
          {it.letterIndex && (
            <span className="pt-0.5">
              <LetterBadge letter={it.letterIndex} />
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpenItemId(it.id)}
            title="Open item details"
            className="min-w-0 flex-1 pt-1 text-left text-sm leading-snug text-foreground transition-colors hover:text-primary"
          >
            {it.name}
          </button>
          <span className="hidden shrink-0 pt-1 font-mono text-[10px] uppercase print:inline">
            {assigned ? contactLabel(assigned) : "—"} · {statusText}
          </span>
          <button
            type="button"
            aria-label="Remove item"
            title="Remove item"
            onClick={() => onRemoveItem(it.id)}
            className="no-print shrink-0 rounded border border-transparent px-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
          >
            ✕
          </button>
        </div>

        {/* Detail chips (screen) */}
        {(chips.length > 0 || rentalText) && (
          <div className="no-print mt-1.5 flex flex-wrap items-center gap-1.5">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded border border-border/70 bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {c}
              </span>
            ))}
            {rentalText && (
              <span className="rounded border border-border/70 bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {rentalText}
              </span>
            )}
          </div>
        )}

        {/* Detail lines (print) */}
        {(printRows.length > 0 || rentalText) && (
          <div className="hidden print:block">
            {rentalText && (
              <p className="font-mono text-[10px] leading-snug">Dates: {rentalText}</p>
            )}
            {printRows.map((r) => (
              <p key={r.label} className="font-mono text-[10px] leading-snug">
                {r.label}: {r.value}
              </p>
            ))}
          </div>
        )}

        {/* Bottom row: status, details */}
        <div className="no-print mt-2 flex flex-wrap items-center gap-2">
          <span className="flex shrink-0 gap-1">
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

          <button
            type="button"
            onClick={() => setOpenItemId(it.id)}
            title="Open item details"
            className="rounded border border-border bg-elevated px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            ⚙ Details
          </button>
        </div>
      </div>
    );
  };

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
              <p className="slate-label mt-3 border-b border-border/60 pb-1">{g}</p>
              <div className="divide-y divide-border/40">{grouped.get(g)!.map(renderItem)}</div>
            </div>
          ))}
          <div className="divide-y divide-border/40">{ungrouped.map(renderItem)}</div>

          {showAddRow && <AddRow cat={cat} onAdd={handleAdd} onAddFamily={onAddFamily} />}
        </div>
      )}

      <ItemDetailsDialog
        open={!!openItem}
        onOpenChange={(o) => !o && setOpenItemId(null)}
        categoryName={cat.name}
        item={openItem}
        contacts={contacts}
        onPatch={(patch) => openItem && onDetails(openItem.id, patch)}
        onLetterIndex={(letter) => openItem && onLetterIndex(openItem.id, letter)}
      />
    </section>
  );
}
