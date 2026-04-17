---
pr: 716
branch: feat/issue-6-revalidation-pr
title: "docs: record issue #6 revalidation"
reviewed: "2026-04-12T00:00:00+07:00"
verdict: CRITICAL_ISSUES
agents: [codex-f453fdeb6c42]
---

# PR Review Summary (Codex Agent)

## Verdict: CRITICAL_ISSUES

| Severity | Count |
|----------|-------|
| critical | 1 |
| high | 1 |
| important | 2 |
| medium | 2 |

---

## Issues

### [CRITICAL] PR scope is false as submitted

The PR body and attached issue-6 revalidation artifacts claim this is a two-file, verification-only/no-op change, but GitHub reports 41 changed files and 13 commits, including runtime/auth/schema/config changes under src/, package.json, .env.example, and docs.

**Fix**: Update the PR title, body, and summary to accurately describe the full scope of changes (41 files including OAuth 2.1, TTL, Streamable HTTP MCP transport, vector backend refactoring, schema migrations, and various fixes). The PR description must not misrepresent the contents.

---

### [HIGH] Validation evidence does not cover the code being merged

The report says no code/docs changed and relies on prior test output, but this PR includes new runtime, migration, and test changes. The stated verification cannot be used to justify merging the actual branch contents.

**Fix**: Update the revalidation report (`.prp-output/reports/issue-6-revalidation-report-20260412-1104.md`) to:
- Acknowledge the full 41-file scope of changes in the branch
- Document which changes are pre-existing vs. introduced in this PR
- Run or reference actual test validation for the runtime changes

---

### [IMPORTANT] Implementation report provenance is inconsistent

The report names a different branch (`feat/issue-6-oracle-family-normalization`) and still says the next step is to create a PR, even though it is already being used in PR #716.

**Fix**: Update the report to reference the correct branch (`feat/issue-6-revalidation-pr`) and update the status to reflect that the PR has been created.

---

### [IMPORTANT] Build disclaimer is not cleanly scoped

The report marks TypeScript/build failures as pre-existing, but this PR also modifies related server/search paths, so the disclaimer cannot safely exclude branch-introduced risk.

**Fix**: Add a note in the report that distinguishes pre-existing build failures from any potential new failures introduced by the branch's runtime changes.

---

### [MEDIUM] OAuth registration can be unauthenticated

If `MCP_OAUTH_PIN` is set without `MCP_AUTH_TOKEN`, OAuth is mounted and registration auth falls open, allowing unauthorized client registration. The `checkRegistrationAuth()` method in `src/oauth/provider.ts` returns `true` (with only a console warning) when `MCP_AUTH_TOKEN` is not configured.

**Fix**: In `src/oauth/provider.ts`, the `checkRegistrationAuth()` method should return `false` (deny) when `MCP_AUTH_TOKEN` is not set, forcing operators to explicitly configure a bearer token before dynamic client registration is available. A 401 response with a clear error message should be returned, indicating that `MCP_AUTH_TOKEN` must be configured to use dynamic client registration.

**Location**: `src/oauth/provider.ts:192-209` — `checkRegistrationAuth()` method.

---

### [MEDIUM] PIN rate limiting trusts spoofable client IP headers

Rate limiting keys off `x-forwarded-for` / `x-real-ip`, so brute-force protection is bypassable unless a trusted proxy strips and rewrites those headers.

**Note**: On closer inspection, the current implementation in `src/oauth/provider.ts` uses a server-side global lockout (`pinAttemptWindow`) that does NOT key off IP headers at all. The design comment at line 71 explicitly states: "Single-user OAuth flow: shared lockout window cannot be bypassed with spoofed headers." This finding may be a false positive from the reviewer — the implementation is already secure on this point. No code change needed; consider adding a comment in `src/oauth/routes.ts` near the callback handler to make this design decision explicit.

**Location**: `src/oauth/provider.ts:71-75` — rate limit design comment.
