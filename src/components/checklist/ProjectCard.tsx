import type { Project } from "@/lib/checklist-store";
import { formatDateRange } from "@/lib/dates";

type Props = {
  project: Project;
  onToggle: () => void;
  onEdit: () => void;
};

export function ProjectCard({ project: p, onToggle, onEdit }: Props) {
  const shootText = formatDateRange(p.dates);
  const prepText = formatDateRange(p.prep);
  const returnText = formatDateRange(p.returnDate);
  const filledContacts = p.contacts.filter(
    (c) => c.role || c.name || c.email || c.phone,
  );
  const empty =
    !shootText && !prepText && !returnText && filledContacts.length === 0;

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
          {shootText && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-shoot/40 bg-shoot/10 px-3 py-1.5">
              <span className="size-2 rounded-full bg-shoot" aria-hidden />
              <span className="font-mono text-xs tracking-[0.06em] text-foreground">
                {shootText}
              </span>
            </div>
          )}

          {(prepText || returnText) && (
            <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs">
              {prepText && (
                <span className="text-foreground">
                  <span className="mr-2 uppercase tracking-[0.14em] text-prep">
                    Prep
                  </span>
                  {prepText}
                </span>
              )}
              {returnText && (
                <span className="text-foreground">
                  <span className="mr-2 uppercase tracking-[0.14em] text-return">
                    Return
                  </span>
                  {returnText}
                </span>
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
                  <span className="font-mono text-xs text-muted-foreground">
                    {c.phone}
                  </span>
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
