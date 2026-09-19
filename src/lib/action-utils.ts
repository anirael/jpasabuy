import { z } from "zod";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
} | null;

export function zodToState(err: z.ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: "Please fix the highlighted fields.", fieldErrors };
}

/** Map Postgres/PostgREST errors to something safe and friendly (never leak internals). */
export function dbError(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return "Something went wrong. Please try again.";
  switch (err.code) {
    case "42501":
      return "You don't have permission to do that.";
    case "23503":
      return "This record is still referenced by other data. Remove or reassign the related items first.";
    case "23514":
      return "Some values are outside the allowed range.";
    case "23505":
      return "That already exists.";
    default:
      return "Something went wrong. Please try again.";
  }
}
