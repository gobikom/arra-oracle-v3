import { readFileSync, appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

interface ThreatPattern {
  name: string;
  regex: string;
  flags: string;
  severity: "critical" | "high" | "medium";
  description: string;
}

export interface ThreatMatch {
  name: string;
  severity: "critical" | "high" | "medium";
  description: string;
  match: string;
  inCodeBlock?: boolean;
}

export interface ScanResult {
  safe: boolean;
  threats: ThreatMatch[];
  sanitized: string;
}

const patternsPath = join(import.meta.dir ?? __dirname, "threat-patterns.json");
const rawPatterns: ThreatPattern[] = JSON.parse(readFileSync(patternsPath, "utf-8"));

const compiledPatterns = rawPatterns.map((p) => ({
  ...p,
  compiled: new RegExp(p.regex, p.flags),
}));

const INVISIBLE_UNICODE = /[​-‏﻿‪-‮⁦-⁩]/g;
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
const CODE_FENCE_RE = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`]+`/g;

function extractCodeBlocks(text: string): { outside: string; inside: string } {
  const blocks: string[] = [];
  const outside = text.replace(CODE_FENCE_RE, (m) => {
    blocks.push(m);
    return "";
  });
  return { outside, inside: blocks.join("\n") };
}

export function scanContent(text: string, source?: string): ScanResult {
  const { outside, inside } = extractCodeBlocks(text);
  const threats: ThreatMatch[] = [];

  for (const pattern of compiledPatterns) {
    const mOutside = outside.match(pattern.compiled);
    if (mOutside) {
      threats.push({
        name: pattern.name,
        severity: pattern.severity,
        description: pattern.description,
        match: mOutside[0].substring(0, 50),
      });
      continue;
    }
    if (pattern.severity === "critical") {
      const mInside = inside.match(pattern.compiled);
      if (mInside) {
        threats.push({
          name: pattern.name,
          severity: pattern.severity,
          description: pattern.description,
          match: mInside[0].substring(0, 50),
          inCodeBlock: true,
        });
      }
    }
  }

  return {
    safe: threats.length === 0,
    threats,
    sanitized: sanitizeOutput(text),
  };
}

export function sanitizeOutput(text: string): string {
  return text.replace(INVISIBLE_UNICODE, "").replace(CONTROL_CHARS, "");
}

export function logThreatBlock(text: string, threats: ThreatMatch[], source: string): void {
  try {
    const logDir = join(import.meta.dir ?? __dirname, "..", "..", "ψ", "security");
    mkdirSync(logDir, { recursive: true });
    const logFile = join(logDir, "threat-scan.log");
    const ts = new Date().toISOString();
    const preview = sanitizeOutput(text.substring(0, 100).replace(/\n/g, " "));
    const names = threats.map((t) => t.name).join(",");
    appendFileSync(logFile, `${ts} | ${source} | ${names} | ${preview}\n`);
  } catch {
    // audit log is best-effort — never block the write-path response
  }
}
