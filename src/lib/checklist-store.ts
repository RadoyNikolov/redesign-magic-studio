import { useCallback, useEffect, useRef, useState } from "react";
import { GEAR, uid } from "@/data/gear";
import type { ItemDetails } from "@/lib/item-fields";

const STORAGE_KEY = "cameraGearChecklist_v2";

export type Status = "have" | "looking" | "tbc" | null;

export type Item = {
  id: string;
  name: string;
  qty: number;
  status: Status;
  group: string | null;
  familyKey?: string;
  mmList?: string[];
  /** id of a project contact this item is assigned to */
  assigneeId?: string | null;
  /** alphabetical index letter used for grouping / labeling */
  letterIndex?: string | null;
  /** per-item spec sheet, fields depend on the category (see item-fields.ts) */
  details?: ItemDetails;
};

export type Category = {
  id: string;
  name: string;
  collapsed: boolean;
  items: Item[];
};

export type DateRange = { start: string; end: string; legacyText?: string };
export type DateField = "prep" | "dates" | "returnDate";

export type Contact = {
  id: string;
  role: string;
  name: string;
  email: string;
  phone: string;
};

export type RentalCompany = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type Project = {
  name: string;
  type: string;
  collapsed: boolean;
  dates: DateRange;
  prep: DateRange;
  returnDate: DateRange;
  contacts: Contact[];
  rentalCompanies: RentalCompany[];
};

export type State = {
  view: "setup" | "checklist";
  project: Project;
  categories: Category[];
};

export const DEFAULT_ROLES = [
  "Main Rental",
  "Producer",
  "Line Producer",
  "DoP",
  "1st AC",
  "2nd AC",
  "DIT",
];

export const DEFAULT_RENTAL_COMPANIES: RentalCompany[] = [
  { id: uid(), name: "Nu Boyana Film Studios", email: "office@b2yproductions.com", phone: "+359888550124" },
  { id: uid(), name: "B2Y Productions", email: "office@b2yproductions.com", phone: "+359888550124" },
  { id: uid(), name: "Magic Shop", email: "office@magicshoprental.com", phone: "+359 896 482 295" },
  { id: uid(), name: "Pro Camera", email: "rental@procamera.bg", phone: "+359 87 929 1110" },
];

function defaultData(): State {
  return {
    view: "setup",
    project: {
      name: "",
      type: "",
      collapsed: false,
      dates: { start: "", end: "" },
      prep: { start: "", end: "" },
      returnDate: { start: "", end: "" },
      contacts: DEFAULT_ROLES.map((role) => ({
        id: uid(),
        role,
        name: "",
        email: "",
        phone: "",
      })),
      rentalCompanies: DEFAULT_RENTAL_COMPANIES.map((c) => ({ ...c })),
    },
    categories: Object.keys(GEAR).map((name) => ({
      id: uid(),
      name,
      collapsed: true,
      items: [],
    })),
  };
}

// Reorders an existing categories array to match the canonical GEAR key order.
function reorderCategoriesToCanonical(categories: Category[]): Category[] {
  const canonical = Object.keys(GEAR);
  const known: Category[] = [];
  const custom: Category[] = [];
  categories.forEach((c) => (canonical.includes(c.name) ? known : custom).push(c));
  known.sort((a, b) => canonical.indexOf(a.name) - canonical.indexOf(b.name));
  return known.concat(custom);
}

const RENAMES: Record<string, string> = {
  Accessories: "Miscellaneous Accessories",
  "Grip & Camera Support": "Grip",
  "Media & Data": "Data",
};

const ROLE_RENAMES: Record<string, string> = {
  "Production Company / Rental": "Main Rental",
  "Director of Photography": "DoP",
  "1st Assistant Camera": "1st AC",
  "2nd Assistant Camera": "2nd AC",
};

export function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.categories)) {
        if (!d.project) d.project = defaultData().project;
        (["dates", "prep", "returnDate"] as DateField[]).forEach((key) => {
          const v = d.project[key];
          if (v && typeof v === "object" && "start" in v) return;
          d.project[key] =
            typeof v === "string" && v.trim()
              ? { start: "", end: "", legacyText: v }
              : { start: "", end: "" };
        });
        if (d.view === undefined) d.view = "checklist";
        if (!Array.isArray(d.project.rentalCompanies) || d.project.rentalCompanies.length === 0) {
          d.project.rentalCompanies = DEFAULT_RENTAL_COMPANIES.map((c) => ({ ...c }));
        }
        d.categories.forEach((c: Category) => {
          const renamed = RENAMES[c.name];
          if (renamed) c.name = renamed;
        });
        const existingNames = new Set(d.categories.map((c: Category) => c.name));
        Object.keys(GEAR).forEach((name) => {
          if (!existingNames.has(name)) {
            d.categories.push({ id: uid(), name, collapsed: true, items: [] });
          }
        });
        d.categories = reorderCategoriesToCanonical(d.categories);
        return d as State;
      }
    }
  } catch {
    /* ignore corrupt saves */
  }
  return defaultData();
}

export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function useChecklist() {
  const [state, setState] = useState<State>(() => defaultData());
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, hydrated]);

  /** Mutate a deep clone of state — mirrors the original app's imperative edits. */
  const mutate = useCallback((fn: (draft: State) => void) => {
    setState((prev) => {
      const draft = clone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const reset = useCallback(() => {
    clearStorage();
    setState(defaultData());
  }, []);

  return { state, mutate, reset, hydrated, stateRef };
}
