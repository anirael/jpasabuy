/* eslint-disable @next/next/no-img-element */
// Plain <img>: photos come from arbitrary hosts (Mercari CDN, Supabase Storage, pasted URLs).
export function ItemImage({ src, alt = "", className = "h-11 w-11" }: { src: string | null; alt?: string; className?: string }) {
  if (!src) {
    return (
      <span className={`inline-flex ${className} shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[10px] text-neutral-400`}>
        No photo
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={`${className} shrink-0 rounded-lg bg-neutral-100 object-cover`}
    />
  );
}
