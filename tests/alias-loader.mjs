// Lets `node --test` resolve the "@/..." path alias used in src/ (tsconfig "paths").
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { resolve as resolvePath } from "node:path";

const SRC = resolvePath(import.meta.dirname, "../src");

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = resolvePath(SRC, specifier.slice(2));
    for (const candidate of [`${base}.ts`, `${base}.tsx`, resolvePath(base, "index.ts")]) {
      if (existsSync(candidate)) return next(pathToFileURL(candidate).href, context);
    }
  }
  return next(specifier, context);
}
