import { readFileSync } from "fs";
import { join } from "path";

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

function stripCodeBlocks(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/`[^`]+`/g, "");
}

export function scanContent(text: string, source?: string): ScanResult {
  const stripped = stripCodeBlocks(text);
  const threats: ThreatMatch[] = [];

  for (const pattern of compiledPatterns) {
    const m = stripped.match(pattern.compiled);
    if (m) {
      threats.push({
        name: pattern.name,
        severity: pattern.severity,
        description: pattern.description,
        match: m[0].substring(0, 50),
      });
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
