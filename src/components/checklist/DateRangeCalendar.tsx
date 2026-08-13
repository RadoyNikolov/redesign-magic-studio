import { useEffect, useState } from "react";
import type { DateField, DateRange, Project } from "@/lib/checklist-store";
import { DOW_NAMES, MONTH_NAMES, fieldLabel, isoDate, parseIso } from "@/lib/dates";

type Props = {
  project: Project;
  field: DateField;
  onSwitchField?: (f: DateField) => void;
  onPickDay?: (iso: string) => void;
  onClear?: () => void;
  onClose?: () => void;
  /** View-only preview: no tabs, no day picking, no footer actions. */
  readOnly?: boolean;
  className?: string;
};

const FIELDS: DateField[] = ["prep", "dates", "returnDate"];

const RANGE_STYLES: Record<DateField, { edge: string; inner: string; dot: string }> = {
  prep: {
    edge: "bg-prep text-background font-semibold",
    inner: "bg-prep/20 text-prep",
    dot: "bg-prep",
  },
  dates: {
    edge: "bg-shoot text-background font-semibold",
    inner: "bg-shoot/20 text-shoot",
    dot: "bg-shoot",
  },
  returnDate: {
    edge: "bg-return text-background font-semibold",
    inner: "bg-return/20 text-return",
    dot: "bg-return",
  },
};

function inRange(iso: string | null, r: DateRange) {
  if (!iso || !r.start || !r.end) return 0;
  if (iso < r.start || iso > r.end) return 0;
  return iso === r.start || iso === r.end ? 2 : 1;
}

export function DateRangeCalendar({
  project,
  field,
  onSwitchField,
  onPickDay,
  onClear,
  onClose,
  readOnly = false,
  className = "",
}: Props) {
  const base = project[field].start ? parseIso(project[field].start) : new Date();
  const [viewY, setViewY] = useState(base.getFullYear());
  const [viewM, setViewM] = useState(base.getMonth());

  useEffect(() => {
    const r = project[field];
    const b = r.start ? parseIso(r.start) : new Date();
    setViewY(b.getFullYear());
    setViewM(b.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  const startDow = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewY, viewM, 0).getDate();
  const now = new Date();
  const todayIso = isoDate(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: { dayNum: number; otherMonth: boolean; iso: string | null }[] = [];
  for (let i = 0; i < startDow; i++)
    cells.push({
      dayNum: daysInPrevMonth - startDow + 1 + i,
      otherMonth: true,
      iso: null,
    });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ dayNum: d, otherMonth: false, iso: isoDate(viewY, viewM, d) });
  let nextNum = 1;
  while (cells.length < 42) cells.push({ dayNum: nextNum++, otherMonth: true, iso: null });

  const stepMonth = (delta: number) => {
    let m = viewM + delta;
    let y = viewY;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setViewM(m);
    setViewY(y);
  };

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      data-date-cal
      className={`rounded-lg border border-border bg-elevated p-3 shadow-lift ${className || "mt-3"}`}
    >
      {!readOnly && (
        <div className="mb-3 flex gap-1.5">
          {FIELDS.map((key) => (
            <button
              key={key}
              type="button"
              onMouseDown={(e) => {
                stop(e);
                onSwitchField?.(key);
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs uppercase tracking-[0.12em] transition-colors ${
                field === key
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`size-2 rounded-full ${RANGE_STYLES[key].dot}`} aria-hidden />
              {fieldLabel(key)}
            </button>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onMouseDown={(e) => {
            stop(e);
            stepMonth(-1);
          }}
          className="size-7 rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="font-mono text-xs uppercase tracking-[0.16em]">
          {MONTH_NAMES[viewM]} {viewY}
        </span>
        <button
          type="button"
          onMouseDown={(e) => {
            stop(e);
            stepMonth(1);
          }}
          className="size-7 rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DOW_NAMES.map((d) => (
          <div key={d} className="slate-label pb-1 text-center" style={{ letterSpacing: "0.1em" }}>
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const flags = FIELDS.map((k) => ({
            key: k,
            v: inRange(c.iso, project[k]),
          })).filter((f) => f.v > 0);
          const top = flags.find((f) => f.v === 2) ?? flags[0];
          const cls = top
            ? top.v === 2
              ? RANGE_STYLES[top.key].edge
              : RANGE_STYLES[top.key].inner
            : "text-foreground/80 hover:bg-accent";
          return (
            <button
              key={i}
              type="button"
              disabled={!c.iso || readOnly}
              onMouseDown={(e) => {
                stop(e);
                if (c.iso) onPickDay?.(c.iso);
              }}
              className={`h-8 rounded-md font-mono text-[13px] transition-colors ${
                c.otherMonth ? "text-muted-foreground/35" : cls
              } ${c.iso === todayIso ? "ring-1 ring-inset ring-primary/70" : ""}`}
            >
              {c.dayNum}
            </button>
          );
        })}
      </div>

      {!readOnly && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            onMouseDown={(e) => {
              stop(e);
              onClear?.();
            }}
            className="text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-destructive"
          >
            Clear {fieldLabel(field)}
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              stop(e);
              onClose?.();
            }}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
