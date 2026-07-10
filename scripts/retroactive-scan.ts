#!/usr/bin/env bun
/**
 * Retroactive Threat Scan — audits existing Oracle learnings for injection patterns.
 * Read-only: reports findings without modifying any files.
 *
 * Usage: bun scripts/retroactive-scan.ts [--fix]
 *   Default: audit mode (report only)
 *   --fix: sanitize invisible unicode in-place (does NOT delete blocked content)
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import { scanContent, sanitizeOutput } from "../src/security/threat-scanner";

const LEARNINGS_DIR = process.argv[2] && !process.argv[2].startsWith("--")
  ? process.argv[2]
  : join(import.meta.dir, "..", "ψ", "memory", "learnings");
const FIX_MODE = process.argv.includes("--fix");

interface Finding {
  file: string;
  threats: { name: string; severity: string; match: string }[];
  hasInvisibleUnicode: boolean;
}

function scanDirectory(dir: string): Finding[] {
  const findings: Finding[] = [];
  let scanned = 0;
  let files: string[];

  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    console.error(`Cannot read directory: ${dir}`);
    return [];
  }

  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const stat = statSync(filePath);
      if (!stat.isFile()) continue;
    } catch {
      continue;
    }

    const content = readFileSync(filePath, "utf-8");
    scanned++;

    const result = scanContent(content, "retroactive-scan");
    const sanitized = sanitizeOutput(content);
    const hasInvisible = sanitized !== content;

    if (!result.safe || hasInvisible) {
      findings.push({
        file,
        threats: result.threats.map((t) => ({
          name: t.name,
          severity: t.severity,
          match: t.match,
        })),
        hasInvisibleUnicode: hasInvisible,
      });

      if (FIX_MODE && hasInvisible && result.safe) {
        writeFileSync(filePath, sanitized, "utf-8");
      }
    }
  }

  console.log(`Scanned: ${scanned} files`);
  return findings;
}

// Run scan
console.log(`\n=== Retroactive Threat Scan ===`);
console.log(`Mode: ${FIX_MODE ? "FIX (sanitize invisible unicode)" : "AUDIT (report only)"}`);
console.log(`Directory: ${LEARNINGS_DIR}\n`);

const findings = scanDirectory(LEARNINGS_DIR);

if (findings.length === 0) {
  console.log("✅ No threats found in existing content.");
} else {
  console.log(`\n⚠️  Found ${findings.length} file(s) with issues:\n`);

  const blocked = findings.filter((f) => f.threats.length > 0);
  const invisibleOnly = findings.filter(
    (f) => f.threats.length === 0 && f.hasInvisibleUnicode
  );

  if (blocked.length > 0) {
    console.log(`🔴 Injection patterns detected (${blocked.length} files):`);
    for (const f of blocked) {
      console.log(`  ${f.file}`);
      for (const t of f.threats) {
        console.log(`    - [${t.severity}] ${t.name}: "${t.match}"`);
      }
    }
  }

  if (invisibleOnly.length > 0) {
    console.log(
      `\n🟡 Invisible unicode only (${invisibleOnly.length} files)${FIX_MODE ? " — FIXED" : ""}:`
    );
    for (const f of invisibleOnly.slice(0, 20)) {
      console.log(`  ${f.file}`);
    }
    if (invisibleOnly.length > 20) {
      console.log(`  ... and ${invisibleOnly.length - 20} more`);
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total scanned: ${findings.length > 0 ? "see above" : 0}`);
  console.log(`Injection patterns: ${blocked.length}`);
  console.log(`Invisible unicode: ${invisibleOnly.length}`);
  if (FIX_MODE) {
    console.log(`Fixed (invisible unicode stripped): ${invisibleOnly.length}`);
    console.log(
      `NOT fixed (injection patterns — needs human review): ${blocked.length}`
    );
  }
}
