---
pr: 27
title: "fix: Qdrant search retry on transient errors + improved error logging"
author: "gobikom"
reviewed: 2026-04-15T20:10:00+07:00
verdict: READY TO MERGE
agents: [code-reviewer, security-reviewer, silent-failure-hunter]
---

## PR Review Summary (Multi-Agent)

> **Note**: Agent tool unavailable — review performed as sequential passes in single session.

### Agents Dispatched
| Agent | Status | Findings |
|-------|--------|----------|
| code-reviewer | Completed | 0 issues |
| security-reviewer | Completed | 0 issues |
| silent-failure-hunter | Completed | 0 issues |

### Critical Issues (0 found)
None.

### Important Issues (0 found)
None.

### Suggestions (0 found)
None.

### Strengths
- **Previous review issues fully addressed**: All 4 findings from R1 (searchWithRetry extraction, error cause chain, typed results, named constant) are resolved
- **Consistent resilience**: Both `query()` and `queryById()` now use the shared `searchWithRetry()` helper
- **Good error chain preservation**: `{ cause: retryErr }` (ES2022) preserves the original stack for production debugging
- **Named constant**: `RETRY_DELAY_MS = 500` is readable and tunable
- **Minimal scope**: +30/-4 across 2 files — surgical, focused change
- **Stack trace logging**: handlers.ts now logs first 2 frames of the stack, balancing noise vs debuggability
- **Observability**: Both retry attempt and retry success are logged, making transient errors visible in monitoring

### Validation Results
| Check | Status | Details |
|-------|--------|---------|
| Type Check | WARN | 4 pre-existing errors (server-legacy.ts, handlers.ts:49) — none from this PR |
| Tests | PASS | 132 pass, 13 skip, 32 fail (pre-existing: vault handler tests with missing config export), 331 assertions |
| Build | N/A | Build is tsc --noEmit (same as type check) |

### Pattern Sweep Results
| Pattern | Files Swept | Instances Found |
|---------|-------------|-----------------|
| `this.client.search` without retry | `qdrant.ts` | 0 additional instances (all wrapped in searchWithRetry) |
| `catch` blocks without logging/rethrow | `qdrant.ts` | 0 new instances (deleteCollection catch is pre-existing, intentional best-effort) |
| `err instanceof Error` consistency | `qdrant.ts`, `handlers.ts` | All uses consistent |

### File Coverage Map
| File | Tier | Agents Run |
|------|------|------------|
| `src/vector/adapters/qdrant.ts` | 2 (Business Logic) | code, security, errors |
| `src/server/handlers.ts` | 2 (Business Logic) | code, security, errors |

### Verdict
**READY TO MERGE**

All issues from the previous review round have been addressed. The retry logic is clean, consistently applied, and well-logged. No new issues found across code quality, security, or error handling passes.
