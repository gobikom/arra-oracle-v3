/**
 * check-wiki self-test: every rule must turn a planted defect red, and a clean
 * wiki must stay green (agent-devops#1205).
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawnSync } from "child_process";
import { checkTree, checkChange, isRealDate, parseFrontmatter } from "../check-wiki";

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
    expect(checkChange(root, "main").join("\n")).toContain("without a wiki/log.md entry");
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
