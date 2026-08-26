import { useEffect, useRef, useState } from "react";
import type { DateField, RentalCompany, State } from "@/lib/checklist-store";
import { uid } from "@/data/gear";
import { fieldLabel, formatDateRange } from "@/lib/dates";
import { DateRangeCalendar } from "./DateRangeCalendar";
import { SlateStripes } from "./SlateStripes";

const RENTAL_SELECT_CLS =
  "w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none";

type Props = {
  state: State;
  mutate: (fn: (draft: State) => void) => void;
  onContinue: () => void;
};

const FIELDS: DateField[] = ["prep", "dates", "returnDate"];
const FIELD_TITLE: Record<DateField, string> = {
  prep: "Prep",
  dates: "Shooting dates",
  returnDate: "Equipment return",
};

const inputCls =
  "w-full rounded-md border border-border bg-elevated px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none";

export function SetupScreen({ state, mutate, onContinue }: Props) {
  const [calField, setCalField] = useState<DateField | null>(null);
  const pickStart = useRef<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveForm, setArchiveForm] = useState({ name: "", email: "", phone: "" });
  const [rentalPick, setRentalPick] = useState("");
  const p = state.project;

  const applyRentalCompany = (contactId: string, companyId: string) => {
    const company = p.rentalCompanies.find((rc) => rc.id === companyId);
    mutate((d) => {
      const t = d.project.contacts.find((x) => x.id === contactId);
      if (!t || !company) return;
      t.name = company.name;
      t.email = company.email;
      t.phone = company.phone;
    });
    setRentalPick("");
  };

  const addRentalCompany = () => {
    const name = archiveForm.name.trim();
    const email = archiveForm.email.trim();
    const phone = archiveForm.phone.trim();
    if (!name && !email && !phone) return;
    mutate((d) => {
      d.project.rentalCompanies.push({
        id: uid(),
        name,
        email,
        phone,
      });
    });
    setArchiveForm({ name: "", email: "", phone: "" });
  };

  const removeRentalCompany = (id: string) => {
    mutate((d) => {
      d.project.rentalCompanies = d.project.rentalCompanies.filter((rc) => rc.id !== id);
    });
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!calField) return;
      if (t.closest("[data-date-cal]") || t.closest("[data-date-btn]")) return;
      setCalField(null);
      pickStart.current = null;
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [calField]);

  const pickDay = (iso: string) => {
    if (!calField) return;
    const field = calField;
    if (pickStart.current === null) {
      mutate((d) => {
        d.project[field] = { start: iso, end: iso };
      });
      pickStart.current = iso;
    } else {
      const a = pickStart.current;
      mutate((d) => {
        d.project[field] = {
          start: a < iso ? a : iso,
          end: a < iso ? iso : a,
        };
      });
      pickStart.current = null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pb-24">
      <header className="pt-8">
        <SlateStripes />
        <p className="slate-label mt-5">Step 01 — Intake</p>
        <h1 className="mt-1 text-[clamp(2rem,6vw,3rem)] leading-[0.95] text-foreground">
          New project setup
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Fill this in once — it carries over to your gear checklist.
        </p>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 shadow-panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="slate-label mb-1.5 block" htmlFor="setupName">
              Project name
            </label>
            <input
              id="setupName"
              className={inputCls}
              value={p.name}
              placeholder="Untitled project"
              onChange={(e) => {
                const v = e.target.value;
                mutate((d) => {
                  d.project.name = v;
                });
              }}
            />
          </div>
          <div>
            <label className="slate-label mb-1.5 block" htmlFor="setupType">
              Project type
            </label>
            <input
              id="setupType"
              className={inputCls}
              value={p.type}
              placeholder="FEATURE FILM"
              onChange={(e) => {
                const v = e.target.value;
                mutate((d) => {
                  d.project.type = v;
                });
              }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {FIELDS.map((key) => {
            const text = formatDateRange(p[key]);
            return (
              <div key={key}>
                <span className="slate-label mb-1.5 block">{FIELD_TITLE[key]}</span>
                <button
                  type="button"
                  data-date-btn
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickStart.current = null;
                    setCalField(key);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    calField === key
                      ? "border-primary bg-primary/10"
                      : "border-border bg-elevated hover:border-primary/50"
                  }`}
                >
                  <span className={text ? "text-foreground" : "text-muted-foreground/70"}>
                    {text || "Tap to pick dates"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {fieldLabel(key).slice(0, 1)}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {calField && (
          <DateRangeCalendar
            project={p}
            field={calField}
            onSwitchField={(f) => {
              pickStart.current = null;
              setCalField(f);
            }}
            onPickDay={pickDay}
            onClear={() => {
              const field = calField;
              pickStart.current = null;
              mutate((d) => {
                d.project[field] = { start: "", end: "" };
              });
            }}
            onClose={() => {
              pickStart.current = null;
              setCalField(null);
            }}
          />
        )}
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-panel">
        <h2 className="text-base tracking-[0.06em] text-foreground">Team</h2>
        <div className="mt-4 space-y-2">
          {p.contacts.map((c, index) => (
            <div
              key={c.id}
              className="grid grid-cols-1 items-center gap-2 border-b border-border/60 pb-2 last:border-0 sm:grid-cols-[1.2fr_1fr_1.2fr_0.9fr_auto]"
            >
              {index === 0 && c.role === "Production Company / Rental" ? (
                <div className="flex flex-col gap-1.5 sm:col-span-4">
                  <span className="slate-label">{c.role}</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr_1.2fr_0.9fr_auto]">
                    <select
                      value={rentalPick}
                      onChange={(e) => {
                        console.log("onChange fired", e.target.value, c.id);
                        const id = e.target.value;
                        if (id) applyRentalCompany(c.id, id);
                      }}
                      className={RENTAL_SELECT_CLS}
                    >
                      <option value="">Select from rental archive…</option>
                      {p.rentalCompanies.map((rc) => (
                        <option key={rc.id} value={rc.id}>
                          {rc.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className={inputCls}
                      placeholder="Name"
                      value={c.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        mutate((d) => {
                          const t = d.project.contacts.find((x) => x.id === c.id);
                          if (t) t.name = v;
                        });
                      }}
                    />
                    <input
                      className={inputCls}
                      placeholder="Email"
                      value={c.email}
                      onChange={(e) => {
                        const v = e.target.value;
                        mutate((d) => {
                          const t = d.project.contacts.find((x) => x.id === c.id);
                          if (t) t.email = v;
                        });
                      }}
                    />
                    <input
                      className={inputCls}
                      placeholder="Phone"
                      value={c.phone}
                      onChange={(e) => {
                        const v = e.target.value;
                        mutate((d) => {
                          const t = d.project.contacts.find((x) => x.id === c.id);
                          if (t) t.phone = v;
                        });
                      }}
                    />
                    <span className="hidden sm:block" />
                  </div>
                </div>
              ) : (
                <>
                  <input
                    className={`${inputCls} font-mono text-xs uppercase tracking-[0.1em]`}
                    placeholder="Position"
                    value={c.role}
                    onChange={(e) => {
                      const v = e.target.value;
                      mutate((d) => {
                        const t = d.project.contacts.find((x) => x.id === c.id);
                        if (t) t.role = v;
                      });
                    }}
                  />
                  <input
                    className={inputCls}
                    placeholder="Name"
                    value={c.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      mutate((d) => {
                        const t = d.project.contacts.find((x) => x.id === c.id);
                        if (t) t.name = v;
                      });
                    }}
                  />
                  <input
                    className={inputCls}
                    placeholder="Email"
                    value={c.email}
                    onChange={(e) => {
                      const v = e.target.value;
                      mutate((d) => {
                        const t = d.project.contacts.find((x) => x.id === c.id);
                        if (t) t.email = v;
                      });
                    }}
                  />
                  <input
                    className={inputCls}
                    placeholder="Phone"
                    value={c.phone}
                    onChange={(e) => {
                      const v = e.target.value;
                      mutate((d) => {
                        const t = d.project.contacts.find((x) => x.id === c.id);
                        if (t) t.phone = v;
                      });
                    }}
                  />
                  <button
                    type="button"
                    title="Remove position"
                    onClick={() =>
                      mutate((d) => {
                        d.project.contacts = d.project.contacts.filter((x) => x.id !== c.id);
                      })
                    }
                    className="justify-self-end rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            mutate((d) => {
              d.project.contacts.push({
                id: uid(),
                role: "",
                name: "",
                email: "",
                phone: "",
              });
            })
          }
          className="mt-4 text-xs uppercase tracking-[0.14em] text-primary transition-opacity hover:opacity-70"
        >
          + Add position
        </button>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-panel">
        <button
          type="button"
          onClick={() => setArchiveOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <h2 className="text-base tracking-[0.06em] text-foreground">Rental companies archive</h2>
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-primary">
            {archiveOpen ? "Close" : "Edit"}
          </span>
        </button>

        {archiveOpen && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <input
                className={inputCls}
                placeholder="Company name"
                value={archiveForm.name}
                onChange={(e) => setArchiveForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addRentalCompany();
                }}
              />
              <input
                className={inputCls}
                placeholder="Email"
                value={archiveForm.email}
                onChange={(e) => setArchiveForm((f) => ({ ...f, email: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addRentalCompany();
                }}
              />
              <input
                className={inputCls}
                placeholder="Phone"
                value={archiveForm.phone}
                onChange={(e) => setArchiveForm((f) => ({ ...f, phone: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addRentalCompany();
                }}
              />
              <button
                type="button"
                onClick={addRentalCompany}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground transition-opacity hover:opacity-80"
              >
                + Add
              </button>
            </div>

            {p.rentalCompanies.length > 0 && (
              <div className="divide-y divide-border/60">
                {p.rentalCompanies.map((rc) => (
                  <div
                    key={rc.id}
                    className="grid grid-cols-1 items-center gap-2 py-2 sm:grid-cols-[1.2fr_1fr_1fr_auto]"
                  >
                    <span className="text-sm text-foreground">{rc.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{rc.email}</span>
                    <span className="font-mono text-xs text-muted-foreground">{rc.phone}</span>
                    <button
                      type="button"
                      onClick={() => removeRentalCompany(rc.id)}
                      className="justify-self-end rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-transform hover:-translate-y-px sm:w-auto"
      >
        Continue to checklist →
      </button>
    </div>
  );
}
