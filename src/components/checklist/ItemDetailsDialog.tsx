import { useMemo } from "react";
import { CalendarIcon } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LetterIndexSelect } from "./LetterIndexSelect";
import type { Contact, Item } from "@/lib/checklist-store";
import { formatDateRange } from "@/lib/dates";
import { isoDate, parseIso } from "@/lib/dates";
import {
  fieldsForCategory,
  providerLabel,
  resolveOptions,
  type ItemDetails,
} from "@/lib/item-fields";

const NONE = "__none__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  item: Item | null;
  contacts: Contact[];
  onPatch: (patch: ItemDetails) => void;
  onLetterIndex: (letter: string | null) => void;
};

function toDate(iso?: string) {
  return iso ? parseIso(iso) : undefined;
}

function fromDate(d?: Date) {
  return d ? isoDate(d.getFullYear(), d.getMonth(), d.getDate()) : "";
}

const contactLabel = (c: Contact) => c.name?.trim() || c.role?.trim() || "Unnamed";

export function ItemDetailsDialog({
  open,
  onOpenChange,
  categoryName,
  item,
  contacts,
  onPatch,
  onLetterIndex,
}: Props) {
  const fields = useMemo(() => fieldsForCategory(categoryName), [categoryName]);
  if (!item) return null;

  const details: ItemDetails = item.details ?? {};
  const rental = details.rental ?? null;
  const range: DayPickerRange | undefined = rental?.start
    ? { from: toDate(rental.start), to: toDate(rental.end) }
    : undefined;

  const rentalLabel = rental?.start
    ? formatDateRange({ start: rental.start, end: rental.end || rental.start })
    : "Pick rental period";

  const rentalPicker = (
    <label key="rental" className="block">
      <span className="slate-label">Dates · Rental period</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "mt-1.5 flex w-full items-center gap-2 rounded-md border border-border bg-elevated px-3 py-2 text-left text-sm transition-colors hover:border-primary",
              rental?.start ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-3.5 shrink-0" />
            {rentalLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={1}
            {...(range ? { selected: range } : {})}
            {...(rental?.start ? { defaultMonth: parseIso(rental.start) } : {})}
            onSelect={(r) =>
              onPatch({
                rental: r?.from ? { start: fromDate(r.from), end: fromDate(r.to ?? r.from) } : null,
              })
            }
            className="pointer-events-auto p-3"
          />
          {rental?.start && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => onPatch({ rental: null })}
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-destructive"
              >
                Clear dates
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-6 text-base leading-snug">{item.name}</DialogTitle>
          <DialogDescription className="font-mono text-[11px] uppercase tracking-[0.1em]">
            {categoryName} · {item.qty} ×
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <div>
            <span className="slate-label">Index</span>
            <div className="mt-1.5">
              <LetterIndexSelect value={item.letterIndex} onChange={onLetterIndex} />
            </div>
          </div>

          {fields.map((f) => {
            const value = (details[f.key] as string | null | undefined) ?? "";
            const options = resolveOptions(f, item.name);
            const isProvider = f.key === "provider";
            const isSelect = f.kind === "select";
            const node =
              f.kind === "textarea" ? (
                <Textarea
                  value={value}
                  rows={3}
                  placeholder={f.placeholder}
                  onChange={(e) => onPatch({ [f.key]: e.target.value } as ItemDetails)}
                  className="mt-1.5 bg-elevated text-sm"
                />
              ) : isProvider ? (
                <>
                  <Select
                    value={value || NONE}
                    onValueChange={(v) => onPatch({ provider: v === NONE ? null : v })}
                  >
                    <SelectTrigger className="mt-1.5 w-full bg-elevated text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {contactLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {value && (
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      Selected provider: {" "}
                      <span className="text-foreground">{providerLabel(value, contacts)}</span>
                    </p>
                  )}
                </>
              ) : isSelect && options && options.length > 0 ? (
                <Select
                  value={value || NONE}
                  onValueChange={(v) => onPatch({ [f.key]: v === NONE ? null : v } as ItemDetails)}
                >
                  <SelectTrigger className="mt-1.5 w-full bg-elevated text-sm">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={value}
                  placeholder={f.placeholder}
                  onChange={(e) => onPatch({ [f.key]: e.target.value } as ItemDetails)}
                  className="mt-1.5 bg-elevated text-sm"
                />
              );

            return (
              <div key={f.key}>
                {f.key === "serial" && rentalPicker}
                <label className="block">
                  <span className="slate-label">
                    {f.label}
                    {f.private && " · not printed unless you allow it"}
                  </span>
                  {node}
                </label>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
