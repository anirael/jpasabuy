"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ItemImage } from "@/components/ui/ItemImage";
import { IconClose } from "@/components/ui/icons";

/**
 * Thumbnail that opens the full image in a modal (no new page). Click anywhere — the photo, the
 * backdrop or the close button — or press Esc to go back to the list.
 */
export function ImageZoom({ src, alt = "", className = "h-11 w-11", label = "Enlarge photo" }: { src: string | null; alt?: string; className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        e.preventDefault(); // the close button is the only focusable element in the dialog
        closeBtn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const btn = trigger.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      btn?.focus();
    };
  }, [open]);

  if (!src) return <ItemImage src={null} className={className} />;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        className="shrink-0 cursor-zoom-in rounded-lg transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <ItemImage src={src} alt={alt} className={className} />
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo preview"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-black/80 p-4 sm:p-8"
          >
            <button
              ref={closeBtn}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close preview"
              className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <IconClose />
            </button>
            <img
              src={src}
              alt={alt || "Item photo"}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full rounded-xl bg-neutral-100 object-contain shadow-2xl"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
