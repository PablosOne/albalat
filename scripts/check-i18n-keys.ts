#!/usr/bin/env tsx
/**
 * Checks that every key present in any locale file exists in ALL locale files.
 *
 * Usage:
 *   pnpm exec tsx scripts/check-i18n-keys.ts
 *
 * Exit 0 = all locales are in sync.
 * Exit 1 = missing keys found (prints a diff table).
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const MESSAGES_DIR = join(process.cwd(), "src/i18n");

/** Recursively collect all dot-separated key paths from an object. */
function collectKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      keys.push(...collectKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"));

if (files.length < 2) {
  console.log("Only one locale file found — nothing to compare.");
  process.exit(0);
}

const locales = files.map((file) => {
  const content = readFileSync(join(MESSAGES_DIR, file), "utf8");
  return { locale: file.replace(".json", ""), keys: new Set(collectKeys(JSON.parse(content) as unknown)) };
});

// Union of all keys across every locale.
const allKeys = new Set<string>();
for (const { keys } of locales) {
  for (const k of keys) allKeys.add(k);
}

type MissingMap = Record<string, string[]>;
const missing: MissingMap = {};

for (const key of allKeys) {
  const missingIn = locales.filter(({ keys }) => !keys.has(key)).map(({ locale }) => locale);
  if (missingIn.length > 0) {
    missing[key] = missingIn;
  }
}

const missingKeys = Object.keys(missing);

if (missingKeys.length === 0) {
  console.log(`✓ All ${locales.map((l) => l.locale).join(", ")} locales are in sync (${allKeys.size} keys).`);
  process.exit(0);
}

console.error(`\n✗ Found ${missingKeys.length} key(s) missing from at least one locale:\n`);

const maxKeyLen = Math.max(...missingKeys.map((k) => k.length), 10);
const header = `${"KEY".padEnd(maxKeyLen)}  MISSING IN`;
console.error(header);
console.error("-".repeat(header.length));

for (const key of missingKeys.sort()) {
  console.error(`${key.padEnd(maxKeyLen)}  ${missing[key].join(", ")}`);
}

console.error(`\nAdd the missing keys to the listed locale files to fix this error.\n`);
process.exit(1);
