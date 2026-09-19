// Logo choices for the company brand. Keep in sync with the CHECK constraint in
// supabase/migrations/20260103000000_company_logo.sql and the drawings in components/ui/Brand.tsx.
export const LOGOS = [
  { id: "clover", label: "Clover" },
  { id: "sakura", label: "Sakura" },
  { id: "flower", label: "Daisy" },
  { id: "leaf", label: "Leaf" },
  { id: "heart", label: "Heart" },
  { id: "gift", label: "Gift" },
  { id: "plane", label: "Paper plane" },
  { id: "bag", label: "Shopping bag" },
] as const;

export type LogoId = (typeof LOGOS)[number]["id"];

export const DEFAULT_LOGO: LogoId = "clover";
export const DEFAULT_COMPANY_NAME = "Calico Cove";

export function isLogoId(v: unknown): v is LogoId {
  return typeof v === "string" && LOGOS.some((l) => l.id === v);
}
