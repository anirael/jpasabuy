import { DEFAULT_COMPANY_NAME, isLogoId, type LogoId } from "@/lib/logos";

// Marks are drawn on a 64x64 grid in the theme's brand color; small details are cut out in the sidebar color,
// so always show them on a sidebar-colored background.
const petals = (n: number, d: string) =>
  Array.from({ length: n }, (_, i) => <path key={i} d={d} transform={`rotate(${(360 / n) * i} 32 32)`} />);

function Shapes({ logo }: { logo: LogoId }) {
  switch (logo) {
    case "sakura":
      return (
        <>
          <g className="fill-brand">{petals(5, "M32 31C21 24 21 9 28.5 6.5L32 11L35.5 6.5C43 9 43 24 32 31Z")}</g>
          <circle cx="32" cy="32" r="3" className="fill-sidebar" />
        </>
      );
    case "flower":
      return (
        <>
          <g className="fill-brand">
            {Array.from({ length: 8 }, (_, i) => (
              <ellipse key={i} cx="32" cy="15" rx="6" ry="11" transform={`rotate(${45 * i} 32 32)`} />
            ))}
          </g>
          <circle cx="32" cy="32" r="8" className="fill-sidebar" />
          <circle cx="32" cy="32" r="4.5" className="fill-brand" />
        </>
      );
    case "leaf":
      return (
        <>
          <path d="M32 5C49 18 53 37 32 59C11 37 15 18 32 5Z" className="fill-brand" />
          <g className="stroke-sidebar" fill="none" strokeWidth="2.5" strokeLinecap="round">
            <path d="M32 55V21" />
            <path d="M32 40L42 30M32 32L23 25M32 46L23 39" />
          </g>
        </>
      );
    case "heart":
      return <path d="M32 55C10 40 6 26 12 17C18 9 28 11 32 19C36 11 46 9 52 17C58 26 54 40 32 55Z" className="fill-brand" />;
    case "gift":
      return (
        <>
          <rect x="10" y="27" width="44" height="28" rx="3" className="fill-brand" />
          <rect x="7" y="19" width="50" height="11" rx="3" className="fill-brand" />
          <rect x="29" y="19" width="6" height="36" className="fill-sidebar" />
          <path d="M32 19C24 6 12 9 16 16C19 20 27 19 32 19ZM32 19C40 6 52 9 48 16C45 20 37 19 32 19Z" className="fill-brand" />
          <path d="M32 19C27 12 21 11 20 14M32 19C37 12 43 11 44 14" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-sidebar" />
        </>
      );
    case "plane":
      return (
        <>
          <path d="M57 7L7 28L26 34L32 56Z" className="fill-brand" strokeLinejoin="round" />
          <path d="M26 34L57 7" fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-sidebar" />
        </>
      );
    case "bag":
      return (
        <>
          <path d="M13 22H51L48 56H16Z" className="fill-brand stroke-brand" strokeWidth="3" strokeLinejoin="round" />
          <path d="M23 28V20C23 8 41 8 41 20V28" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-brand" />
          <circle cx="23" cy="30" r="2.2" className="fill-sidebar" />
          <circle cx="41" cy="30" r="2.2" className="fill-sidebar" />
        </>
      );
    case "clover":
    default:
      return (
        <g className="fill-brand">
          <path d="M32 30C22 24 14 18 16 10c2-7 12-8 16 0 4-8 14-7 16 0 2 8-6 14-16 20z" />
          <path d="M34 32c6-10 12-18 20-16 7 2 8 12 0 16 8 4 7 14 0 16-8 2-14-6-20-16z" />
          <path d="M32 34c10 6 18 14 16 22-2 7-12 8-16 0-4 8-14 7-16 0-2-8 6-16 16-22z" />
          <path d="M30 32C24 42 16 50 10 48c-7-2-8-12 0-16-8-4-7-14 0-16 8-2 14 6 20 16z" />
        </g>
      );
  }
}

export function LogoMark({ logo, className = "h-10 w-10" }: { logo?: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <Shapes logo={isLogoId(logo) ? logo : "clover"} />
    </svg>
  );
}

/** Icon + company name. The name is truncated to two lines so a long company name never breaks the sidebar. */
export function Logo({ name = DEFAULT_COMPANY_NAME, logo }: { name?: string; logo?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LogoMark logo={logo} className="h-10 w-10 shrink-0" />
      <span className="line-clamp-2 min-w-0 break-words font-display text-lg font-semibold leading-tight tracking-tight text-brand" title={name}>
        {name}
      </span>
    </div>
  );
}
