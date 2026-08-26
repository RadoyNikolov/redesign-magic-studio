export type ItemDetails = {
  codec?: string | null;
  squeeze?: string | null;
  rate?: string | null;
  frameLines?: string | null;
  lensMount?: string | null;
  rental?: { start: string; end: string } | null;
  serial?: string | null;
  provider?: string | null;
  notes?: string | null;
  privateNotes?: string | null;
};

export type DetailKey = keyof ItemDetails;

export type FieldDef = {
  key: Exclude<DetailKey, "rental">;
  label: string;
  kind: "select" | "text" | "textarea";
  /** static option list; when omitted for a select it falls back to free text */
  options?: string[];
  /** resolve options from the item name (brand-dependent lists) */
  optionsFor?: (itemName: string) => string[] | null;
  placeholder?: string;
  private?: boolean;
};

/* ---------- Recording codecs per camera brand ---------- */
export const CODECS_BY_BRAND: Record<string, string[]> = {
  ARRI: ["ARRIRAW", "ProRes 4444XQ", "ProRes 4444", "ProRes 422HQ", "ProRes 422", "ProRes 422LT"],
  Sony: ["X-OCN XT", "X-OCN ST", "X-OCN LT", "ProRes 4444XQ", "ProRes 4444", "ProRes 422XQ"],
  RED: ["REDCODE HQ", "REDCODE MQ", "REDCODE LQ", "REDCODE ELQ"],
};

export function brandOf(itemName: string): string | null {
  const n = itemName.toLowerCase();
  if (n.includes("arri") || n.includes("alexa") || n.includes("amira")) return "ARRI";
  if (n.includes("sony") || n.includes("venice") || n.includes("burano")) return "Sony";
  if (
    n.includes("red ") ||
    n.startsWith("red") ||
    n.includes("komodo") ||
    n.includes("raptor") ||
    n.includes("monstro") ||
    n.includes("helium") ||
    n.includes("v-raptor")
  )
    return "RED";
  return null;
}

export function codecsFor(itemName: string): string[] | null {
  const brand = brandOf(itemName);
  return brand ? (CODECS_BY_BRAND[brand] ?? null) : null;
}

export const SQUEEZE_OPTIONS = ["1x", "1.3x", "1.5x", "1.8x", "2x"];
export const RATE_OPTIONS = [
  "23.976 fps",
  "24 fps",
  "25 fps",
  "29.97 fps",
  "30 fps",
  "48 fps",
  "50 fps",
  "59.94 fps",
  "60 fps",
];
export const LENS_MOUNT_OPTIONS = ["PL", "LPL", "EF", "E", "RF", "MFT", "L-Mount", "G-Mount"];

const CAMERA_FIELDS: FieldDef[] = [
  {
    key: "codec",
    label: "Recording Codec",
    kind: "select",
    optionsFor: codecsFor,
    placeholder: "e.g. ProRes 4444",
  },
  { key: "squeeze", label: "Squeeze Factor", kind: "select", options: SQUEEZE_OPTIONS },
  { key: "rate", label: "Project Rate", kind: "select", options: RATE_OPTIONS },
  {
    key: "frameLines",
    label: "Aspect Ratio",
    kind: "select",
    options: ["1.00", "1.33:1", "1.78:1", "1.85:1", "2.00:1", "2.39:1", "2.35:1"],
  },
  { key: "lensMount", label: "Lens Mount", kind: "select", options: LENS_MOUNT_OPTIONS },
  { key: "serial", label: "Serial Number", kind: "text", placeholder: "e.g. 12345" },
  { key: "provider", label: "Provider", kind: "select" },
  { key: "notes", label: "Notes", kind: "textarea" },
  { key: "privateNotes", label: "Private Notes", kind: "textarea", private: true },
];

/** Shared fields used by categories that have no dedicated schema yet. */
const GENERIC_FIELDS: FieldDef[] = [
  { key: "serial", label: "Serial Number", kind: "text" },
  { key: "provider", label: "Provider", kind: "select" },
  { key: "notes", label: "Notes", kind: "textarea" },
  { key: "privateNotes", label: "Private Notes", kind: "textarea", private: true },
];

const SCHEMAS: Record<string, FieldDef[]> = {
  Cameras: CAMERA_FIELDS,
};

export function fieldsForCategory(categoryName: string): FieldDef[] {
  return SCHEMAS[categoryName] ?? GENERIC_FIELDS;
}

/** True when the category has a dedicated technical spec sheet. */
export function hasFieldSchema(categoryName: string): boolean {
  return !!SCHEMAS[categoryName];
}

export function resolveOptions(field: FieldDef, itemName: string): string[] | null {
  if (field.options) return field.options;
  if (field.optionsFor) return field.optionsFor(itemName);
  return null;
}

/** Short chips shown under the item name in the list. */
export function detailSummary(
  details: ItemDetails | undefined,
  contacts: { id: string; name?: string | null; role?: string | null }[],
): string[] {
  if (!details) return [];
  const out: string[] = [];
  if (details.codec) out.push(details.codec);
  if (details.rate) out.push(details.rate);
  if (details.squeeze) out.push(details.squeeze);
  if (details.frameLines) out.push(details.frameLines);
  if (details.lensMount) out.push(details.lensMount);
  if (details.serial) out.push(`S/N ${details.serial}`);
  if (details.provider) {
    const c = contacts.find((x) => x.id === details.provider);
    const label = c?.name?.trim() || c?.role?.trim() || "Provider";
    out.push(`Provided by ${label}`);
  }
  return out;
}

export function providerLabel(
  providerId: string | null | undefined,
  contacts: { id: string; name?: string | null; role?: string | null }[],
): string | null {
  if (!providerId) return null;
  const c = contacts.find((x) => x.id === providerId);
  return c?.name?.trim() || c?.role?.trim() || null;
}

export function hasAnyDetail(details: ItemDetails | undefined): boolean {
  if (!details) return false;
  return Object.entries(details).some(([k, v]) =>
    k === "rental" ? !!(v && (v as { start: string }).start) : !!v,
  );
}
