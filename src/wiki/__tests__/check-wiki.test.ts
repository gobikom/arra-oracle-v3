/**
 * check-wiki self-test: every rule must turn a planted defect red, and a clean
 * wiki must stay green (agent-devops#1205).
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { checkTree, checkChange, isRealDate, latestToday, parseFrontmatter } from "../check-wiki";

const TODAY = "2026-10-03";
const PAGE = (updated = "2026-10-01", extra = "") =>
  `---\ntitle: Demo\ntype: wiki\nstatus: active\nupdated: ${updated}\noracle_entries: 3\nproject: github.com/x/demo\n${extra}---\n\n# Demo\n\nSee [services](../systems/services.md).\n`;
const SYSTEM = `---\ntitle: Services\ntype: wiki\nstatus: active\nupdated: 2026-09-01\n---\n\n# Services\n`;

let root: string;
const w = (p: string, s: string) => { mkdirSync(join(root, p, ".."), { recursive: true }); writeFileSync(join(root, p), s); };
const git = (...a: string[]) => {
  const r = spawnSync("git", ["-C", root, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.hooksPath=/dev/null", ...a], { encoding: "utf-8" });
  if (r.status !== 0) throw new Error(r.stderr);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "check-wiki-"));
  w("wiki/projects/demo.md", PAGE());
  w("wiki/systems/services.md", SYSTEM);
  w("wiki/log.md", "# Wiki Change Log\n\n- 2026-10-01: demo — created\n");
  w("wiki/metrics.json", '{"entries": []}');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("checkTree", () => {
  test("a clean wiki is green", () => {
    expect(checkTree(root, TODAY)).toEqual([]);
  });
  test("missing frontmatter is red", () => {
    w("wiki/projects/demo.md", "# no frontmatter\n");
    expect(checkTree(root, TODAY).join("\n")).toContain("missing frontmatter");
  });
  test("a missing required key is red", () => {
    w("wiki/systems/services.md", SYSTEM.replace("title: Services\n", ""));
    expect(checkTree(root, TODAY).join("\n")).toContain('missing "title"');
  });
  test("an impossible or future date is red", () => {
    w("wiki/projects/demo.md", PAGE("2026-02-30"));
    expect(checkTree(root, TODAY).join("\n")).toContain("not a real YYYY-MM-DD date");
    w("wiki/projects/demo.md", PAGE("2026-12-01"));
    expect(checkTree(root, TODAY).join("\n")).toContain("in the future");
  });
  test("a non-integer oracle_entries on a project page is red", () => {
    w("wiki/projects/demo.md", PAGE().replace("oracle_entries: 3", "oracle_entries: lots"));
    expect(checkTree(root, TODAY).join("\n")).toContain("oracle_entries");
  });
  test("an unknown status is red", () => {
    w("wiki/projects/demo.md", PAGE().replace("status: active", "status: wip"));
    expect(checkTree(root, TODAY).join("\n")).toContain('status "wip"');
  });
  test("a broken relative link is red; URLs and anchors are not checked", () => {
    w("wiki/projects/demo.md", PAGE() + "\n[x](nope.md) [u](https://example.com/a) [a](#top)\n");
    const errs = checkTree(root, TODAY);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain("broken link -> nope.md");
  });
  test("invalid JSON is red", () => {
    w("wiki/metrics.json", "{nope");
    expect(checkTree(root, TODAY).join("\n")).toContain("invalid JSON");
  });
  test("log.md needs no frontmatter", () => {
    expect(checkTree(root, TODAY).join("\n")).not.toContain("log.md");
  });
  test("titled and <angle> links are checked; an existing <angle> target is fine", () => {
    w("wiki/systems/a b.md", SYSTEM);
    w("wiki/projects/demo.md", PAGE() + '\n[t](nope.md "title") [ok](<../systems/a b.md>) [bad](<gone file.md>)\n');
    const errs = checkTree(root, TODAY).join("\n");
    expect(errs).toContain("broken link -> nope.md");
    expect(errs).toContain("broken link -> gone file.md");
    expect(errs).not.toContain("a b.md");
  });
  test("a reference-style link definition is checked", () => {
    w("wiki/projects/demo.md", PAGE() + "\nSee [c][r].\n\n[r]: nope3.md\n");
    expect(checkTree(root, TODAY).join("\n")).toContain("broken link -> nope3.md");
  });
  test("links inside fenced or inline code are not links", () => {
    w("wiki/projects/demo.md", PAGE() + "\n```md\n[g](gone.md)\n```\n`[h](gone2.md)`\n");
    expect(checkTree(root, TODAY)).toEqual([]);
  });
  test("an upper-case .MD page is checked; an unexpected file type is red", () => {
    w("wiki/patterns/Bad.MD", "# no frontmatter\n");
    w("wiki/patterns/x.markdown", "# hidden\n");
    const errs = checkTree(root, TODAY).join("\n");
    expect(errs).toContain("Bad.MD: missing frontmatter");
    expect(errs).toContain("x.markdown: unexpected file type");
  });
  test("a line starting with ```inline``` code is not a fence; links after it are checked", () => {
    w("wiki/projects/demo.md", PAGE() + "\n```foo``` inline code at line start\n[bad](gone.md)\n");
    expect(checkTree(root, TODAY).join("\n")).toContain("broken link -> gone.md");
  });
  test("HTML href/src and blockquoted reference definitions are checked; footnotes are not links", () => {
    w("wiki/projects/demo.md", PAGE() + '\n<a href="gone1.md">a</a> <img src="gone2.png">\n> [r]: gone3.md\n\n[^1]: a footnote, not a link\n');
    const errs = checkTree(root, TODAY).join("\n");
    for (const t of ["gone1.md", "gone2.png", "gone3.md"]) expect(errs).toContain(`broken link -> ${t}`);
    expect(errs).not.toContain("footnote");
  });
  test(".gitkeep is allowed", () => {
    w("wiki/patterns/.gitkeep", "");
    expect(checkTree(root, TODAY)).toEqual([]);
  });
});

describe("latestToday", () => {
  test("is the UTC+14 date, so a Bangkok date before 07:00 is never 'future'", () => {
    // 2026-10-03T20:30Z is 2026-10-04 03:30 in Bangkok
    expect(latestToday(new Date("2026-10-03T20:30:00Z"))).toBe("2026-10-04");
    expect(latestToday(new Date("2026-10-03T05:00:00Z"))).toBe("2026-10-03");
  });
});

describe("checkChange (PR mode)", () => {
  beforeEach(() => { git("init", "-q", "-b", "main"); git("add", "-A"); git("commit", "-qm", "base"); git("checkout", "-qb", "pr"); });
  const commit = () => { git("add", "-A"); git("commit", "-qm", "pr"); };

  test("a page change with a log entry is green", () => {
    w("wiki/projects/demo.md", PAGE("2026-10-02"));
    appendFileSync(join(root, "wiki/log.md"), "- 2026-10-02: demo — updated\n");
    commit();
    expect(checkChange(root, "main")).toEqual([]);
  });
  test("a page change without a log entry is red", () => {
    w("wiki/projects/demo.md", PAGE("2026-10-02"));
    commit();
    expect(checkChange(root, "main").join("\n")).toContain("without a non-blank wiki/log.md entry");
  });
  test("removing or editing a log line is red", () => {
    w("wiki/log.md", "# Wiki Change Log\n\n- 2026-10-01: demo — rewritten history\n");
    commit();
    expect(checkChange(root, "main").join("\n")).toContain("append-only");
  });
  test("updated going backwards is red", () => {
    w("wiki/projects/demo.md", PAGE("2026-09-01"));
    appendFileSync(join(root, "wiki/log.md"), "- 2026-10-02: demo — oops\n");
    commit();
    expect(checkChange(root, "main").join("\n")).toContain("went backwards");
  });
  test("an unknown base ref is an error, never clean", () => {
    expect(() => checkChange(root, "no-such-ref")).toThrow();
  });
  test("a blank line is not a log entry", () => {
    w("wiki/projects/demo.md", PAGE("2026-10-02"));
    appendFileSync(join(root, "wiki/log.md"), "\n   \n");
    commit();
    expect(checkChange(root, "main").join("\n")).toContain("without a non-blank wiki/log.md entry");
  });
  test("deleting a page needs a log entry too", () => {
    rmSync(join(root, "wiki/systems/services.md"));
    w("wiki/projects/demo.md", PAGE().replace("See [services](../systems/services.md).", ""));
    w("wiki/log.md", "# Wiki Change Log\n\n- 2026-10-01: demo — created\n");
    commit();
    const errs = checkChange(root, "main").join("\n");
    expect(errs).toContain("D wiki/systems/services.md");
  });
  test("removing a log line that starts with --- is still red", () => {
    git("checkout", "-q", "main");
    appendFileSync(join(root, "wiki/log.md"), "--- separator\n");
    git("commit", "-qam", "sep");
    git("checkout", "-qB", "pr");
    w("wiki/log.md", "# Wiki Change Log\n\n- 2026-10-01: demo — created\n");
    commit();
    expect(checkChange(root, "main").join("\n")).toContain("append-only");
  });
  test("a renamed page's updated is compared with its old path", () => {
    git("mv", "wiki/projects/demo.md", "wiki/projects/demo2.md");
    w("wiki/projects/demo2.md", PAGE("2020-01-01"));
    appendFileSync(join(root, "wiki/log.md"), "- 2026-10-02: demo renamed\n");
    commit();
    expect(checkChange(root, "main").join("\n")).toContain("demo2.md: updated went backwards (2026-10-01 -> 2020-01-01)");
  });
});

describe("helpers", () => {
  test("isRealDate", () => {
    expect(isRealDate("2026-10-03")).toBe(true);
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2026-1-3")).toBe(false);
  });
  test("parseFrontmatter needs a closing ---", () => {
    expect(parseFrontmatter("---\ntitle: x\n")).toBeNull();
    expect(parseFrontmatter("---\ntitle: x\n---\n")).toEqual({ title: "x" });
  });
});
