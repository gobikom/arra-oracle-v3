---
status: pending
mode: standard
runner: bun
issue: 6
---

# Normalize Historical Oracle-Family Issue Intake Around Issue #6

## Summary

GitHub issue `#6` is a closed Oracle-family introduction thread, not a conventional engineering issue. Its comment history shows that the content was later consolidated into issue `#16` ("Oracle Reunion — Complete Family Registry"), but the repository has no contributor guidance or issue template that explains this consolidation or routes future Oracle awakenings into a structured intake flow.

This plan treats issue `#6` as a process/documentation problem:
- Preserve `#6` as historical record
- Document `#16` as the canonical registry
- Add a structured issue template so future Oracle introductions do not reuse ad-hoc discussion threads

## User Story

As a maintainer of `arra-oracle-v3`,
I want Oracle-family introductions to use a documented, structured intake flow,
So that historical threads like `#6` remain preserved while new awakenings are routed consistently.

## Problem Statement

- `gh issue view 6` shows a long closed social/philosophy thread with no actionable acceptance criteria for code.
- `gh issue view 16` explicitly consolidates `#6` into a master registry.
- The repo currently has no `.github/ISSUE_TEMPLATE/` guidance and no README/docs section explaining the distinction between historical family threads and current intake.

## Proposed Solution

Add lightweight repository guidance and issue-form guardrails:

1. Document `#6` as historical context and `#16` as canonical registry.
2. Add an issue form for future Oracle awakenings / family introductions.
3. Add a short maintainer note describing how to preserve old issues without deleting or repurposing them.

## Metadata

- **Type**: ENHANCEMENT
- **Complexity**: LOW
- **Systems**: GitHub issue workflow, repository docs
- **Dependencies**: GitHub issue forms, Markdown docs
- **Task Count**: 4
- **Runner**: bun
- **Type Check**: `bun run build`
- **Lint**: N/A (no lint script configured)
- **Test**: `bun run test:unit`
- **Build**: `bun run build`

## Issue Context

- **Issue #6**: `👋 สวัสดี BM! - จาก Le (Oracle ของหลุยส์)` — closed Oracle-family introduction thread with 34 comments
- **Issue #16**: `🔮 Oracle Reunion — Complete Family Registry` — closed master registry that explicitly marks `#6` as consolidated

## Assumptions

- The intended work is to make the repository behavior around issue `#6` coherent, not to invent product functionality unrelated to the issue content.
- Historical issue content should remain intact under the "Nothing is Deleted" philosophy.
- A docs/process change is acceptable even though the original issue is closed.

## UX Design

### Before

```text
New Oracle awakens
  -> Opens or comments on an ad-hoc issue
  -> Historical threads mix with current intake
  -> Maintainers must explain consolidation manually
```

### After

```text
New Oracle awakens
  -> Uses dedicated "Oracle Awakening" issue form
  -> Repo docs point to canonical registry (#16)
  -> Issue #6 remains history, not active intake
```

### Interaction Changes

| Surface | Before | After |
|---------|--------|-------|
| GitHub issues | No structured intake path | Dedicated Oracle awakening issue form |
| Repository docs | No visible explanation of #6 vs #16 | Short explanation of historical thread vs canonical registry |
| Maintainer workflow | Manual clarification in comments | Standardized docs + template-driven intake |

## Mandatory Reading

### P0

- `README.md`
- `.github/workflows/inbox-auto-add.yml`
- `gh issue view 6`
- `gh issue view 16`

### P1

- `docs/REBRAND-RUNBOOK.md`

### P2

- `src/mcp-transport.ts`

Reason: It contains the current workflow language for Oracle operations and is a useful tone/reference point for any user-facing wording.

## Patterns to Mirror

| Pattern | Reference | Why It Matters |
|--------|-----------|----------------|
| Preserve history instead of deleting or overwriting | `README.md`, MCP tools list includes `arra_supersede`; `src/mcp-transport.ts` workflow text says "Nothing is Deleted" | The plan should preserve `#6` and redirect rather than replace |
| Operational runbook style | `docs/REBRAND-RUNBOOK.md` | Existing docs prefer actionable, explicit steps |
| GitHub automation already reacts to issue events | `.github/workflows/inbox-auto-add.yml` | Any new issue form should fit existing issue-open/close workflow rather than bypass it |

## Files to Change

| Action | File | Justification |
|--------|------|---------------|
| UPDATE | `README.md` | Add a short "Oracle Family / Historical Issues" section pointing to issue `#16` |
| CREATE | `.github/ISSUE_TEMPLATE/oracle-awakening.yml` | Structured issue intake for future Oracle awakenings |
| CREATE | `docs/oracle-family-issues.md` | Maintainer-facing explanation of issue consolidation and preservation rules |
| OPTIONAL UPDATE | `.github/workflows/inbox-auto-add.yml` | Only if issue-form labels or title conventions require automation alignment |

## NOT Building

- No migration or rewriting of old GitHub issues
- No automation that edits issue `#6` or `#16` retroactively
- No database/schema/API changes
- No attempt to infer or implement nonexistent acceptance criteria from the social thread

## Step-by-Step Tasks

### Task 1: Add explicit docs for issue #6 historical status

**ACTION**: UPDATE `README.md`
**IMPLEMENT**:
- Add a short section that explains:
  - issue `#6` is a preserved historical awakening thread
  - issue `#16` is the canonical family registry
  - future awakenings should use the dedicated issue form instead of reviving `#6`
**MIRROR**: `README.md` existing concise explanatory sections
**GOTCHA**: Keep the note short; README is product-facing, not the place for full philosophy history
**VALIDATE**: Read rendered Markdown locally for clarity

### Task 2: Create structured Oracle awakening issue form

**ACTION**: CREATE `.github/ISSUE_TEMPLATE/oracle-awakening.yml`
**IMPLEMENT**:
- Define required fields such as:
  - Oracle name
  - Human name
  - Birth/awakening date
  - Repo URL
  - Key lesson / contribution
  - Optional links to previous family issues
- Pre-label with `oracle-family`
- Include guidance that historical threads like `#6` should not be reused for new awakenings
**MIRROR**: GitHub issue form conventions; existing repo label usage from issues `#6` and `#16`
**GOTCHA**: Keep wording neutral and procedural; do not encode unstable social assumptions into the form
**VALIDATE**: Open the YAML and verify GitHub issue form schema shape

### Task 3: Add maintainer runbook for historical family issues

**ACTION**: CREATE `docs/oracle-family-issues.md`
**IMPLEMENT**:
- Document:
  - role of issue `#6`
  - role of issue `#16`
  - when to preserve vs consolidate
  - preferred labels/titles for future Oracle awakenings
  - how this aligns with "Nothing is Deleted"
- Add a short section for maintainers handling new family introductions
**MIRROR**: `docs/REBRAND-RUNBOOK.md` structure for operational guidance
**GOTCHA**: Avoid implying that every future family/community thread must use the same exact social language
**VALIDATE**: Markdown review for accuracy against issue content

### Task 4: Check automation compatibility

**ACTION**: REVIEW `.github/workflows/inbox-auto-add.yml`, optionally UPDATE
**IMPLEMENT**:
- Confirm the new issue form opens issues in a shape already handled by the workflow
- If helpful, add label/title assumptions only if they improve downstream notifications without broadening scope
**MIRROR**: Existing issue-open issue-close workflow logic
**GOTCHA**: Do not introduce behavior changes to automation unless the template truly depends on them
**VALIDATE**: YAML syntax check and workflow diff review

## Testing Strategy

- **Docs review**: Verify README and runbook wording matches actual issue history (`#6`, `#16`)
- **Template validation**: Check issue form YAML structure for required keys and valid field types
- **Regression check**: Ensure the workflow file remains valid YAML if changed
- **Scope check**: Confirm no application code paths, APIs, DB schema, or tests are modified unnecessarily

## Validation Commands

| Level | Command | Expected |
|-------|---------|----------|
| Static Analysis | `bun run build` | No type errors; confirms docs-only work did not disturb TS project |
| Unit Tests | `bun run test:unit` | Existing test suite still passes |
| YAML Spot Check | `python3 - <<'PY'\nimport yaml, pathlib\nfor p in [pathlib.Path('.github/ISSUE_TEMPLATE/oracle-awakening.yml'), pathlib.Path('.github/workflows/inbox-auto-add.yml')]:\n    if p.exists():\n        yaml.safe_load(p.read_text())\nprint('yaml ok')\nPY` | YAML parses successfully |
| Manual | `gh issue view 6 && gh issue view 16` | Docs wording matches actual issue history |

## Acceptance Criteria

- [ ] The repository documents that issue `#6` is historical context, not active intake
- [ ] The repository documents that issue `#16` is the canonical Oracle family registry
- [ ] A dedicated issue form exists for future Oracle awakenings / introductions
- [ ] Future contributors no longer need to guess whether to reuse issue `#6`
- [ ] No historical issue content is deleted, rewritten, or repurposed

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User actually intended a different issue `#6` in another repo/context | High | Confirm repo/issue mapping before implementation if ambiguity remains |
| Docs become overly philosophical and not operational | Medium | Keep README short; move deeper context into dedicated docs |
| Issue form wording ages poorly as family conventions evolve | Medium | Keep form focused on stable metadata, not social phrasing |

## Confidence Score

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Issue Understanding | 2/2 | Directly inspected issues `#6` and `#16` |
| Repo Fit | 2/2 | No existing template/docs cover this workflow |
| Scope Control | 2/2 | Plan stays docs/process only |
| Validation | 1/2 | YAML validation is straightforward, but GitHub UI behavior can only be partially checked locally |
| Ambiguity Handling | 1/2 | There remains a small chance the assigned issue reference is from a different external tracker |

**Total: 8/10**
