/**
 * Wiki checker — gives docs-only wiki PRs a CI check that actually reads them
 * (agent-devops#1205). Run: bun src/wiki/check-wiki.ts [--base <git-ref>]
 *
 * Always (whole tree):
 *   - every file under wiki/ is .md, .json or .gitkeep (any other is red, so
 *     nothing is skipped unseen; extensions match case-insensitively)
 *   - every page except wiki/log.md has frontmatter with title, type, status,
 *     updated (a real YYYY-MM-DD date, not in the future in any timezone)
 *   - projects/*.md also have project and an integer oracle_entries >= 0
 *   - every relative link resolves (inline, <angle>, "titled", reference-style;
 *     fenced code is ignored)
 *   - every *.json under wiki/ parses
 * With --base (pull requests), on the change since the merge base:
 *   - a changed, added, renamed or deleted page needs a non-blank line added
 *     to wiki/log.md in the same PR
 *   - wiki/log.md is append-only (no removed or edited lines)
 *   - a page's `updated:` never goes backwards (renames compare the old path)
 *
 * Exit 0 = clean, 1 = problems found (each printed), 2 = cannot run.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { spawnSync } from "child_process";

const STATUSES = new Set(["active", "archived", "draft", "deprecated"]);
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOG = "wiki/log.md";

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

/** The latest calendar date anywhere on Earth right now (UTC+14), so a page
 *  stamped with a local date ahead of UTC (e.g. Bangkok before 07:00) is not "future". */
export function latestToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 14 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Relative link targets in markdown, outside fenced code blocks. */
export function linkTargets(text: string): string[] {
  const out: string[] = [];
  let fence: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    const f = /^\s*(```|~~~)/.exec(line);
    if (f) { fence = fence === null ? f[1] : fence === f[1] ? null : fence; continue; }
    if (fence !== null) continue;
    const prose = line.replace(/`[^`]*`/g, ""); // inline code is not a link
    // inline: ](target) / ](<target with spaces>) / ](target "title")
    for (const m of prose.matchAll(/\]\(\s*(?:<([^>]+)>|([^)\s]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g)) {
      out.push(m[1] ?? m[2]);
    }
    // reference definition: [label]: target
    const ref = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))/.exec(prose);
    if (ref) out.push(ref[1] ?? ref[2]);
  }
  return out;
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
  if (!files.some((f) => /\.md$/i.test(f))) errors.push("wiki/ has no .md files");

  for (const file of files) {
    const rel = relative(root, file);
    if (/(^|\/)\.gitkeep$/.test(rel)) continue;
    if (!/\.(md|json)$/i.test(rel)) { errors.push(`${rel}: unexpected file type under wiki/ (only .md, .json, .gitkeep)`); continue; }
    const text = readFileSync(file, "utf-8");

    if (/\.json$/i.test(rel)) {
      try { JSON.parse(text); } catch (e) { errors.push(`${rel}: invalid JSON (${(e as Error).message})`); }
      continue;
    }

    if (rel !== LOG) {
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
          else if (fm.updated > today) errors.push(`${rel}: updated ${fm.updated} is in the future (latest date today: ${today})`);
        }
        if (rel.startsWith("wiki/projects/")) {
          if (!fm.project) errors.push(`${rel}: frontmatter is missing "project"`);
          if (!/^\d+$/.test(fm.oracle_entries ?? "")) {
            errors.push(`${rel}: oracle_entries "${fm.oracle_entries ?? ""}" is not a non-negative integer`);
          }
        }
      }
    }

    for (const raw of linkTargets(text)) {
      const target = raw.split("#")[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // URL, mailto:, pure anchor
      let path = target;
      try { path = decodeURIComponent(target); } catch { /* keep raw */ }
      if (!existsSync(resolve(dirname(file), path))) errors.push(`${rel}: broken link -> ${raw}`);
    }
  }
  return errors;
}

function git(root: string, args: string[]): string {
  const r = spawnSync("git", ["-C", root, ...args], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || "").trim()}`);
  return r.stdout;
}

/** Content lines of a unified diff (after the first hunk header), split by sign. */
function diffLines(diff: string): { added: string[]; removed: string[] } {
  const added: string[] = [];
  const removed: string[] = [];
  let inHunk = false;
  for (const line of diff.split("\n")) {
    if (line.startsWith("@@")) { inHunk = true; continue; }
    if (!inHunk) continue;
    if (line.startsWith("diff --git")) { inHunk = false; continue; }
    if (line.startsWith("+")) added.push(line.slice(1));
    else if (line.startsWith("-")) removed.push(line.slice(1));
  }
  return { added, removed };
}

/** Problems in the change from merge-base(base, HEAD) to HEAD. */
export function checkChange(root: string, base: string): string[] {
  const errors: string[] = [];
  const mb = git(root, ["merge-base", base, "HEAD"]).trim();

  // status<TAB>path, or R<score><TAB>old<TAB>new for renames
  const entries = git(root, ["diff", "--name-status", "-M", "-z", mb, "HEAD", "--", "wiki/"]).split("\0");
  type Change = { status: string; path: string; old?: string };
  const changes: Change[] = [];
  for (let i = 0; i < entries.length - 1; ) {
    const status = entries[i++];
    if (/^[RC]/.test(status)) { const old = entries[i++]; changes.push({ status: status[0], old, path: entries[i++] }); }
    else changes.push({ status: status[0], path: entries[i++] });
  }

  const pages = changes.filter((c) => /\.md$/i.test(c.path) && c.path !== LOG);
  const log = diffLines(git(root, ["diff", "--unified=0", mb, "HEAD", "--", LOG]));

  if (pages.length > 0 && !log.added.some((l) => l.trim() !== "")) {
    errors.push(`wiki pages changed without a non-blank wiki/log.md entry: ${pages.map((c) => `${c.status} ${c.path}`).join(", ")}`);
  }
  if (log.removed.length > 0) {
    errors.push(`wiki/log.md is append-only, but ${log.removed.length} line(s) were removed or edited: ${log.removed[0].slice(0, 120)}`);
  }

  for (const c of pages) {
    if (c.status === "A" || c.status === "D") continue; // nothing to compare
    const before = parseFrontmatter(git(root, ["show", `${mb}:${c.old ?? c.path}`]))?.updated;
    const after = parseFrontmatter(readFileSync(join(root, c.path), "utf-8"))?.updated;
    if (before && after && isRealDate(before) && isRealDate(after) && after < before) {
      errors.push(`${c.path}: updated went backwards (${before} -> ${after})`);
    }
  }
  return errors;
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../..");
  const i = process.argv.indexOf("--base");
  const base = i > -1 ? process.argv[i + 1] : undefined;
  if (i > -1 && !base) { console.error("usage: check-wiki.ts [--base <git-ref>]"); process.exit(2); }
  let errors: string[];
  try {
    errors = checkTree(root, latestToday());
    if (base) errors.push(...checkChange(root, base));
  } catch (e) {
    console.error(`check-wiki: cannot run: ${(e as Error).message}`);
    process.exit(2);
  }
  for (const e of errors) console.log(`FAIL ${e}`);
  console.log(`check-wiki: ${errors.length === 0 ? "OK" : `${errors.length} problem(s)`}${base ? ` (tree + change vs ${base})` : " (tree)"}`);
  process.exit(errors.length === 0 ? 0 : 1);
}
