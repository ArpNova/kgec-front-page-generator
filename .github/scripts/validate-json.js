#!/usr/bin/env node
// Recursively validates that every *.json file in the repo parses as valid JSON.
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const IGNORE_DIRS = new Set(["node_modules", ".git", "_site"]);

function findJsonFiles(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      findJsonFiles(fullPath, results);
    } else if (entry.endsWith(".json")) {
      results.push(fullPath);
    }
  }
  return results;
}

const root = process.cwd();
const files = findJsonFiles(root);
let hasErrors = false;

for (const file of files) {
  const rel = relative(root, file);
  try {
    JSON.parse(readFileSync(file, "utf8"));
    console.log(`OK   ${rel}`);
  } catch (err) {
    hasErrors = true;
    console.error(`FAIL ${rel}: ${err.message}`);
  }
}

if (hasErrors) {
  console.error(`\nJSON validation failed.`);
  process.exit(1);
}

console.log(`\nValidated ${files.length} JSON file(s) successfully.`);
