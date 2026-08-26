import { useState } from "react";
import { LETTER_INDEX, getLetterColor } from "@/lib/letter-index";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function LetterBadge({ letter, size = 5 }: { letter: string; size?: number }) {
  const { bg, text } = getLetterColor(letter);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm font-bold leading-none",
        size >= 6 ? "h-6 w-6 text-[11px]" : "h-5 w-5 text-[10px]",
      )}
      style={{ backgroundColor: bg, color: text }}
      title={`Index ${letter}`}
    >
      {letter}
    </span>
  );
}

type Props = {
  value: string | null | undefined;
  onChange: (letter: string | null) => void;
  className?: string;
};

/** Compact index picker: shows A–D by default with an option to reveal A–Z. */
export function LetterIndexSelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const letters = expanded ? LETTER_INDEX : LETTER_INDEX.slice(0, 4);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setExpanded(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Assign alphabetical index"
          title="Assign an alphabetical index to this item"
          className={cn(
            "inline-flex h-7 items-center gap-2 rounded border bg-elevated px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
            value
              ? "border-primary/60 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          {value ? <LetterBadge letter={value} /> : <span>◇ Index</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => {
                onChange(letter);
                setOpen(false);
              }}
              className={cn(
                "rounded-sm p-0.5 transition-transform hover:scale-110",
                value === letter && "ring-2 ring-primary ring-offset-1 ring-offset-popover",
              )}
            >
              <LetterBadge letter={letter} size={6} />
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? "Show less" : "More A–Z"}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-destructive"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
