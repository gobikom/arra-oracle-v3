#!/usr/bin/env python3
"""
wiki-refresh.py — enrich Oracle wiki project pages with CK code intelligence.

Reads each wiki/projects/*.md page, extracts the repo slug from frontmatter,
calls `ck onboard` + `ck hotspots` to get code structure, and merges auto
sections into the page while preserving manual sections verbatim.

Usage:
  python3 scripts/wiki-refresh.py [--dry-run] [--repo <name>]
"""
import sys
import json
import re
import subprocess
from pathlib import Path
from datetime import date

WIKI_DIR = Path(__file__).parent.parent / "wiki" / "projects"
LOG_FILE = Path(__file__).parent.parent / "wiki" / "log.md"
CK_BIN = Path.home() / "ops" / "bin" / "ck"

AUTO_MARKER = "(auto — CK"


def parse_frontmatter(content: str) -> dict:
    m = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).split("\n"):
        if ":" in line:
            key, val = line.split(":", 1)
            fm[key.strip()] = val.strip()
    return fm


def extract_repo_slug(fm: dict) -> str | None:
    sources = fm.get("sources", "") or fm.get("project", "")
    m = re.search(r"github\.com/[^/]+/([a-zA-Z0-9._-]+)", sources)
    if m:
        return m.group(1).rstrip(")")
    project = fm.get("project", "")
    m2 = re.search(r"github\.com/[^/]+/([a-zA-Z0-9._-]+)", project)
    return m2.group(1) if m2 else None


def run_ck(subcmd: str, repo: str) -> dict | None:
    if not CK_BIN.exists():
        return None
    try:
        r = subprocess.run(
            [str(CK_BIN), subcmd, repo],
            capture_output=True, text=True, timeout=30,
        )
        if r.returncode != 0:
            return None
        return json.loads(r.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError):
        return None


def format_onboard(data: dict) -> str:
    summary = data.get("summary", "")
    lines = summary.split("\n")
    structure_lines = []
    entry_lines = []
    section = None
    for line in lines:
        if line.startswith("## Structure"):
            section = "structure"
            continue
        elif line.startswith("## Entry Points"):
            section = "entry"
            continue
        elif line.startswith("## "):
            section = None
            continue
        if section == "structure" and line.strip():
            structure_lines.append(line)
        elif section == "entry" and line.strip():
            entry_lines.append(line)

    parts = []
    if structure_lines:
        parts.append(
            f"## Code Structure {AUTO_MARKER}, refreshed {date.today()})\n\n"
            + "\n".join(structure_lines[:15])
        )
    if entry_lines:
        parts.append(
            f"## Entry Points {AUTO_MARKER})\n\n"
            + "\n".join(entry_lines[:10])
        )
    return "\n\n".join(parts)


def format_hotspots(data: dict) -> str:
    nodes = data.get("nodes", [])
    if not nodes:
        return ""
    rows = []
    for n in nodes[:5]:
        name = n.get("file", n.get("name", "?"))
        conns = n.get("connections", 0)
        freq = n.get("change_freq", 0)
        rows.append(f"- `{name}` — {conns} connections, change_freq={freq}")
    return f"## Hotspots {AUTO_MARKER})\n\n" + "\n".join(rows)


def split_sections(content: str) -> tuple[str, list[tuple[str, str, bool]]]:
    fm_match = re.match(r"^(---\n.*?\n---\n)", content, re.DOTALL)
    frontmatter = fm_match.group(1) if fm_match else ""
    body = content[len(frontmatter):]

    sections = []
    current_heading = ""
    current_lines: list[str] = []
    for line in body.split("\n"):
        if re.match(r"^## ", line):
            if current_heading or current_lines:
                is_auto = AUTO_MARKER in current_heading
                sections.append((current_heading, "\n".join(current_lines), is_auto))
            current_heading = line
            current_lines = []
        else:
            current_lines.append(line)
    if current_heading or current_lines:
        is_auto = AUTO_MARKER in current_heading
        sections.append((current_heading, "\n".join(current_lines), is_auto))

    return frontmatter, sections


def merge_ck_sections(content: str, ck_text: str) -> str:
    if not ck_text.strip():
        return content
    frontmatter, sections = split_sections(content)

    manual_sections = [(h, b) for h, b, auto in sections if not auto]
    ck_sections = []
    for block in ck_text.split("\n## "):
        block = block.strip()
        if not block:
            continue
        if not block.startswith("## "):
            block = "## " + block
        lines = block.split("\n", 1)
        heading = lines[0]
        body = lines[1] if len(lines) > 1 else ""
        ck_sections.append((heading, body))

    title_section = None
    other_manual = []
    for h, b in manual_sections:
        if h.startswith("# ") and not h.startswith("## "):
            title_section = (h, b)
        elif not h and not other_manual:
            title_section = (h, b)
        else:
            other_manual.append((h, b))

    parts = [frontmatter.rstrip("\n")]
    if title_section:
        parts.append(f"{title_section[0]}\n{title_section[1]}".rstrip())

    for h, b in ck_sections:
        parts.append(f"{h}\n{b}".rstrip())

    for h, b in other_manual:
        parts.append(f"{h}\n{b}".rstrip())

    return "\n\n".join(parts) + "\n"


def update_frontmatter_date(content: str) -> str:
    today = date.today().isoformat()
    return re.sub(r"^(updated:\s*).*$", rf"\g<1>{today}", content, count=1, flags=re.MULTILINE)


def process_page(page_path: Path, dry_run: bool = False) -> str | None:
    content = page_path.read_text()
    fm = parse_frontmatter(content)
    slug = extract_repo_slug(fm)
    if not slug:
        return None

    onboard = run_ck("onboard", slug)
    if not onboard:
        return None

    hotspots_data = run_ck("hotspots", slug)

    ck_text = format_onboard(onboard)
    if hotspots_data:
        hs = format_hotspots(hotspots_data)
        if hs:
            ck_text += "\n\n" + hs

    if not ck_text.strip():
        return None

    new_content = merge_ck_sections(content, ck_text)
    new_content = update_frontmatter_date(new_content)

    if new_content == content:
        return None

    if dry_run:
        print(f"  [DRY-RUN] Would update: {page_path.name} (repo: {slug})")
        return slug

    page_path.write_text(new_content)
    return slug


def append_log(slugs: list[str]):
    today = date.today().isoformat()
    entry = f"- {today} wiki-refresh: CK enrichment — {', '.join(slugs)}\n"
    with open(LOG_FILE, "a") as f:
        f.write(entry)


def main():
    dry_run = "--dry-run" in sys.argv
    repo_filter = None
    if "--repo" in sys.argv:
        idx = sys.argv.index("--repo")
        if idx + 1 < len(sys.argv):
            repo_filter = sys.argv[idx + 1]

    if not WIKI_DIR.exists():
        print(f"ERROR: wiki directory not found: {WIKI_DIR}", file=sys.stderr)
        sys.exit(1)

    if not CK_BIN.exists():
        print(f"ERROR: ck binary not found: {CK_BIN}", file=sys.stderr)
        sys.exit(1)

    pages = sorted(WIKI_DIR.glob("*.md"))
    updated = []

    for page in pages:
        if repo_filter:
            fm = parse_frontmatter(page.read_text())
            slug = extract_repo_slug(fm)
            if slug != repo_filter:
                continue

        slug = process_page(page, dry_run=dry_run)
        if slug:
            updated.append(slug)
            print(f"  {'[DRY-RUN] ' if dry_run else ''}Updated: {page.name} (repo: {slug})")
        else:
            print(f"  Skipped: {page.name}")

    if updated and not dry_run:
        append_log(updated)

    print(f"\n{'[DRY-RUN] ' if dry_run else ''}Summary: {len(updated)}/{len(pages)} pages enriched")


if __name__ == "__main__":
    main()
