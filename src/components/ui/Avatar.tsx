export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";
  const dims = size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";
  return (
    <span
      className={`inline-flex ${dims} shrink-0 items-center justify-center rounded-full bg-accent-soft font-display font-semibold text-accent-dark ring-2 ring-white`}
      title={name}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
