import { CATEGORY_PALETTE } from "@/data/gear";

export function SlateStripes() {
  return (
    <div className="flex h-1.5 overflow-hidden rounded-b-sm" aria-hidden>
      {CATEGORY_PALETTE.map((c: string) => (
        <span key={c} className="h-full flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}
