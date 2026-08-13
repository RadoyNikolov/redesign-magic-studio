import { useState } from "react";
import type { DateField, Project } from "@/lib/checklist-store";
import { formatDateRange } from "@/lib/dates";
import { DateRangeCalendar } from "./DateRangeCalendar";

const PILL_DOT: Record<DateField, string> = {
  prep: "bg-prep",
  dates: "bg-shoot",
  returnDate: "bg-return",
};
const PILL_LABEL: Record<DateField, string> = {
  prep: "Prep",
  dates: "Shoot",
  returnDate: "Return",
};

type Props = {
  project: Project;
  onToggle: () => void;
  onEdit: () => void;
};

export function ProjectCard({ project: p, onToggle, onEdit }: Props) {
  const [roField, setRoField] = useState<DateField | null>(null);
  const shootText = formatDateRange(p.dates);
  const prepText = formatDateRange(p.prep);
  const returnText = formatDateRange(p.returnDate);
  const filledContacts = p.contacts.filter((c) => c.role || c.name || c.email || c.phone);
  const empty = !shootText && !prepText && !returnText && filledContacts.length === 0;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
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
          className={`shrink-0 text-muted-foreground transition-transform ${p.collapsed ? "-rotate-90" : ""}`}
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
        <span className="font-display text-sm uppercase tracking-[0.06em] text-foreground">
          {p.name || "Untitled project"}
        </span>
        {p.type && (
          <span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
            {p.type}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="no-print ml-auto rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          ✎ Edit
        </button>
      </div>

      {!p.collapsed && (
        <div className="border-t border-border px-4 py-4">
          {(prepText || shootText || returnText) && (
            <div className="relative mb-3">
              <div className="flex flex-wrap gap-2" title="Tap a date to view it on a calendar">
                {(
                  [
                    ["prep", prepText],
                    ["dates", shootText],
                    ["returnDate", returnText],
                  ] as [DateField, string][]
                )
                  .filter(([, text]) => !!text)
                  .map(([key, text]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRoField((cur) => (cur === key ? null : key))}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 transition-colors ${
                        roField === key
                          ? "border-primary bg-primary/10"
                          : "border-border bg-elevated hover:border-primary/60"
                      }`}
                    >
                      <span className={`size-2 rounded-full ${PILL_DOT[key]}`} aria-hidden />
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {PILL_LABEL[key]}
                      </span>
                      <span className="font-mono text-xs text-foreground">{text}</span>
                    </button>
                  ))}
              </div>
              {roField && (
                <div className="no-print absolute left-0 top-[calc(100%+6px)] z-30 w-[320px] max-w-full">
                  <DateRangeCalendar project={p} field={roField} readOnly className="m-0" />
                </div>
              )}
            </div>
          )}

          {filledContacts.length > 0 && (
            <div className="divide-y divide-border/60">
              {filledContacts.map((c) => (
                <div
                  key={c.id}
                  className="grid grid-cols-1 gap-x-4 py-2 text-sm sm:grid-cols-[1.2fr_1fr_1.2fr_0.9fr]"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {c.role}
                  </span>
                  <span className="text-foreground">{c.name}</span>
                  <span className="text-muted-foreground">{c.email}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.phone}</span>
                </div>
              ))}
            </div>
          )}

          <p className="slate-label mt-3">
            {empty ? "No project info yet." : "Editable from the setup screen."}
          </p>
        </div>
      )}
    </section>
  );
}
