/**
 * Wiki checker — gives docs-only wiki PRs a CI check that actually reads them
 * (agent-devops#1205). Run: bun src/wiki/check-wiki.ts [--base <git-ref>]
 *
 * Always (whole tree):
 *   - every page except wiki/log.md has frontmatter with title, type, status,
 *     updated (a real YYYY-MM-DD date, not in the future)
 *   - projects/*.md also have project and an integer oracle_entries >= 0
 *   - every relative markdown link resolves to an existing file
 *   - every *.json under wiki/ parses
 * With --base (pull requests), on the files changed since the merge base:
 *   - a changed page needs a wiki/log.md change in the same PR
 *   - wiki/log.md is append-only (no removed lines)
 *   - a changed page's `updated:` never goes backwards
 *
 * Exit 0 = clean, 1 = problems found (each printed), 2 = cannot run.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { spawnSync } from "child_process";

const STATUSES = new Set(["active", "archived", "draft", "deprecated"]);
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type Frontmatter = Record<string, string>;

/** Top-level `key: value` pairs of a leading `---` block, or null when absent. */
export function parseFrontmatter(text: string): Frontmatter | null {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end === -1) return null;
  const fm: Frontmatter = {};
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (m) fm[m[1]] = m[2].trim();
  }
  return fm;
}

export function isRealDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Problems in the wiki tree under `root` (repo root). `today` is YYYY-MM-DD. */
export function checkTree(root: string, today: string): string[] {
  const wiki = join(root, "wiki");
  if (!existsSync(wiki)) return [`wiki/ not found under ${root}`];
  const errors: string[] = [];
  const files = walk(wiki);
  if (!files.some((f) => f.endsWith(".md"))) errors.push("wiki/ has no .md files");

  for (const file of files) {
    const rel = relative(root, file);
    const text = readFileSync(file, "utf-8");

    if (file.endsWith(".json")) {
      try { JSON.parse(text); } catch (e) { errors.push(`${rel}: invalid JSON (${(e as Error).message})`); }
      continue;
    }
    if (!file.endsWith(".md")) continue;

    if (rel !== join("wiki", "log.md")) {
      const fm = parseFrontmatter(text);
      if (!fm) {
        errors.push(`${rel}: missing frontmatter (--- block at line 1)`);
      } else {
        for (const key of ["title", "type", "status", "updated"]) {
          if (!fm[key]) errors.push(`${rel}: frontmatter is missing "${key}"`);
        }
        if (fm.status && !STATUSES.has(fm.status)) {
          errors.push(`${rel}: status "${fm.status}" is not one of ${[...STATUSES].join(", ")}`);
        }
        if (fm.updated) {
          if (!isRealDate(fm.updated)) errors.push(`${rel}: updated "${fm.updated}" is not a real YYYY-MM-DD date`);
          else if (fm.updated > today) errors.push(`${rel}: updated ${fm.updated} is in the future (today ${today})`);
        }
        if (rel.startsWith(join("wiki", "projects") + "/")) {
          if (!fm.project) errors.push(`${rel}: frontmatter is missing "project"`);
          if (!/^\d+$/.test(fm.oracle_entries ?? "")) {
            errors.push(`${rel}: oracle_entries "${fm.oracle_entries ?? ""}" is not a non-negative integer`);
          }
        }
      }
    }

    // Relative links: [text](target) — skip URLs, mail, pure anchors.
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1].split("#")[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      if (!existsSync(resolve(dirname(file), target))) errors.push(`${rel}: broken link -> ${m[1]}`);
    }
  }
  return errors;
}

function git(root: string, args: string[]): string {
  const r = spawnSync("git", ["-C", root, ...args], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || "").trim()}`);
  return r.stdout;
}

/** Problems in the change from merge-base(base, HEAD) to HEAD. */
export function checkChange(root: string, base: string): string[] {
  const errors: string[] = [];
  const mb = git(root, ["merge-base", base, "HEAD"]).trim();
  const changed = git(root, ["diff", "--name-only", "--diff-filter=AMR", mb, "HEAD", "--", "wiki/"])
    .split("\n").filter(Boolean);
  const pages = changed.filter((f) => f.endsWith(".md") && f !== "wiki/log.md");

  if (pages.length > 0 && !changed.includes("wiki/log.md")) {
    errors.push(`wiki pages changed without a wiki/log.md entry: ${pages.join(", ")}`);
  }

  const logDiff = git(root, ["diff", "--unified=0", mb, "HEAD", "--", "wiki/log.md"]);
  const removed = logDiff.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
  if (removed.length > 0) {
    errors.push(`wiki/log.md is append-only, but ${removed.length} line(s) were removed or edited: ${removed[0].slice(0, 120)}`);
  }

  for (const page of pages) {
    const shown = spawnSync("git", ["-C", root, "show", `${mb}:${page}`], { encoding: "utf-8" });
    if (shown.status !== 0) continue; // new page: nothing to compare
    const before = parseFrontmatter(shown.stdout)?.updated;
    const after = parseFrontmatter(readFileSync(join(root, page), "utf-8"))?.updated;
    if (before && after && isRealDate(before) && isRealDate(after) && after < before) {
      errors.push(`${page}: updated went backwards (${before} -> ${after})`);
    }
  }
  return errors;
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../..");
  const i = process.argv.indexOf("--base");
  const base = i > -1 ? process.argv[i + 1] : undefined;
  if (i > -1 && !base) { console.error("usage: check-wiki.ts [--base <git-ref>]"); process.exit(2); }
  const today = new Date().toISOString().slice(0, 10);
  let errors: string[];
  try {
    errors = checkTree(root, today);
    if (base) errors.push(...checkChange(root, base));
  } catch (e) {
    console.error(`check-wiki: cannot run: ${(e as Error).message}`);
    process.exit(2);
  }
  for (const e of errors) console.log(`FAIL ${e}`);
  console.log(`check-wiki: ${errors.length === 0 ? "OK" : `${errors.length} problem(s)`}${base ? ` (tree + change vs ${base})` : " (tree)"}`);
  process.exit(errors.length === 0 ? 0 : 1);
}
