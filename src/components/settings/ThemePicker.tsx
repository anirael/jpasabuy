"use client";

import { useState, useTransition } from "react";
import { setTheme } from "@/app/actions/settings";
import { IconCheck } from "@/components/ui/icons";
import { THEMES, type Theme } from "@/lib/themes";

function Preview({ theme }: { theme: Theme }) {
  const r = theme.roles;
  return (
    <div className="flex h-20 overflow-hidden rounded-xl border border-neutral-200" style={{ background: r.page }} aria-hidden="true">
      <div className="flex w-1/4 flex-col gap-1.5 p-2" style={{ background: r.sidebar }}>
        <span className="h-2 rounded-full" style={{ background: r.navActive }} />
        <span className="h-2 w-3/4 rounded-full" style={{ background: r.sidebarText, opacity: 0.6 }} />
        <span className="h-2 w-2/3 rounded-full" style={{ background: r.sidebarText, opacity: 0.6 }} />
      </div>
      <div className="flex flex-1 flex-col justify-between p-2">
        <span className="h-2 w-1/3 rounded-full" style={{ background: r.ink, opacity: 0.7 }} />
        <div className="flex items-end gap-1.5">
          <span className="h-7 flex-1 rounded-md" style={{ background: r.surface }} />
          <span className="h-7 flex-1 rounded-md" style={{ background: r.accentSoft }} />
          <span className="h-5 w-8 rounded-full" style={{ background: r.accent }} />
        </div>
      </div>
    </div>
  );
}

export function ThemePicker({ currentId }: { currentId: string }) {
  const [selected, setSelected] = useState(currentId);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choose(id: string) {
    if (id === selected) return;
    setError(null);
    const previous = selected;
    setSelected(id);
    start(async () => {
      const res = await setTheme(id);
      if (!res.ok) {
        setSelected(previous);
        setError(res.error ?? "Could not save the theme.");
      }
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div role="radiogroup" aria-label="Theme" className="grid gap-4 sm:grid-cols-2">
        {THEMES.map((t) => {
          const active = t.id === selected;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(t.id)}
              className={`rounded-2xl border-2 bg-white p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                active ? "border-accent" : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <Preview theme={t} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-display text-sm font-semibold">{t.name}</span>
                {active && (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                    <IconCheck />
                  </span>
                )}
              </div>
              <div className="mt-2 flex overflow-hidden rounded-lg" aria-label={`Colors: ${t.palette.join(", ")}`}>
                {t.palette.map((c) => (
                  <span key={c} className="h-5 flex-1" style={{ background: c }} title={c} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
