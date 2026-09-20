// Color themes. Each theme fills the same set of roles; Tailwind reads them as CSS variables
// (see tailwind.config.ts), so switching theme repaints the whole app without touching components.
//
//   primary   = sidebar / brand surface            (darkest palette colors)
//   secondary = buttons, active states, chart line (mid palette colors)
//   tertiary  = page background and soft tints     (lightest palette colors)
//
// A few text/ink shades are darkened derivatives of the palette so body text stays readable.

export const THEME_COOKIE = "theme";

type Roles = {
  sidebar: string;
  sidebarText: string;
  sidebarHover: string;
  navActive: string;
  navActiveInk: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  brand: string;
  page: string;
  surface: string;
  ink: string;
  /** Data-viz: the line color (>= 3:1 on the white card) and a 3-step one-hue ramp, light -> dark. */
  chartLine: string;
  ordinal: [string, string, string];
};

export type Theme = {
  id: string;
  name: string;
  /** The palette as supplied, for the swatch strip in Settings. */
  palette: string[];
  roles: Roles;
  /** A dark theme: switches the browser's own widgets (dropdown lists, scrollbars) to dark and tones down the bright status tints. */
  dark?: boolean;
  /** Explicit neutral scale (only the default theme, which keeps Tailwind's greys). Others are mixed from ink. */
  neutrals?: Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700, string>;
};

export const THEMES: Theme[] = [
  {
    id: "1",
    name: "Theme 1 · Forest",
    palette: ["#051F20", "#0B2B26", "#163832", "#235347", "#8EB69B", "#DAF1DE"],
    roles: {
      sidebar: "#051F20",
      sidebarText: "#8EB69B",
      sidebarHover: "#DAF1DE",
      navActive: "#235347",
      navActiveInk: "#DAF1DE",
      accent: "#235347",
      accentDark: "#163832",
      accentSoft: "#DAF1DE",
      brand: "#8EB69B",
      page: "#DAF1DE",
      surface: "#FFFFFF",
      ink: "#051F20",
      chartLine: "#163832",
      ordinal: ["#8EB69B", "#235347", "#051F20"],
    },
  },
  {
    id: "2",
    name: "Theme 2 · Sage",
    palette: ["#E7F5DC", "#CFE1B9", "#B6C99B", "#98A77C", "#88976C", "#728156"],
    roles: {
      sidebar: "#728156",
      sidebarText: "#E7F5DC",
      sidebarHover: "#FFFFFF",
      navActive: "#E7F5DC",
      navActiveInk: "#2F3A20",
      accent: "#728156",
      accentDark: "#5A6743",
      accentSoft: "#E7F5DC",
      brand: "#E7F5DC",
      page: "#E7F5DC",
      surface: "#FFFFFF",
      ink: "#2F3A20",
      chartLine: "#5A6743",
      ordinal: ["#98A77C", "#5F6E45", "#2F3A20"],
    },
  },
  {
    id: "3",
    name: "Theme 3 · Slate",
    palette: ["#1A2D42", "#2E4156", "#AAB7B7", "#C0C8CA", "#D4D8DD"],
    roles: {
      sidebar: "#1A2D42",
      sidebarText: "#AAB7B7",
      sidebarHover: "#D4D8DD",
      navActive: "#AAB7B7",
      navActiveInk: "#1A2D42",
      accent: "#2E4156",
      accentDark: "#1A2D42",
      accentSoft: "#D4D8DD",
      brand: "#C0C8CA",
      page: "#D4D8DD",
      surface: "#FFFFFF",
      ink: "#1A2D42",
      chartLine: "#1A2D42",
      ordinal: ["#AAB7B7", "#5E7590", "#1A2D42"],
    },
  },
  {
    id: "4",
    name: "Theme 4 · Blush Garden",
    palette: ["#C66F80", "#F4C7D0", "#ECE3D2", "#4A6644", "#9FAA74", "#D7DAB3", "#FCEBF1"],
    roles: {
      sidebar: "#4A6644",
      sidebarText: "#D7DAB3",
      sidebarHover: "#FCEBF1",
      navActive: "#C66F80",
      navActiveInk: "#FFFFFF",
      accent: "#C66F80",
      accentDark: "#A85567",
      accentSoft: "#F4C7D0",
      brand: "#D7DAB3",
      page: "#FCEBF1",
      surface: "#FFFFFF",
      ink: "#2F3D2B",
      chartLine: "#A85567",
      ordinal: ["#E290A0", "#B34F65", "#6E2A3C"],
    },
  },
  {
    id: "default",
    name: "Theme 5 · Default (current)",
    palette: ["#1F1F1F", "#E8718D", "#D0546F", "#FDEEF2", "#7CC55F", "#FFFFFF"],
    roles: {
      sidebar: "#1F1F1F",
      sidebarText: "#A3A3A3",
      sidebarHover: "#E5E5E5",
      navActive: "#E8718D",
      navActiveInk: "#FFFFFF",
      accent: "#E8718D",
      accentDark: "#D0546F",
      accentSoft: "#FDEEF2",
      brand: "#7CC55F",
      page: "#FFFFFF",
      surface: "#FFFFFF",
      ink: "#1F1F1F",
      chartLine: "#D0546F",
      ordinal: ["#EF93AB", "#D9506F", "#8F2A47"],
    },
    neutrals: { 50: "#FAFAFA", 100: "#F5F5F5", 200: "#E5E5E5", 300: "#D4D4D4", 400: "#A3A3A3", 500: "#737373", 600: "#525252", 700: "#404040" },
  },
  {
    id: "dark",
    name: "Theme 6 · Dark Mode",
    palette: ["#0B0D10", "#15181D", "#1E2228", "#2C323B", "#E8718D", "#E7E9EC"],
    dark: true,
    roles: {
      sidebar: "#0B0D10",
      sidebarText: "#9AA3AF",
      sidebarHover: "#F1F3F5",
      navActive: "#E8718D",
      navActiveInk: "#15181D",
      accent: "#E8718D",
      accentDark: "#F29BB0", // used for hover and for text on dark surfaces, so it is the lighter pink
      accentSoft: "#3A2129",
      brand: "#7CC55F",
      page: "#15181D",
      surface: "#1E2228", // cards, inputs and every "white" surface; text-white therefore becomes this dark shade too
      ink: "#E7E9EC",
      chartLine: "#F29BB0",
      ordinal: ["#F7C4D1", "#E8718D", "#B24A66"],
    },
    // Inverted scale: 50 = a faint lift above the surface, 700 = near-white text.
    neutrals: { 50: "#252A31", 100: "#2A3038", 200: "#363D47", 300: "#485160", 400: "#7F8998", 500: "#9AA3AF", 600: "#B4BBC6", 700: "#CDD2DA" },
  },
];

export const DEFAULT_THEME_ID = "default";

export function getTheme(id: string | undefined | null): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** "#E8718D" -> "232 113 141" (the channel format Tailwind's <alpha-value> needs). */
function channels(hex: string): string {
  return hexToRgb(hex).join(" ");
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[m(ar, br), m(ag, bg), m(ab, bb)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// How far each neutral step sits between white and the theme's ink (matches Tailwind's greys for the default ink).
const NEUTRAL_STEPS: Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700, number> = {
  50: 0.022,
  100: 0.045,
  200: 0.116,
  300: 0.19,
  400: 0.41,
  500: 0.625,
  600: 0.77,
  700: 0.85,
};

/** The `:root{…}` declaration for a theme. Built only from constants above, never from user input. */
export function themeCss(theme: Theme): string {
  const r = theme.roles;
  const neutrals =
    theme.neutrals ??
    (Object.fromEntries(
      (Object.keys(NEUTRAL_STEPS) as unknown as (keyof typeof NEUTRAL_STEPS)[]).map((k) => [k, mix("#FFFFFF", r.ink, NEUTRAL_STEPS[k])]),
    ) as Record<keyof typeof NEUTRAL_STEPS, string>);

  const vars: Record<string, string> = {
    "--sidebar": r.sidebar,
    "--sidebar-text": r.sidebarText,
    "--sidebar-hover": r.sidebarHover,
    "--nav-active": r.navActive,
    "--nav-active-ink": r.navActiveInk,
    "--accent": r.accent,
    "--accent-dark": r.accentDark,
    "--accent-soft": r.accentSoft,
    "--brand": r.brand,
    "--page": r.page,
    "--surface": r.surface,
    "--ink": r.ink,
    "--chart-line": r.chartLine,
    "--ord-1": r.ordinal[0],
    "--ord-2": r.ordinal[1],
    "--ord-3": r.ordinal[2],
    ...Object.fromEntries(Object.entries(neutrals).map(([k, v]) => [`--n${k}`, v])),
  };
  const declarations = Object.entries(vars)
    .map(([k, v]) => `${k}:${channels(v)}`)
    .join(";");
  return `:root{${declarations}${theme.dark ? ";color-scheme:dark" : ""}}`;
}
