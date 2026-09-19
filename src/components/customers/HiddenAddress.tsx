"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/ui/icons";

/** Address stays masked until the Owner clicks the eye. The mask has a fixed length so it does not hint at the real one. */
export function HiddenAddress({ address }: { address: string }) {
  const [shown, setShown] = useState(false);
  if (!address.trim()) return <span className="text-neutral-400">—</span>;
  return (
    <div className="flex items-start gap-2">
      <span className={`min-w-0 flex-1 whitespace-pre-line break-words ${shown ? "text-neutral-700" : "select-none tracking-widest text-neutral-400"}`} aria-live="polite">
        {shown ? address : "••••••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        aria-label={shown ? "Hide address" : "Show address"}
        title={shown ? "Hide address" : "Show address"}
        className="shrink-0 rounded-lg p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {shown ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
