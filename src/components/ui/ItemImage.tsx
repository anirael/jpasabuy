"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { mercariThumbUrl } from "@/lib/mercari";

// Plain <img>: photos come from arbitrary hosts (Mercari CDN, Supabase Storage, pasted URLs).
// Every use is a small thumbnail, so Mercari photos load their small version; if that ever fails, the original is used.
export function ItemImage({ src, alt = "", className = "h-11 w-11" }: { src: string | null; alt?: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src) {
    return (
      <span className={`inline-flex ${className} shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[10px] text-neutral-400`}>
        No photo
      </span>
    );
  }
  const shown = failedSrc === src ? src : (mercariThumbUrl(src) ?? src);
  return (
    <img
      src={shown}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      // A load error before hydration has already fired, so also check for a broken image once mounted.
      ref={(el) => {
        if (el && shown !== src && el.complete && el.naturalWidth === 0) setFailedSrc(src);
      }}
      onError={() => {
        if (shown !== src) setFailedSrc(src);
      }}
      className={`${className} shrink-0 rounded-lg bg-neutral-100 object-cover`}
    />
  );
}
