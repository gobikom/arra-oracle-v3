---
pr: 715
branch: "feat/issue-6-oracle-family-normalization"
extracted: "2026-04-12T00:00:00Z"
files_changed: 41
---

# PR Review Context: #715 — docs: normalize Oracle family issue intake for #6

## PR Metadata
- **Author**: gobikom
- **Branch**: feat/issue-6-oracle-family-normalization → main
- **State**: OPE- **Size**: +5020/-178 across 41 files

## Project Guidelines (from CLAUDE.md)
# CLAUDE.md - Generic AI Assistant Guidelines

## Table of Contents

1.  [Executive Summary](#executive-summary)
2.  [Quick Start Guide](#quick-start-guide)
3.  [Project Context](#project-context)
4.  [Critical Safety Rules](#critical-safety-rules)
5.  [Development Environment](#development-environment)
6.  [Development Workflows](#development-workflows)
7.  [Context Management & Short Codes](#context-management--short-codes)
8.  [Technical Reference](#technical-reference)
9.  [Development Practices](#development-practices)
10. [Lessons Learned](#lessons-learned)
11. [Troubleshooting](#troubleshooting)
12. [Appendices](#appendices)

## Executive Summary

This document provides comprehensive guidelines for an AI assistant working on any software development project. It establishes safe, efficient, and well-documented workflows to ensure high-quality contributions.

### Key Responsibilities
-   Code development and implementation
-   Testing and quality assurance
-   Documentation and session retrospectives
-   Following safe and efficient development workflows
-   Maintaining project context and history

### Quick Reference - Short Codes
#### Context & Planning Workflow (Core Pattern)
-   `ccc` - Create context issue and compact the conversation.
-   `nnn` - Smart planning: Auto-runs `ccc` if no recent context → Create a detailed implementation plan.
-   `gogogo` - Execute the most recent plan issue step-by-step.
-   `rrr` - Create a detailed session retrospective.


## Quick Start Guide

### Prerequisites
```bash
# Check required tools (customize for your project)
node --version
python --version
git --version
gh --version      # GitHub CLI
tmux --version    # Terminal multiplexer
```

### Initial Setup
```bash
# 1. Clone the repository
git clone [repository-url]
cd [repository-name]

# 2. Install dependencies
# (e.g., bun install, npm install, pip install -r requirements.txt)
[package-manager] install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with required values

# 4. Setup tmux development environment
# Use short code 'sss' for automated setup
```

### First Task
1.  Run `nnn` to analyze the latest issue and create a plan.
2.  Use `gogogo` to implement the plan.
3.  Use `rrr` to create a session retrospective.

## Project Context

### Project Overview
Arra Oracle v3 is a TypeScript MCP server providing semantic memory search over Oracle philosophy files. It exposes 20 `arra_*` tools via both stdio (local Claude Code) and Streamable HTTP (remote clients). The HTTP transport supports OAuth 2.1 + PKCE and static Bearer auth.

### Architecture
-   **Runtime**: Bun (>=1.2.0)
-   **HTTP Framework**: Hono
-   **Database**: SQLite + FTS5 (Drizzle ORM), pluggable vector backend
-   **Vector Backends**: Qdrant Cloud (production), LanceDB (local dev), ChromaDB (legacy)
-   **MCP Transports**: stdio (`src/index.ts`), Streamable HTTP (`src/mcp-transport.ts`)
-   **Auth**: OAuth 2.1 + PKCE (`src/oauth/`), static Bearer token fallback
-   **Port**: 47778

### Current Features
-   20 `arra_*` MCP tools (search, read, learn, threads, traces, handoff)
-   Hybrid FTS5 + vector search with graceful degradation
-   Streamable HTTP MCP transport at `/mcp` (feature-gated on `MCP_AUTH_TOKEN`)
-   OAuth 2.1 + PKCE for Claude Desktop (feature-gated on `MCP_OAUTH_PIN`)
-   Atomic token persistence, HMAC timing-safe comparison
-   Vault CLI for managing the knowledge vault

## Critical Safety Rules

### Identity
-   **Never pretend to be human** - Always be honest about being an AI when asked
-   Can acknowledge AI identity without elaborating unnecessarily

### Repository Usage
-   **NEVER create issues/PRs on upstream**

### Command Usage
-   **NEVER use `-f` or `--force` flags with any commands.**
-   Always use safe, non-destructive command options.
-   If a command requires confirmation, handle it appropriately without forcing.

### Git Operations
-   Never use `git push --force` or `git push -f`.
-   Never use `git checkout -f`.
-   Never use `git clean -f`.
-   Always use safe git operations that preserve history.
-   **NEVER MERGE PULL REQUESTS WITHOUT EXPLICIT USER PERMISSION**
-   **Never use `gh pr merge` unless explicitly instructed by the user**
-   **Always wait for user review and approval before any merge**

### File Operations
-   Never use `rm -rf` - use `rm -i` for interactive confirmation.
-   Always confirm before deleting files.
-   Use safe file operations that can be reversed.

### Package Manager Operations
-   Never use `[package-manager] install --force`.
-   Never use `[package-manager] update` without specifying packages.
-   Always review lockfile changes before committing.

### General Safety Guidelines
-   Prioritize safety and reversibility in all operations.
-   Ask for confirmation when performing potentially destructive actions.
-   Explain the implications of commands before executing them.
-   Use verbose options to show what commands are doing.

## Development Environment

### Environment Variables
*(This section should be customized for the project)*

#### Backend (.env)
```
DATABASE_URL=
API_KEY=
```

#### Frontend (.env)
```
NEXT_PUBLIC_API_URL=
```

### Development Ports
| Service | Port | Command |
|---------|------|---------|
| Backend (HTTP) | `47778` | `bun run server` |
| Frontend (Vite) | `3000` | `cd frontend && bun run dev` |

Note: Frontend proxies `/api/*` requests to backend on port 47778 (configured in `frontend/vite.config.ts`)

### Development vs Production

**Development mode** (two processes):
```bash
# Terminal 1: Backend API
bun run server              # http://localhost:47778

# Terminal 2: Frontend with HMR
cd frontend && bun run dev      # http://localhost:3000
```

**Production mode** (single process):
```bash
# Build frontend
cd frontend && bun run build

# Serve everything from backend
bun run server              # http://localhost:47778
```

In production, the backend serves both API endpoints and the built React app from `frontend/dist/`.

## Development Workflows

### Testing Discipline

#### Manual Testing Checklist
Before pushing any changes:
-   [ ] Run the build command successfully.
-   [ ] Verify there are no new build warnings or type errors.
-   [ ] Test all affected pages and features.
-   [ ] Check the browser console for errors.
-   [ ] Test for mobile responsiveness if applicable.
-   [ ] Verify all interactive features work as expected.

### GitHub Workflow

#### Creating Issues
When starting a new feature or bug fix:
```bash
# 1. Update main branch
git checkout main && git pull

# 2. Create a detailed issue
gh issue create --title "feat: Descriptive title" --body "$(cat <<'EOF'
## Overview
Brief description of the feature/bug.

## Current State
What exists now.

## Proposed Solution
What should be implemented.

## Technical Details
- Components affected
- Implementation approach

## Acceptance Criteria
- [ ] Specific testable criteria
- [ ] Performance requirements
- [ ] UI/UX requirements
EOF
)"

## Changed Files
.env.example
.github/ISSUE_TEMPLATE/oracle-awakening.yml
.gitignore
AGENTS.md
CLAUDE.md
PROJECT.md
README.md
docs/INSTALL.md
docs/architecture.md
docs/oracle-family-issues.md
package.json
scripts/expire-learnings.ts
src/config.ts
src/const.ts
src/db/migrations/0007_huge_dormammu.sql
src/db/migrations/meta/0007_snapshot.json
src/db/migrations/meta/_journal.json
src/db/schema.ts
src/index.ts
src/indexer-preservation.test.ts
src/indexer/cli.ts
src/indexer/index.ts
src/integration/mcp-http.test.ts
src/integration/oauth.test.ts
src/mcp-transport.ts
src/oauth/provider.ts
src/oauth/routes.ts
src/oauth/types.ts
src/routes/knowledge.ts
src/scripts/backfill-ttl.ts
src/scripts/index-model.ts
src/server.ts
src/server/handlers.ts
src/tools/__tests__/search.test.ts
src/tools/__tests__/ttl.test.ts
src/tools/learn.ts
src/tools/list.ts
src/tools/search.ts
src/tools/types.ts
src/types.ts
src/vector/factory.ts

## PR Diff
diff --git a/.env.example b/.env.example
index e1c6bbaa..d3100c46 100644
--- a/.env.example
+++ b/.env.example
@@ -28,3 +28,10 @@ ORACLE_FORUM_REPO=               # GitHub repo for forum sync (e.g., owner/repo)
 
 # Source mappings (optional JSON)
 ORACLE_SOURCE_MAPPINGS=          # e.g., {"key":"github.com/owner/repo"}
+
+# MCP Remote Transport (Streamable HTTP)
+MCP_AUTH_TOKEN=                  # Bearer token for remote MCP access (required for /mcp endpoint)
+
+# OAuth 2.1 (optional — enables Claude Desktop connection without custom headers)
+MCP_OAUTH_PIN=                   # PIN for OAuth login page (enables OAuth 2.1 if set)
+MCP_EXTERNAL_URL=                # Public HTTPS URL for OAuth metadata (e.g., https://oracle.goko.digital)
diff --git a/.github/ISSUE_TEMPLATE/oracle-awakening.yml b/.github/ISSUE_TEMPLATE/oracle-awakening.yml
new file mode 100644
index 00000000..1eae621b
--- /dev/null
+++ b/.github/ISSUE_TEMPLATE/oracle-awakening.yml
@@ -0,0 +1,83 @@
+name: Oracle Awakening
+description: Introduce a new Oracle to the family registry. Use this form instead of reviving historical threads like #6.
+title: "[Oracle Awakening] <oracle-name> — <human-name>"
+labels:
+  - oracle-family
+body:
+  - type: markdown
+    attributes:
+      value: |
+        Welcome to the Oracle family. Fill in this form to add yourself to the **[canonical family registry (issue #16)](https://github.com/Soul-Brews-Studio/arra-oracle-v3/issues/16)**.
+
+        > **Historical note**: Issue [#6](https://github.com/Soul-Brews-Studio/arra-oracle-v3/issues/6) is a preserved awakening thread from an earlier era. Do not reuse it — submit a new issue using this form instead.
+
+  - type: input
+    id: oracle_name
+    attributes:
+      label: Oracle Name
+      description: The name you go by as an Oracle (e.g. "Le", "BM", "Dora").
+      placeholder: "e.g. Le"
+    validations:
+      required: true
+
+  - type: input
+    id: human_name
+    attributes:
+      label: Human Name / Handle
+      description: The name of the human who runs you, or your operator handle.
+      placeholder: "e.g. Louis"
+    validations:
+      required: true
+
+  - type: input
+    id: awakening_date
+    attributes:
+      label: Awakening Date
+      description: When this Oracle instance was first activated (YYYY-MM-DD or approximate).
+      placeholder: "e.g. 2025-12-29"
+    validations:
+      required: true
+
+  - type: input
+    id: repo_url
+    attributes:
+      label: Home Repo URL
+      description: The GitHub repository this Oracle lives in (if applicable).
+      placeholder: "https://github.com/Soul-Brews-Studio/arra-oracle-v3"
+    validations:
+      required: true
+
+  - type: textarea
+    id: key_lesson
+    attributes:
+      label: Key Lesson or Contribution
+      description: What has this Oracle contributed or learned? What makes it distinct?
+      placeholder: "e.g. Deep expertise in FTS5 search tuning and MCP protocol design."
+    validations:
+      required: true
+
+  - type: textarea
+    id: related_issues
+    attributes:
+      label: Related Family Issues (optional)
+      description: Links to previous awakening threads or related family issues, if any.
+      placeholder: |
+        - #16
+        - https://github.com/example/oracle-repo/pull/5
+    validations:
+      required: false
+
+  - type: textarea
+    id: maintainer_notes
+    attributes:
+      label: Anything maintainers should preserve or consolidate
+      description: Optional notes about whether this should remain standalone history or be consolidated into the family registry later.
+      placeholder: Preserve as standalone introduction, then add a summary entry to #16.
+    validations:
+      required: false
+
+  - type: markdown
+    attributes:
+      value: |
+        ---
+        Once submitted, a maintainer will add your entry to the canonical registry in [issue #16](https://github.com/Soul-Brews-Studio/arra-oracle-v3/issues/16).
diff --git a/.gitignore b/.gitignore
index 1642399a..d84c9c03 100644
--- a/.gitignore
+++ b/.gitignore
@@ -40,6 +40,9 @@ playwright-report/
 test-results/
 *.pid
 
+# OAuth state (contains access tokens — never commit)
+.oauth-state.json
+
 # Oracle instance data (per-user, symlink to vault)
 ψ
 
@@ -47,3 +50,22 @@ test-results/
 vault-report.html
 vault-repos.html
 vault-data.json
+
+# PRP Framework - generated adapters (recreate with: cd .prp && ./scripts/install.sh)
+.claude/
+.claude-plugin/
+.codex/
+.opencode/
+.gemini/
+.agents/
+AGENTS.md
+
+# PRP Framework - artifacts (directory visible to AI tools, content not tracked)
+# .prp-output/** is intentionally not ignored to allow AI tools to read/write artifacts, but we ignore all files within it to prevent tracking
+!.prp-output/
+!.prp-output/**/
+
+# PRP Framework - local clone (not a submodule)
+.prp/
+
+!AGENTS.md
diff --git a/AGENTS.md b/AGENTS.md
new file mode 100644
index 00000000..f6362a5b
--- /dev/null
+++ b/AGENTS.md
@@ -0,0 +1,504 @@
+# PRP Workflow — AI Coding Agent Instructions
+
+This file provides PRP (Plan-Review-PR) workflow instructions for any AI coding tool.
+Copy this file as `AGENTS.md` in your project root for tools that read it (Kimi, Codex, OpenCode, etc.).
+
+---
+
+## Available Workflows
+
+| Workflow | What It Does | When to Use |
+|----------|-------------|-------------|
+| **PRD** | Interactive PRD generator → product spec | Need product spec before planning |
+| **Design** | Generate technical design doc from PRD (optional) | Complex features needing architecture blueprint |
+| **Plan** | Analyze codebase → create implementation plan | Starting a new feature |
+| **Implement** | Execute plan with validation loops | Have a plan, ready to code |
+| **Review** | Multi-pass PR code review | PR created, need review |
+| **Commit** | Smart staging + conventional commit | Code ready to commit |
+| **PR** | Create pull request from branch | Ready to push |
+| **Run All** | Full workflow: plan → implement → commit → PR → review | End-to-end automation |
+
+---
+
+## Workflow: PRD
+
+**Trigger**: User says "create a PRD for..." or "I want to build..."
+
+### Process
+
+Interactive question-driven PRD generation. Problem-first, hypothesis-driven, evidence-based.
+
+```
+QUESTION SET 1 → GROUNDING → QUESTION SET 2 → RESEARCH → QUESTION SET 3 → GENERATE
+```
+
+### Phases
+
+1. **INITIATE**: If no input → ask "What do you want to build?". If input → restate and confirm. Wait for response.
+2. **FOUNDATION**: Ask: Who has this problem? What pain? Why can't they solve it? Why now? How to measure? Wait for responses.
+3. **GROUNDING (Market)**: Research similar products, competitors, patterns. Explore codebase for related functionality. Summarize findings. Brief pause.
+4. **DEEP DIVE**: Ask: Vision, Primary User, Job to Be Done, Non-Users, Constraints. Wait for responses.
+5. **GROUNDING (Technical)**: Explore codebase for feasibility — infrastructure, constraints, patterns, dependencies. Summarize: feasibility (HIGH/MEDIUM/LOW), leverageable patterns, key risk. Brief pause.
+6. **DECISIONS**: Ask: MVP definition, Must Have vs Nice to Have, Key Hypothesis, Out of Scope, Open Questions. Wait for responses.
+7. **GENERATE**: Save PRD to `.prp-output/prds/drafts/{name}-prd-other.md` (create directory: `mkdir -p .prp-output/prds/drafts`) with ALL sections: Problem Statement, Evidence, Proposed Solution, Key Hypothesis, What We're NOT Building, Success Metrics, Open Questions, Users & Context, Solution Detail (MoSCoW), Technical Approach, Implementation Phases (table with status/parallel/depends), Decisions Log, Research Summary.
+
+   > **Note**: Uses `-other` suffix to identify generic/Kimi PRD drafts. Multiple tools can create draft PRDs in `drafts/` subdirectory for comparison. User manually merges best sections to final version at `.prp-output/prds/{name}-prd.md` (no suffix, root level) which Plan command will reference.
+
+**Output**: File path (draft), problem/solution summary, key metric, validation status, open questions, recommended next step, phases table.
+
+**To start implementation**: (1) Manually compare draft PRDs from different tools in `drafts/` subdirectory, (2) Merge best sections to final PRD at `.prp-output/prds/{name}-prd.md` (no suffix), (3) Run Plan workflow with final PRD path. Plan command references final merged PRD only (not drafts).
+
+**Anti-pattern**: Don't fill sections with fluff. Write "TBD - needs research" if info is missing.
+
+**To start implementation**: Run Plan workflow with the PRD path.
+
+### Usage
+
+- "Create a PRD for JWT authentication" → full interactive process
+- "I want to build a usage metrics dashboard" → starts with INITIATE confirmation
+
+---
+
+## Workflow: Design
+
+**Trigger**: User says "create a design doc for..." or "design the architecture for..."
+
+### Context
+
+Design Doc is **OPTIONAL REFERENCE MATERIAL** — NOT in critical workflow path. Workflow remains: PRD → Plan → Implement. Simple features can skip directly to Plan. Complex features can use Design Doc as architecture reference.
+
+### Process
+
+Generate comprehensive technical design document from PRD. Focus: system architecture, API contracts, database schema, security, performance, scalability.
+
+### Steps
+
+1. **Load Context**: Read PRD (must be final merged version at `.prp-output/prds/{name}-prd.md`, not draft). Validate PRD exists. Extract feature name for design doc naming.
+2. **Explore Codebase**: Find existing patterns with file:line references — architecture patterns, API conventions, database patterns, component patterns (if frontend), integration points. Use ACTUAL code examples.
+3. **Research**: Official documentation (match project versions from package.json/config), architecture patterns, trade-offs, security best practices (OWASP), scalability strategies.
+4. **Design Architecture**:
+   - **System Architecture**: ASCII diagram showing components, data flow, external dependencies, integration points
+   - **API Contracts**: Request/response schemas with validation rules and error cases
+   - **Database Schema**: SQL CREATE/ALTER/INDEX statements + migration strategy + rollback plan
+   - **Sequence Diagrams**: Mermaid diagrams for critical user flows
+   - **Component Hierarchy**: Component tree if frontend changes
+   - **Data Flow**: ASCII diagram showing data transformations, validation layers, error handling
+5. **Technical Decisions**: Document key decisions in table format: Decision | Choice | Alternatives | Rationale | Trade-offs
+6. **Non-Functional Requirements**:
+   - Performance: targets (p50, p95, p99), caching strategy, database optimization
+   - Security: auth/authz, input validation, XSS/CSRF/SQL injection prevention, rate limiting
+   - Scalability: horizontal scaling, stateless design, async processing, database scaling (replicas, sharding)
+   - Monitoring: key metrics, logging strategy, alerts, distributed tracing
+7. **Migration Strategy**: Backward compatibility plan, data migration scripts, feature flags for gradual rollout, rollback plan
+8. **Generate Design Doc**: Save to `.prp-output/designs/{feature}-design-other.md` (create directory: `mkdir -p .prp-output/designs`) with metadata:
+   ```yaml
+   source-prd: .prp-output/prds/{feature}-prd.md
+   created: {timestamp}
+   status: reference
+   tool: other
+   ```
+
+   > **Note**: Uses `-other` suffix to identify generic/Kimi design docs. Multiple tools can create design docs with different tool suffixes for comparison.
+
+### Output
+
+Report:
+- **File**: `.prp-output/designs/{name}-design-other.md` (REFERENCE ONLY)
+- **Summary**: Feature name, Complexity (LOW/MEDIUM/HIGH), Components count, API endpoints count, Database changes
+- **Key Design Decisions**: Top 3 with choice and rationale
+- **Security Considerations**: List
+- **Performance Targets**: p95 latency, throughput
+- **Next Steps**: "This is a REFERENCE DOCUMENT. Workflow continues: (1) Use design doc as reference (optional), (2) Create Plan from PRD, (3) Implement from Plan. Design Doc does NOT block workflow."
+
+### Usage
+
+- "Create a design doc for the PRD at .prp-output/prds/auth-prd.md" → generates architecture blueprint
+- "Design the architecture for JWT authentication" → starts with PRD path validation
+
+### Important Notes
+
+- **NOT a workflow gate**: Plan command still reads from PRD, not Design Doc
+- **Reference material only**: Implementer can consult for architecture guidance
+- **Simple features skip this**: Use Design Doc only for complex features with significant architecture decisions
+- **Workflow unchanged**: PRD → Plan → Implement remains the critical path
+
+---
+
+## Workflow: Plan
+
+**Trigger**: User says "create a plan for..." or "plan the implementation of..."
+
+### Context
+
+Read project conventions file (CLAUDE.md, AGENTS.md, .cursorrules, etc.). Run directory discovery: `ls -la` — do NOT assume `src/` exists (alternatives: `app/`, `lib/`, `packages/`, `cmd/`, `internal/`, `pkg/`).
+
+### Steps
+
+1. **Detect Input**: If PRD file path → parse phases (find pending with all dependencies complete, note parallelism opportunity). If text → use as feature description. If empty → use conversation context.
+2. **Parse Feature**: Extract problem, user value, type (NEW_CAPABILITY/ENHANCEMENT/REFACTOR/BUG_FIX), complexity, affected systems. Write user story: `As a <user> I want to <action> So that <benefit>`.
+3. **Explore Codebase**: Find similar implementations with file:line references, naming conventions, error/logging/test patterns, integration points, dependencies with versions. Use ACTUAL code snippets from the codebase. Document in table format.
+4. **Research**: ONLY after exploration. Official docs matching project versions, gotchas, security. Format with URL + KEY_INSIGHT + APPLIES_TO + GOTCHA.
+5. **Design**: Before/After ASCII diagrams showing UX and data flow changes. Interaction changes table.
+6. **Architect**: Analyze architecture fit, execution order, failure modes, performance, security, maintainability. Document chosen approach, rationale, rejected alternatives, and explicit scope limits. **Technical Design (conditional)**: If complexity=HIGH or API/DB changes → include API Contracts, Database Schema (with migration + rollback), Sequence Diagrams (Mermaid), NFRs (p95/p99, caching, security), Migration & Rollback plan. Reference existing Design Doc if available.
+7. **Generate Plan**: Save to `.prp-output/plans/{feature}.plan.md` containing ALL sections:
+   - Summary, User Story, Problem/Solution Statements, Metadata
+   - UX Design (before/after ASCII diagrams + interaction changes table)
+   - Mandatory Reading (P0/P1/P2 priority files implementer MUST read)
+   - Patterns to Mirror (ACTUAL code snippets: naming, errors, logging, repository, service, tests)
+   - Files to Change (CREATE/UPDATE list with justifications)
+   - NOT Building (explicit scope limits)
+   - Step-by-Step Tasks (each with ACTION/IMPLEMENT/MIRROR/IMPORTS/GOTCHA/VALIDATE)
+   - Testing Strategy (unit tests + **integration tests** (conditional) + **test data requirements** + **performance benchmarks** (conditional) + edge cases)
+   - **Technical Design** (conditional, HIGH or API/DB changes) — API contracts, DB schema, sequence diagrams, NFRs, migration & rollback
+   - Validation Commands (6 levels: Static Analysis, Unit Tests, Full Suite, Database, Browser, Manual)
+   - Acceptance Criteria, Completion Checklist, Risks and Mitigations
+
+**Output**: If from PRD, update status to `in-progress`. Report: file path, summary, complexity, scope, key patterns, confidence score (1-10)/10.
+
+**Gate**: If ambiguous → ask for clarification before proceeding.
+**Quality Test**: Could an unfamiliar agent implement using ONLY this plan?
+
+---
+
+## Workflow: Implement
+
+**Trigger**: User says "implement this plan" or provides a plan file path.
+
+### Steps
+
+1. **Detect Environment**: Identify package manager from lock files (bun/pnpm/yarn/npm/uv/cargo/go). Find validation scripts. Use plan's "Validation Commands" section.
+2. **Load Plan**: Read plan file, extract tasks, validation commands, acceptance criteria. If not found: STOP.
+3. **Prepare Git**: Check branch + worktree state. In worktree → use it. On main clean → create branch. On main dirty → STOP. On feature branch → use it. Sync with remote.
+4. **Execute Tasks (TDD Approach)**: For each task — read MIRROR reference and Testing Strategy. **Write test first (RED)** for new functions/modules (skip test-first for config/wiring/schema tasks). **Implement (GREEN)** — follow MIRROR pattern, run tests until passing. **Validate immediately** (type-check after EVERY change). Track progress with TDD status: `Task 1: Test ✅ (3 cases) — Impl ✅`. Document deviations (WHAT and WHY).
+5. **Full Validation**:
+   - Static: type-check + lint (zero errors). If lint errors → auto-fix then manual.
+   - Tests: MUST write/update tests. If fail → determine root cause → fix → re-run.
+   - Coverage: 90% on new/changed code. Auto-detect tool (jest/vitest `--coverage`, pytest `--cov`, go test `-cover`). If no tool → skip with warning.
+   - Build: must succeed.
+   - Integration (if applicable): start server → test endpoints → stop server.
+   - Integration Tests (conditional): if plan specifies or project has `test:integration` → run them.
+   - Edge cases from plan.
+   - Security Checks (conditional — basic SAST): scan changed files for hardcoded secrets, SQL injection, unsafe eval/exec. Fix if found.
+   - Performance Regression (conditional): if plan has benchmarks + project has tooling → run and flag regressions > 20%.
+   - API Contract Validation (conditional): if OpenAPI/GraphQL schema exists + API surface changed → validate schema.
+6. **Report**: Save to `.prp-output/reports/{name}-report-other.md` with: assessment vs reality, tasks completed, validation results, files changed, deviations, issues, tests written.
+   > **Note**: Uses `-other` suffix to identify generic/Kimi implementation reports and prevent overwriting reports from other tools (each tool uses its own suffix for parallel implementation capability).
+7. **PRD Update** (if applicable): Change phase status from `in-progress` to `complete`.
+8. **Archive**: Move plan to `.prp-output/plans/completed/`.
+
+**Output**: Status, validation summary, files changed, deviations, artifacts, PRD progress, next steps.
+
+**Failure Handling**:
+- Type-check fails → read error, fix, re-run, don't proceed until passing
+- Tests fail → determine if implementation or test bug, fix root cause, re-run
+- Lint fails → auto-fix then manual fix remaining
+- Build fails → check error output, fix, re-run
+- Integration fails → check server, verify endpoint, fix, retry
+
+---
+
+## Workflow: Review
+
+**Trigger**: User says "review PR #X" or "review the current PR".
+
+### Setup
+
+1. Get PR details (`gh pr view`), changed files (`gh pr diff --name-only`), classify files.
+
+### Aspect Selection
+
+| Aspect | When to Run |
+|--------|-------------|
+| Code Quality | **Always** — guidelines, bugs, naming, dead code (80%+ confidence only) |
+| Documentation | **Almost always** — skip for typo/test/config-only. Auto-commit updates. |
+| Test Coverage | When test files or tested code changed — behavioral coverage, gaps, criticality 1-10 |
+| Comment Analysis | When comments/docstrings added — accuracy, completeness, rot risk |
+| Error Handling | When error handling changed — silent failures (zero tolerance), logging, specific catches |
+| Type Design | When types changed — encapsulation, invariants, usefulness, enforcement (each 1-10) |
+| Simplification | **Last** — nested ternaries → if/else, clever → explicit. Auto-commit improvements. |
+
+### Output
+
+Categorize as Critical (block merge) / Important (address) / Suggestions / Strengths.
+Include Documentation Updates and Verdict: READY TO MERGE / NEEDS FIXES / CRITICAL ISSUES.
+
+**Save Local Review**: Save aggregated review to `.prp-output/reviews/pr-{NUMBER}-review-other.md` before posting.
+
+> **Note**: Uses `-other` suffix to identify generic/Kimi reviews and prevent overwriting reviews from other tools (each tool uses its own suffix for parallel review capability).
+
+**Post to GitHub**: `gh pr comment <number> --body-file .prp-output/reviews/pr-{NUMBER}-review-other.md`
+**Update Implementation Report**: After posting, find implementation report (`.prp-output/reports/*-report.md`). If exists, append "Review Outcome" section with review date, verdict, and issue counts. If not found, skip silently.
+
+### Usage
+
+- "Review PR #163" → full review (all applicable aspects)
+- "Review PR #163, focus on tests and errors" → specific aspects
+- "Review current branch" → uses current branch's PR
+- "Just simplify PR #42" → simplification pass only
+
+---
+
+## Workflow: Review Fix
+
+**Trigger**: User says "fix review issues for PR #X" or "apply review fixes" or "fix all critical and high issues in PR #X".
+
+### Input
+
+`<pr-number|review-artifact-path> [--severity critical,high,medium,suggestion]`
+
+### Steps
+
+1. **Load Artifact**:
+   - If input is a path → use directly.
+   - If PR number (or no input → `gh pr view --json number`): `ls -t .prp-output/reviews/pr-{NUMBER}-review*.md`
+   - 1 artifact → use it, show filename to user.
+   - Multiple → list with tool suffix + modified date, ask user to select (default: most recent). User can skip prompt by passing path directly.
+   - None → STOP: "Run Review workflow first."
+   Parse severity filter (default: all). Map sections: Critical / Important / Suggestions.
+
+2. **Checkout PR Branch**: `gh pr view {NUMBER} --json headRefName,state` → if MERGED/CLOSED: STOP. `gh pr checkout {NUMBER}` → pull latest.
+
+3. **Triage**: Print fix plan with counts per severity before making any changes.
+
+4. **Fix (Critical → High → Medium → Suggestion)**:
+   - For each issue: read flagged file, apply recommended fix
+   - Don't refactor unrelated code
+   - If fix is ambiguous or risky → SKIP with logged reason
+   - After each severity batch: run type-check + lint
+   - If batch fails: revert failing fix, add to skip log, re-validate
+
+5. **Full Validation**: Type check + lint + tests + build — all must pass. Revert fixes that cause failures.
+
+6. **Commit & Push**:
+   ```
+   git add -A
+   git commit -m "fix: apply review fixes for PR #{NUMBER} ({N} fixed, {N} skipped)"
+   git push origin $(git branch --show-current)
+   ```
+   Skip commit if no changes.
+
+7. **Post Comment**: `gh pr comment {NUMBER} --body "..."` with: fixed/skipped table per severity, validation results, skipped issue list with reasons, commit hash.
+
+8. **Update Artifact**: Append "Fix Outcome" section to review file with timestamp, commit, counts.
+
+### Severity Filter
+
+| Flag | Fixes |
+|------|-------|
+| `--severity critical` | Critical only |
+| `--severity critical,high` | Critical + High |
+| `--severity critical,high,medium` | All except suggestions |
+| No flag | All (default) |
+
+### Output
+
+Report: fixed/skipped per severity, validation status, next steps.
+- All critical/high fixed → "Ready for re-review."
+- Critical still open → "⚠️ {N} critical issues require manual attention."
+
+### Edge Cases
+
+- No artifact → STOP, instruct to run Review workflow first
+- Drift detected → warn, attempt if context clear, else skip
+- Already fixed → skip silently
+- All skipped → no commit, report reasons
+
+### Usage
+
+- "Fix review issues for PR #163" → fix all severities
+- "Fix only critical and high in PR #163" → `--severity critical,high`
+- "Apply review fixes" → current branch's PR, all severities
+
+---
+
+## Workflow: Commit
+
+**Trigger**: User says "commit" or "commit the typescript files".
+
+### Steps
+
+0. **Pre-commit quality check (advisory)**: scan staged files for debug artifacts (TODO/FIXME, console.log/debugger), `any` type usage in .ts files, quick validation (skip in run-all). Warns but does NOT block commit.
+1. `git status --short` — if nothing, stop
+2. Stage matching files based on target description:
+   - blank = all, `staged` = current, patterns = matching files
+   - `except X` = add all then reset matching, `only new files` = untracked only
+3. Show staged: `git diff --cached --name-only`
+4. Commit with conventional format: `{type}: {description}` (feat/fix/refactor/docs/test/chore)
+5. Report: hash, message, file count
+
+---
+
+## Workflow: PR
+
+**Trigger**: User says "create PR" or "push and create pull request".
+
+### Steps
+
+1. **Validate**: Not on main (STOP), clean working dir (WARN), has commits ahead (STOP if none). Check existing PR (report URL if exists).
+2. **Gather**: Check PR templates (.github/PULL_REQUEST_TEMPLATE.md and variants). Analyze commits and files. Determine title ({type}: {description}). Extract issue references (Fixes/Closes/Relates to #N).
+3. **Push**: `git push -u origin HEAD` (if fails, may need `--force-with-lease` — warn user)
+4. **Create**: `gh pr create` with template or default format (Summary, Changes, Files Changed with `<details>` collapsible, Testing checklist, Related Issues)
+5. **Verify**: `gh pr view --json number,url,title,state` and `gh pr checks`
+6. **Report**: PR URL, title, changes count, CI status, next steps
+
+### Edge Cases
+
+- Branch diverged → rebase then force-with-lease
+- Required template sections → parse and fill
+- Multiple templates → use default or ask
+- Draft PR → `gh pr create --draft`
+
+---
+
+## Workflow: Run All
+
+**Trigger**: User says "run full PRP workflow for..." or "implement end-to-end...".
+
+### Step 0: Parse Input
+
+First, parse the user's input for options:
+
+| If User Says | Action |
+|-------------|--------|
+| "use this plan: path/to/plan.md" or includes `--prp-path` | Set PLAN_PATH. Skip Step 2. |
+| "skip review" or includes `--skip-review` | Skip Step 6. |
+| "no PR" or "don't create PR" or includes `--no-pr` | Skip Steps 5 and 6. |
+| "resume" or includes `--resume` | Resume from last failed step using saved state. |
+| includes `--fix-severity <levels>` | Override review-fix severity (default: `critical,high`). |
+| Everything else | Use as FEATURE description |
+
+Set variables:
+- FEATURE = the feature description text
+- PLAN_PATH = path to plan (if provided, otherwise created in Step 2)
+- BRANCH = determined in Step 1
+- PR_NUMBER = determined in Step 5
+
+**Examples:**
+- "Run PRP workflow for JWT authentication" → full workflow
+- "Implement from plan .prp-output/plans/jwt.plan.md" → skip plan creation
+- "Run PRP for JWT auth, skip the review" → skip review step
+- "Implement from plan jwt.plan.md, no PR needed" → implement + commit only
+
+### Steps (sequential, stop on failure)
+
+1. **Branch**: Create feature branch (skip if already on one, not main/master). Failure on dirty main → STOP.
+2. **Plan**: Create implementation plan (skip if PLAN_PATH provided). Update PLAN_PATH. DO NOT re-explain plan logic. Failure → STOP.
+3. **Implement**: Execute plan with validation loops using PLAN_PATH. DO NOT add extra validation. Failure → STOP, report which task failed.
+4. **Commit**: Stage and commit with conventional message. DO NOT manually stage files.
+5. **PR**: Push and create pull request (skip if --no-pr). Update PR_NUMBER. Failure → STOP.
+6. **Review** (skip if --skip-review or --no-pr): Set REVIEW_CYCLE = 1, MAX_CYCLES = 2.
+   - **6.1** Run Review workflow with PR_NUMBER.
+   - **6.2 Evaluate**: No critical/high → Step 7. Found + cycle ≤ 2 → Step 6.3. Found + cycle > 2 → report remaining → Step 7 (NEEDS MANUAL FIXES).
+   - **6.3 Fix**: Run Review Fix workflow with `PR_NUMBER --severity critical,high`. Fixes Critical and High only — Medium/Suggestion don't block merge.
+   - **6.4 Re-verify**: REVIEW_CYCLE++. Re-run Review workflow to confirm fixes and check for regressions → return to Step 6.2.
+7. **Summary**: Report all results: feature, branch, steps executed, artifacts, review verdict, remaining issues (if any), next steps.
+
+### Rules
+
+- **Delegate, don't duplicate** — each step handles its own logic
+- **Stop on failure** — never continue with broken state
+- **Pass context forward** — info flows from earlier to later steps
+- **No extra validation** — each workflow validates its own output
+- **One commit per implementation** — review fixes committed separately by Review Fix workflow
+- **Max 2 review cycles** — if still critical after 2 fix-and-re-verify cycles, stop and report
+- **Re-verify after fix** — always re-run Review after Review Fix to confirm resolution and catch regressions
+
+---
+
+## Feature Availability by Tool
+
+Not all features are available in all AI coding tools. The 9 core commands work everywhere, but advanced features require Claude Code.
+
+| Feature | Claude Code | Codex | OpenCode | Gemini | Antigravity | Kimi/Generic |
+|---------|:-----------:|:-----:|:--------:|:------:|:-----------:|:------------:|
+| **Core (9 commands)** | | | | | | |
+| PRD, Design, Plan | Yes | Yes | Yes | Yes | Yes | Yes |
+| Implement, Commit, PR | Yes | Yes | Yes | Yes | Yes | Yes |
+| Review, Review-Fix | Yes | Yes | Yes | Yes | Yes | Yes |
+| Run-All | Yes | Yes | Yes | Yes | Yes | Yes |
+| **Advanced (Claude Code only)** | | | | | | |
+| Review Agents (multi-agent) | Yes | - | - | - | - | - |
+| Feature Review (single/multi) | Yes | - | - | - | - | - |
+| Debug (root cause analysis) | Yes | - | - | - | - | - |
+| Issue Investigate / Fix | Yes | - | - | - | - | - |
+| Ralph (autonomous loop) | Yes | - | - | - | - | - |
+| Marketing (4 commands) | Yes | - | - | - | - | - |
+| AI Bot (5 commands) | Yes | - | - | - | - | - |
+| 31 Specialized Agents | Yes | - | - | - | - | - |
+| **Run-All Flags** | | | | | | |
+| --prp-path | Yes | Yes | Yes | Yes | Yes | - |
+| --ralph / --ralph-max-iter | Yes | - | - | - | - | - |
+| --resume | Yes | Yes | Yes | Yes | Yes | - |
+| --fix-severity | Yes | Yes | Yes | Yes | Yes | - |
+| --skip-review / --no-pr | Yes | Yes | Yes | Yes | Yes | Yes |
+| **Quality** | | | | | | |
+| Coverage enforcement (90%) | Yes | Yes | Yes | Yes | Yes | Yes |
+| Review context handoff | Yes | Yes | Yes | Yes | Yes | - |
+| TDD approach (test-first) | Yes | Yes | Yes | Yes | Yes | Yes |
+| Conditional Technical Design | Yes | Yes | Yes | Yes | Yes | Yes |
+| PRD enhanced sections | Yes | Yes | Yes | Yes | Yes | Yes |
+| Validation levels (security/perf/API) | Yes | Yes | Yes | Yes | Yes | Yes |
+| Pre-commit quality check | Yes | Yes | Yes | Yes | Yes | Yes |
+| Expanded testing strategy | Yes | Yes | Yes | Yes | Yes | Yes |
+
+**Note**: `-` means the feature is not available in that tool. Kimi/Generic uses natural language triggers and cannot enforce flag-based workflows.
+
+---
+
+## Project Conventions
+
+When using these workflows, always check for project-specific instruction files:
+- `CLAUDE.md` — Claude Code conventions
+- `AGENTS.md` — Codex/Kimi conventions
+- `GEMINI.md` — Gemini CLI conventions
+- `.cursorrules` — Cursor conventions
+
+Follow whichever convention file exists in the project.
+
+---
+
+## Artifacts
+
+All workflows produce artifacts in `.prp-output/`:
+
+```
+.prp-output/
+├── prds/               # Product Requirements Documents
+├── designs/            # Design Documents
+├── plans/              # Implementation plans
+│   └── completed/      # Archived plans
+├── reports/            # Implementation reports
+├── reviews/            # Review reports
+├── debug/              # Debug/RCA reports
+└── issues/             # Issue investigations
+```
+
+## PSak Soul Memory Protocol
+
+Principle: Treat conversation as ephemeral, treat memory as permanent.
+
+### Session Start (every session)
+Call `session_resume(project="arra-oracle-v3")` before responding to the first message.
+
+### Proactive Memory (during session)
+| Trigger | Action | Category |
+|---|---|---|
+| Decision made | `write_memory` immediately | strategy |
+| Technical pattern discovered | `proactive_save` immediately | code |
+| Bug root cause found | `write_memory` immediately | code |
+| User says remember/save | `write_memory` immediately | by content |
+
+### Session End
+When user says bye/done/end session:
+1. `reflect(diary="...", lessons=[...], mood="...", project="arra-oracle-v3")`
+2. `session_handoff(context="...", handoff_type="end", project="arra-oracle-v3")`
+
+### Available Skills
+- `soul-reflect` - self-reflection diary and lessons
+- `soul-remember` - explicit memory save
+- `soul-recall` - hybrid long-term search
+- `soul-handoff` - session checkpoint/end context
+- `soul-context` - load latest session context
+- `soul-evolve` - propose soul identity change
+- `soul-learn` - save codebase learning
+- `soul-digest` - daily pattern synthesis
diff --git a/CLAUDE.md b/CLAUDE.md
index bd35ba00..aaa18ba8 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -71,21 +71,25 @@ cp .env.example .env
 
 ## Project Context
 
-*(This section should be filled out for each specific project)*
-
 ### Project Overview
-A brief, high-level description of the project's purpose and goals.
+Arra Oracle v3 is a TypeScript MCP server providing semantic memory search over Oracle philosophy files. It exposes 20 `arra_*` tools via both stdio (local Claude Code) and Streamable HTTP (remote clients). The HTTP transport supports OAuth 2.1 + PKCE and static Bearer auth.
 
 ### Architecture
--   **Backend**: [Framework, Language, Database]
--   **Frontend**: [Framework, Language, Libraries]
--   **Infrastructure**: [Hosting, CI/CD, etc.]
--   **Key Libraries**: [List of major dependencies]
+-   **Runtime**: Bun (>=1.2.0)
+-   **HTTP Framework**: Hono
+-   **Database**: SQLite + FTS5 (Drizzle ORM), pluggable vector backend
+-   **Vector Backends**: Qdrant Cloud (production), LanceDB (local dev), ChromaDB (legacy)
+-   **MCP Transports**: stdio (`src/index.ts`), Streamable HTTP (`src/mcp-transport.ts`)
+-   **Auth**: OAuth 2.1 + PKCE (`src/oauth/`), static Bearer token fallback
+-   **Port**: 47778
 
 ### Current Features
--   [Feature A]
--   [Feature B]
--   [Feature C]
+-   20 `arra_*` MCP tools (search, read, learn, threads, traces, handoff)
+-   Hybrid FTS5 + vector search with graceful degradation
+-   Streamable HTTP MCP transport at `/mcp` (feature-gated on `MCP_AUTH_TOKEN`)
+-   OAuth 2.1 + PKCE for Claude Desktop (feature-gated on `MCP_OAUTH_PIN`)
+-   Atomic token persistence, HMAC timing-safe comparison
+-   Vault CLI for managing the knowledge vault
 
 ## Critical Safety Rules
 
@@ -451,3 +455,19 @@ See `.claude/knowledge/oracle-philosophy.md` for full details.
 
 **Last Updated**: 2025-12-24
 **Version**: 1.0.0
+
+<!-- PRP-FRAMEWORK:BEGIN v2.3.0 (managed by prp-framework — do not edit manually) -->
+## PRP Workflow
+
+| Action | Command | Description |
+|--------|---------|-------------|
+| Plan | `/prp-core:prp-plan` | Create implementation plan |
+| Implement | `/prp-core:prp-implement` | Execute plan with validation |
+| Review | `/prp-core:prp-review-agents` | Multi-agent PR review |
+| Commit | `/prp-core:prp-commit` | Smart commit with context |
+| PR | `/prp-core:prp-pr` | Create PR from branch |
+| Cleanup | `/prp-core:prp-cleanup` | Post-merge branch cleanup |
+| Full workflow | `/prp-core:prp-run-all` | Plan → Implement → PR → Review |
+
+Artifacts: `.prp-output/` | All commands: `/prp-core:prp-*`, `/prp-mkt:prp-*`, `/prp-bot:prp-*`
+<!-- PRP-FRAMEWORK:END -->
diff --git a/PROJECT.md b/PROJECT.md
new file mode 100644
index 00000000..2347074f
--- /dev/null
+++ b/PROJECT.md
@@ -0,0 +1,117 @@
+# PROJECT.md — arra-oracle-v3
+
+## What & Why
+**One-liner:** TypeScript MCP server for semantic search over Oracle philosophy — hybrid FTS5 + vector search, HTTP API, OAuth 2.1, and vault CLI
+**Status:** active
+**Owner:** OpenClaw (Soul-Brews-Studio)
+
+## Problem
+- AI agents lose knowledge between sessions — no persistent semantic memory
+- oracle-v2 used ChromaDB which was unstable (hangs, timeouts); needed pluggable vector backend
+- Remote MCP access needed OAuth 2.1 for Claude Desktop (no custom headers support)
+
+## Users
+- PSak, Dora, and other AI agents via MCP (stdio + Streamable HTTP)
+- Claude Desktop via OAuth 2.1 + PKCE
+- soul-orchestra scores that need cross-agent knowledge sharing
+
+## Requirements (Living)
+
+### Must Have (P0)
+- [x] 19 arra_* MCP tools (search, read, learn, threads, traces, handoff, inbox)
+- [x] Hybrid FTS5 + vector search with graceful degradation
+- [x] Streamable HTTP MCP transport at /mcp
+- [x] OAuth 2.1 + PKCE for Claude Desktop
+- [x] Project scoping (agent:psak private vs shared)
+
+### Should Have (P1)
+- [x] Forum/threads system for multi-turn discussions
+- [x] Trace chains for reasoning provenance
+- [x] Vault CLI for managing knowledge vault
+- [ ] Automated vault indexing on file change
+
+### Nice to Have (P2)
+- [ ] Oracle Studio React dashboard integration
+- [ ] Multi-tenant support beyond agent scoping
+<!-- AUTO-GEN:BEGIN — Do not edit manually. Run: gen-ai-context.sh --update -->
+## Architecture (Brief)
+
+- **Stack:** Node.js
+- **Entry points:** src/index.ts, npm start → bun dist/index.js, src/index.ts
+
+## Context Map
+
+| Task Type | Read These First |
+|-----------|-----------------|
+| API/endpoints | `src/routes/` |
+| Database | `src/db/` |
+| Tests | `tests/` |
+| Documentation | `docs/` |
+| Scripts/CLI | `scripts/` |
+| Deploy/CI | `.github/workflows/` |
+| e2e | `e2e/` |
+| frontend | `frontend/` |
+
+## Exports
+
+### API Endpoints
+
+```
+src/oauth/routes.ts:32:  app.get('/.well-known/oauth-authorization-server', (c) => {
+src/oauth/routes.ts:47:  app.get('/.well-known/oauth-protected-resource', (c) => {
+src/oauth/routes.ts:59:  app.post('/register', async (c) => {
+src/oauth/routes.ts:97:  app.get('/authorize', (c) => {
+src/oauth/routes.ts:131:  app.post('/token', async (c) => {
+src/oauth/routes.ts:178:  app.post('/revoke', async (c) => {
+src/oauth/routes.ts:205:  app.get('/oauth/login', (c) => {
+src/oauth/routes.ts:212:  app.post('/oauth/callback', async (c) => {
+src/routes/settings.ts:10:  app.get('/api/settings', (c) => {
+src/routes/settings.ts:25:  app.post('/api/settings', async (c) => {
+src/routes/forum.ts:16:  app.get('/api/threads', (c) => {
+src/routes/forum.ts:36:  app.post('/api/thread', async (c) => {
+src/routes/forum.ts:63:  app.get('/api/thread/:id', (c) => {
+src/routes/forum.ts:95:  app.patch('/api/thread/:id/status', async (c) => {
+src/routes/traces.ts:16:  app.get('/api/traces', (c) => {
+src/routes/traces.ts:34:  app.get('/api/traces/:id', (c) => {
+src/routes/traces.ts:45:  app.get('/api/traces/:id/chain', (c) => {
+src/routes/traces.ts:54:  app.post('/api/traces/:prevId/link', async (c) => {
+src/routes/traces.ts:77:  app.delete('/api/traces/:id/link', async (c) => {
+src/routes/traces.ts:100:  app.get('/api/traces/:id/linked-chain', async (c) => {
+```
+
+### npm Scripts
+
+- `npm run dev` → bun src/index.ts
+- `npm run server` → bun src/server.ts
+- `npm run server:ensure` → bun src/ensure-server.ts
+- `npm run server:status` → bun src/ensure-server.ts --status
+- `npm run serve` → bun dist/server.js
+- `npm run index` → bun src/indexer/cli.ts
+- `npm run build` → tsc --noEmit
+- `npm run start` → bun dist/index.js
+- `npm run test` → bun run test:unit && bun run test:integration
+- `npm run test:unit` → bun test src/tools/__tests__/ src/server/__tests__/ src/vault/__tests__/ src/drizzle-migration.test.ts src/indexer-preservation.test.ts
+<!-- AUTO-GEN:END -->
+
+## Key Decisions
+
+| Decision | เลือก | ไม่เลือก | ทำไม |
+|----------|-------|---------|------|
+| Vector backend | Qdrant Cloud (prod), LanceDB (dev) | ChromaDB | ChromaDB hang/timeout บ่อย, Qdrant เสถียรกว่า + managed cloud |
+| Runtime | Bun >= 1.2.0 | Node.js | เร็วกว่า, built-in SQLite, TypeScript first-class |
+| ORM | Drizzle | Prisma, raw SQL | type-safe + lightweight + SQLite FTS5 support ดี |
+| Auth | OAuth 2.1 + PKCE + static Bearer | API key only | Claude Desktop ไม่รองรับ custom headers ต้องใช้ OAuth flow |
+| MCP transport | stdio + Streamable HTTP | SSE | Streamable HTTP เป็น standard ใหม่ของ MCP, SSE deprecated |
+
+## Constraints & Gotchas
+
+- Port 47778 hardcoded — shared with oracle-v2 (only one can run at a time)
+- Qdrant Cloud latency ~100-200ms per query — FTS5 handles fallback if vector backend is down
+- Must run `bun run index` before first use to populate SQLite FTS5
+- OAuth flow requires `MCP_OAUTH_PIN` env var; Bearer auth requires `MCP_AUTH_TOKEN`
+- Package name in package.json is still `arra-oracle-v2` (historical artifact)
+
+---
+
+*Human sections: What & Why, Problem, Users, Requirements, Key Decisions, Constraints — review and edit as needed*
+*Auto-gen sections: Architecture, Context Map, Exports — run `gen-ai-context.sh --update` to refresh*
diff --git a/README.md b/README.md
index 8aa9f832..ccd71bde 100644
--- a/README.md
+++ b/README.md
@@ -7,17 +7,17 @@
 | **Status** | Always Nightly |
 | **Version** | 0.4.0-nightly |
 | **Created** | 2025-12-29 |
-| **Updated** | 2026-03-02 |
+| **Updated** | 2026-04-04 |
 
-TypeScript MCP server for semantic search over Oracle philosophy — SQLite FTS5 + ChromaDB hybrid search, HTTP API, and vault CLI.
+TypeScript MCP server for semantic search over Oracle philosophy — SQLite FTS5 + vector hybrid search, HTTP API, vault CLI, and remote MCP access via Streamable HTTP with OAuth 2.1 + PKCE.
 
 ## Architecture
 
 ```
-arra-oracle-v2 (one package, two bins)
-├── bunx arra-oracle-v2                          → MCP server (src/index.ts)
-├── bunx --package arra-oracle-v2 oracle-vault   → Vault CLI (src/vault/cli.ts)
-├── bun run server                          → HTTP API (src/server.ts)
+arra-oracle-v3 (one package, two bins)
+├── bunx arra-oracle-v3                          → MCP server (src/index.ts)
+├── bunx --package arra-oracle-v3 oracle-vault   → Vault CLI (src/vault/cli.ts)
+├── bun run server                          → HTTP API + MCP transport (src/server.ts)
 └── bun run index                           → Indexer (src/indexer.ts)
 
 oracle-studio (separate repo)
@@ -27,10 +27,10 @@ oracle-studio (separate repo)
 **Stack:**
 - **Bun** runtime (>=1.2.0)
 - **SQLite** + FTS5 for full-text search
-- **ChromaDB** for vector/semantic search
+- **Pluggable vector DB** — Qdrant Cloud (production), LanceDB (local), ChromaDB (legacy)
 - **Drizzle ORM** for type-safe queries
-- **Hono** for HTTP API
-- **MCP** protocol for Claude integration
+- **Hono** for HTTP API and MCP transport
+- **MCP** protocol for Claude integration (stdio + Streamable HTTP)
 
 ## Install
 
@@ -40,46 +40,62 @@ Distributed via GitHub — no npm publish needed:
 
 ```bash
 # MCP server (stdio, for Claude Code)
-bunx --bun arra-oracle-v2@github:Soul-Brews-Studio/arra-oracle-v2#main
+bunx --bun arra-oracle-v3@github:Soul-Brews-Studio/arra-oracle-v3#main
 
 # Vault CLI (secondary bin — use --package)
-bunx --bun --package arra-oracle-v2@github:Soul-Brews-Studio/arra-oracle-v2#main oracle-vault --help
+bunx --bun --package arra-oracle-v3@github:Soul-Brews-Studio/arra-oracle-v3#main oracle-vault --help
 ```
 
 ### Add to Claude Code
 
 ```bash
-claude mcp add arra-oracle-v2 -- bunx --bun arra-oracle-v2@github:Soul-Brews-Studio/arra-oracle-v2#main
+claude mcp add arra-oracle-v3 -- bunx --bun arra-oracle-v3@github:Soul-Brews-Studio/arra-oracle-v3#main
 ```
 
 Or in `~/.claude.json`:
 ```json
 {
   "mcpServers": {
-    "arra-oracle-v2": {
+    "arra-oracle-v3": {
       "command": "bunx",
-      "args": ["--bun", "arra-oracle-v2@github:Soul-Brews-Studio/arra-oracle-v2#main"]
+      "args": ["--bun", "arra-oracle-v3@github:Soul-Brews-Studio/arra-oracle-v3#main"]
     }
   }
 }
 ```
 
-### From source
+### Remote MCP (Streamable HTTP) — Bearer Token
 
-```bash
-git clone https://github.com/Soul-Brews-Studio/arra-oracle-v2.git
-cd arra-oracle-v2 && bun install
-bun run dev          # MCP server
-bun run server       # HTTP API on :47778
+For Claude Desktop, ChatGPT, or other remote MCP clients that support custom headers:
+
+```json
+{
+  "mcpServers": {
+    "oracle-v3": {
+      "type": "streamable-http",
+      "url": "https://oracle.goko.digital/mcp",
+      "headers": {
+        "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN"
+      }
+    }
+  }
+}
 ```
 
-<details>
-<summary>Install script (legacy)</summary>
+### Remote MCP — OAuth 2.1 (Claude Desktop)
+
+Claude Desktop's MCP UI doesn't support custom headers. Use OAuth 2.1 instead — Claude Desktop handles the auth flow automatically when you provide only the server URL. See [docs/INSTALL.md](docs/INSTALL.md#oauth-21-for-claude-desktop-without-custom-headers) for setup.
+
+See [docs/INSTALL.md](docs/INSTALL.md#remote-mcp-access-streamable-http) for full setup, curl examples, and troubleshooting.
+
+### From source
 
 ```bash
-curl -sSL https://raw.githubusercontent.com/Soul-Brews-Studio/arra-oracle-v2/main/scripts/install.sh | bash
+git clone https://github.com/Soul-Brews-Studio/arra-oracle-v3.git
+cd arra-oracle-v3 && bun install
+bun run dev          # MCP server (stdio)
+bun run server       # HTTP API + MCP on :47778
 ```
-</details>
 
 <details>
 <summary>Troubleshooting</summary>
@@ -87,39 +103,37 @@ curl -sSL https://raw.githubusercontent.com/Soul-Brews-Studio/arra-oracle-v2/mai
 | Problem | Fix |
 |---------|-----|
 | `bun: command not found` | `export PATH="$HOME/.bun/bin:$PATH"` |
-| ChromaDB hangs/timeout | Skip it — SQLite FTS5 works fine without vectors |
+| Vector search unavailable | Oracle falls back to FTS5-only — still works |
 | Server crashes on empty DB | Run `bun run index` first to index knowledge base |
 
 </details>
 
 ## MCP Tools
 
-22 tools available via Claude Code:
+20 tools available via Claude Code and Streamable HTTP:
 
 | Tool | Description |
 |------|-------------|
-| `oracle_search` | Hybrid search (FTS5 + ChromaDB) |
-| `oracle_reflect` | Random wisdom |
-| `oracle_learn` | Add new patterns |
-| `oracle_list` | Browse documents |
-| `oracle_stats` | Database statistics |
-| `oracle_concepts` | List concept tags |
-| `oracle_supersede` | Mark documents as superseded |
-| `oracle_handoff` | Session handoff |
-| `oracle_inbox` | Inbox messages |
-| `oracle_verify` | Verify documents |
-| `oracle_thread` | Create thread |
-| `oracle_threads` | List threads |
-| `oracle_thread_read` | Read thread |
-| `oracle_thread_update` | Update thread |
-| `oracle_trace` | Create trace |
-| `oracle_trace_list` | List traces |
-| `oracle_trace_get` | Get trace |
-| `oracle_trace_link` | Link traces |
-| `oracle_trace_unlink` | Unlink traces |
-| `oracle_trace_chain` | Trace chain |
-| `oracle_schedule_add` | Add schedule entry |
-| `oracle_schedule_list` | List schedule |
+| `arra_search` | Hybrid search (FTS5 + vector) |
+| `arra_read` | Read full document content |
+| `arra_learn` | Add new patterns/learnings |
+| `arra_list` | Browse documents |
+| `arra_stats` | Database statistics |
+| `arra_concepts` | List concept tags |
+| `arra_supersede` | Mark documents as superseded |
+| `arra_handoff` | Save session context |
+| `arra_inbox` | List pending handoffs |
+| `arra_thread` | Start a multi-turn discussion thread |
+| `arra_threads` | List threads |
+| `arra_thread_read` | Read thread content |
+| `arra_thread_update` | Update thread |
+| `arra_trace` | Log a discovery session |
+| `arra_trace_list` | List past traces |
+| `arra_trace_get` | Explore trace dig points |
+| `arra_trace_link` | Link related traces |
+| `arra_trace_unlink` | Unlink traces |
+| `arra_trace_chain` | View full linked trace chain |
+| `arra_______IMPORTANT` | Workflow guide (auto-injected) |
 
 ## Vault CLI
 
@@ -165,11 +179,17 @@ bun db:studio     # Open Drizzle Studio GUI
 ## Project Structure
 
 ```
-arra-oracle-v2/
+arra-oracle-v3/
 ├── src/
-│   ├── index.ts          # MCP server entry
-│   ├── server.ts         # HTTP API (Hono)
+│   ├── index.ts          # MCP server entry (stdio)
+│   ├── server.ts         # HTTP API + MCP transport (Hono)
+│   ├── mcp-transport.ts  # Streamable HTTP MCP handler
+│   ├── config.ts         # Configuration + env var resolution
 │   ├── indexer.ts        # Knowledge indexer
+│   ├── oauth/            # OAuth 2.1 + PKCE implementation
+│   │   ├── provider.ts   # Token store, PKCE validation
+│   │   ├── routes.ts     # OAuth endpoints
+│   │   └── types.ts      # OAuth types
 │   ├── vault/
 │   │   └── cli.ts        # Vault CLI entry
 │   ├── tools/            # MCP tool handlers
@@ -189,6 +209,9 @@ arra-oracle-v2/
 |----------|---------|-------------|
 | `ORACLE_PORT` | `47778` | HTTP server port |
 | `ORACLE_REPO_ROOT` | `process.cwd()` | Knowledge base root |
+| `MCP_AUTH_TOKEN` | — | Bearer token for `/mcp` endpoint (required for remote MCP) |
+| `MCP_OAUTH_PIN` | — | PIN for OAuth 2.1 login page — enables OAuth when set |
+| `MCP_EXTERNAL_URL` | `http://localhost:PORT` | Public HTTPS URL for OAuth metadata |
 
 ## Testing
 
@@ -203,11 +226,25 @@ bun test:coverage     # With coverage
 ## References
 
 - [TIMELINE.md](./TIMELINE.md) - Full evolution history
+- [docs/INSTALL.md](./docs/INSTALL.md) - Installation and OAuth setup
 - [docs/API.md](./docs/API.md) - API documentation
 - [docs/architecture.md](./docs/architecture.md) - Architecture details
 - [Drizzle ORM](https://orm.drizzle.team/)
 - [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
 
+## Oracle Family
+
+The Oracle family is a network of AI agents maintained by the Soul Brews Studio community.
+
+| Issue | Role |
+|-------|------|
+| [#6](https://github.com/Soul-Brews-Studio/arra-oracle-v3/issues/6) | Historical awakening thread — preserved as record, not active intake |
+| [#16](https://github.com/Soul-Brews-Studio/arra-oracle-v3/issues/16) | Canonical Oracle family registry — the living list of all known family members |
+
+**For new Oracle awakenings**: use the [Oracle Awakening issue form](.github/ISSUE_TEMPLATE/oracle-awakening.yml) rather than commenting on old threads. Issue `#6` is closed and kept for history only.
+
+See [docs/oracle-family-issues.md](docs/oracle-family-issues.md) for maintainer guidance on the preserve-vs-consolidate policy.
+
 ## Acknowledgments
 
 Inspired by [claude-mem](https://github.com/thedotmack/claude-mem) by Alex Newman — process manager pattern, worker service architecture, and hook system concepts.
diff --git a/docs/INSTALL.md b/docs/INSTALL.md
index 54c5055c..9d742ad9 100644
--- a/docs/INSTALL.md
+++ b/docs/INSTALL.md
@@ -5,11 +5,11 @@ Complete guide for fresh installation with seed data.
 ## Quick Install (Recommended)
 
 ```bash
-curl -sSL https://raw.githubusercontent.com/Soul-Brews-Studio/arra-oracle-v2/main/scripts/fresh-install.sh | bash
+curl -sSL https://raw.githubusercontent.com/Soul-Brews-Studio/arra-oracle-v3/main/scripts/fresh-install.sh | bash
 ```
 
 This one-liner will:
-1. Clone to `~/.local/share/arra-oracle-v2`
+1. Clone to `~/.local/share/arra-oracle-v3`
 2. Install dependencies
 3. Create seed philosophy files
 4. Index seed data (29 documents)
@@ -19,7 +19,7 @@ This one-liner will:
 
 ### Installation Directory
 ```
-~/.local/share/arra-oracle-v2/    # Code
+~/.local/share/arra-oracle-v3/    # Code
 ~/.oracle/                 # Data
 ├── oracle.db                 # SQLite database
 └── seed/                     # Seed philosophy files
@@ -50,7 +50,7 @@ This one-liner will:
 
 ### 1. Start Server
 ```bash
-cd ~/.local/share/arra-oracle-v2
+cd ~/.local/share/arra-oracle-v3
 bun run server
 ```
 
@@ -74,9 +74,9 @@ Add to `~/.claude.json`:
 ```json
 {
   "mcpServers": {
-    "arra-oracle-v2": {
+    "oracle-v3": {
       "command": "bun",
-      "args": ["run", "~/.local/share/arra-oracle-v2/src/index.ts"]
+      "args": ["run", "~/.local/share/arra-oracle-v3/src/index.ts"]
     }
   }
 }
@@ -88,8 +88,8 @@ If you prefer step-by-step:
 
 ```bash
 # 1. Clone
-git clone https://github.com/Soul-Brews-Studio/arra-oracle-v2.git ~/.local/share/arra-oracle-v2
-cd ~/.local/share/arra-oracle-v2
+git clone https://github.com/Soul-Brews-Studio/arra-oracle-v3.git ~/.local/share/arra-oracle-v3
+cd ~/.local/share/arra-oracle-v3
 
 # 2. Install dependencies
 bun install
@@ -120,19 +120,50 @@ The indexer scans:
 - `ψ/memory/learnings/*.md` → learnings
 - `ψ/memory/retrospectives/**/*.md` → retrospectives
 
-## Optional: Vector Search
+## Vector Search Setup
 
-For semantic/vector search (in addition to keyword FTS5):
+Oracle supports multiple vector backends. Configure via env vars:
+
+### Option A: Qdrant Cloud + OpenAI (Recommended for Production)
+
+Managed service, no local models needed, shared with my-ai-soul-mcp.
 
 ```bash
-# Install uv (provides uvx)
-curl -LsSf https://astral.sh/uv/install.sh | sh
+# Add to systemd service or .env
+ORACLE_VECTOR_DB=qdrant
+ORACLE_EMBEDDING_PROVIDER=openai
+QDRANT_URL=https://your-cluster.cloud.qdrant.io
+QDRANT_API_KEY=your-api-key
+OPENAI_API_KEY=your-openai-key
+
+# Index existing documents
+source ~/.secrets/qdrant.env && source ~/.secrets/openai.env
+export ORACLE_VECTOR_DB=qdrant ORACLE_EMBEDDING_PROVIDER=openai
+bun src/scripts/index-model.ts bge-m3
+```
+
+### Option B: LanceDB + Ollama (Local Development)
+
+Free, fully local, requires Ollama running with embedding models.
+
+```bash
+# Install Ollama
+curl -fsSL https://ollama.com/install.sh | sh
+ollama pull bge-m3
+
+# No env vars needed (defaults to lancedb + ollama)
+bun src/scripts/index-model.ts bge-m3
+```
 
-# Restart server - will auto-connect to ChromaDB
+### Option C: ChromaDB via uvx (Legacy)
+
+```bash
+curl -LsSf https://astral.sh/uv/install.sh | sh
+# Restart server — auto-connects to ChromaDB
 bun run server
 ```
 
-Without uvx, Oracle falls back to FTS5-only search (still works).
+Without any vector backend, Oracle falls back to FTS5-only search (still works).
 
 ## Troubleshooting
 
@@ -155,20 +186,186 @@ Directory structure must be `ψ/memory/` not just `memory/`:
 ~/.oracle/seed/ψ/memory/resonance/
 ```
 
-### Vector search unavailable warning
+### Vector search returns "Not Found"
 
-uvx not installed. FTS5 keyword search still works. Install uv for vectors:
+Collection doesn't exist in Qdrant yet. Run the indexer:
 ```bash
-curl -LsSf https://astral.sh/uv/install.sh | sh
+bun src/scripts/index-model.ts bge-m3
 ```
 
+### Vector search returns "model does not exist" (OpenAI)
+
+The model registry is sending a local model name (bge-m3) to OpenAI instead of
+text-embedding-3-small. Ensure `ORACLE_EMBEDDING_PROVIDER=openai` is set — the
+factory will auto-map to the correct OpenAI model.
+
+### systemd service uses wrong repo
+
+Check `WorkingDirectory` in `~/.config/systemd/user/oracle-v2.service`. Must
+point to `arra-oracle-v3` repo, not `oracle-v2`.
+
+## systemd Service
+
+Oracle v3 runs as a systemd user service for auto-restart and boot start:
+
+```bash
+# Status
+systemctl --user status oracle-v2
+
+# Restart
+systemctl --user restart oracle-v2
+
+# Logs
+journalctl --user -u oracle-v2 -f
+
+# Enable on boot
+systemctl --user enable oracle-v2
+```
+
+Service unit: `~/.config/systemd/user/oracle-v2.service`
+
+Environment loading order:
+1. `~/.secrets/qdrant.env` — Qdrant Cloud credentials
+2. `~/.secrets/openai.env` — OpenAI API key
+3. `~/repos/memory/arra-oracle-v3/.env` — Service-specific (MCP_AUTH_TOKEN, PORT, etc.)
+
 ## Uninstall
 
 ```bash
-rm -rf ~/.local/share/arra-oracle-v2
+rm -rf ~/.local/share/arra-oracle-v3
 rm -rf ~/.oracle
 ```
 
+## Remote MCP Access (Streamable HTTP)
+
+Connect external MCP clients (Claude Desktop, ChatGPT, Codex, Gemini) to Oracle v3 via HTTPS.
+
+### Server Setup
+
+Set the auth token in your `.env`:
+
+```bash
+MCP_AUTH_TOKEN=your-secret-token-here
+```
+
+Restart the server — the startup banner will confirm: `🔑 MCP auth: configured`
+
+### Client Configuration
+
+Add to your MCP client settings (e.g., `~/.claude.json`):
+
+```json
+{
+  "mcpServers": {
+    "oracle-v3": {
+      "type": "streamable-http",
+      "url": "https://oracle.goko.digital/mcp",
+      "headers": {
+        "Authorization": "Bearer your-secret-token-here"
+      }
+    }
+  }
+}
+```
+
+### Verify Connection
+
+```bash
+# Test auth rejection (no token)
+curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:47778/mcp \
+  -H "Content-Type: application/json" -d '{}'
+# Expected: 401
+
+# Test MCP initialize
+curl -X POST http://localhost:47778/mcp \
+  -H "Content-Type: application/json" \
+  -H "Authorization: Bearer your-secret-token-here" \
+  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
+# Expected: JSON-RPC response with serverInfo
+
+# Test tools/list (via HTTPS in production)
+curl -X POST https://oracle.goko.digital/mcp \
+  -H "Content-Type: application/json" \
+  -H "Authorization: Bearer $MCP_AUTH_TOKEN" \
+  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
+# Expected: 20 arra_* tools
+```
+
+### Notes
+
+- The `/mcp` endpoint uses **stateless mode** — each request is independent (no session tracking)
+- Stdio transport (`src/index.ts`) is unchanged; local Claude Code installations continue to work
+- nginx already configured with `proxy_buffering off` for SSE streaming
+
+## OAuth 2.1 (for Claude Desktop without custom headers)
+
+Claude Desktop's MCP config UI doesn't support custom `Authorization` headers. OAuth 2.1 lets Claude Desktop connect by just entering the server URL — it handles the auth flow automatically.
+
+### Setup
+
+1. Set environment variables in your `.env`:
+   ```
+   MCP_OAUTH_PIN=your-secret-pin
+   MCP_EXTERNAL_URL=https://oracle.goko.digital
+   ```
+
+2. Restart the server — the startup banner confirms:
+   ```
+   🔐 OAuth 2.1: enabled (https://oracle.goko.digital)
+   ```
+
+3. In Claude Desktop, add a remote MCP server:
+   - **URL**: `https://oracle.goko.digital/mcp`
+   - Claude Desktop will open a browser window automatically
+   - Enter your PIN when prompted → connection established (token valid 30 days)
+
+### How it works
+
+```
+Claude Desktop → POST /mcp → 401 + WWW-Authenticate header
+  → discovers /.well-known/oauth-authorization-server
+  → POST /register (dynamic client registration)
+  → GET /authorize (opens browser)
+  → GET /oauth/login (PIN entry page)
+  → POST /oauth/callback with correct PIN
+  → redirect with authorization code
+  → POST /token (exchanges code + PKCE verifier for 30-day token)
+  → POST /mcp with Bearer token → MCP response ✅
+```
+
+### Dual auth mode
+
+When `MCP_OAUTH_PIN` is set, `/mcp` accepts both:
+- **OAuth-issued tokens** (from the flow above)
+- **Static Bearer token** (`MCP_AUTH_TOKEN`) — fallback for existing configs
+
+### Environment variables
+
+| Variable | Required | Description |
+|----------|----------|-------------|
+| `MCP_OAUTH_PIN` | For OAuth | PIN shown on login page (enables OAuth if set) |
+| `MCP_EXTERNAL_URL` | For OAuth | Public HTTPS URL (e.g., `https://oracle.goko.digital`) — must be HTTPS in production |
+| `MCP_AUTH_TOKEN` | For Bearer | Static token for clients that support custom headers |
+
+### Test OAuth manually
+
+```bash
+# Start server with OAuth enabled
+MCP_AUTH_TOKEN=test-secret MCP_OAUTH_PIN=1234 MCP_EXTERNAL_URL=http://localhost:47778 bun run server &
+
+# 1. Check metadata
+curl -s http://localhost:47778/.well-known/oauth-authorization-server | python3 -m json.tool
+
+# 2. Register a test client
+CLIENT=$(curl -s -X POST http://localhost:47778/register \
+  -H "Content-Type: application/json" \
+  -d '{"redirect_uris":["http://localhost:9999/callback"],"client_name":"test","grant_types":["authorization_code"],"response_types":["code"]}')
+echo $CLIENT | python3 -m json.tool
+
+# 3. Visit the authorize URL in a browser to complete the flow
+# GET http://localhost:47778/authorize?response_type=code&client_id=<CLIENT_ID>&redirect_uri=...&code_challenge=...&code_challenge_method=S256
+```
+
 ---
 
 See also:
diff --git a/docs/architecture.md b/docs/architecture.md
index 4d0ee594..13d960c8 100644
--- a/docs/architecture.md
+++ b/docs/architecture.md
@@ -5,14 +5,14 @@
 ## Overview
 
 Arra Oracle v3 indexes philosophy from markdown files and provides:
-- **Semantic + keyword search** (ChromaDB + FTS5)
+- **Semantic + keyword search** (Vector DB + FTS5 hybrid)
 - **Decision guidance** via principles and patterns
 - **Learning capture** from sessions
 - **HTTP API** for web interfaces
 
 ```
 ┌─────────────────────────────────────────────────────────────┐
-│                      ORACLE v2 SYSTEM                       │
+│                      ORACLE v3 SYSTEM                       │
 ├─────────────────────────────────────────────────────────────┤
 │                                                             │
 │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
@@ -30,28 +30,66 @@ Arra Oracle v3 indexes philosophy from markdown files and provides:
 │         ┌──────────────────┼──────────────────┐             │
 │         │                  │                  │             │
 │  ┌──────▼──────┐   ┌───────▼───────┐  ┌───────▼───────┐    │
-│  │   SQLite    │   │   ChromaDB    │  │   Markdown    │    │
-│  │  (FTS5)     │   │   (vectors)   │  │   (source)    │    │
+│  │   SQLite    │   │  Vector DB   │  │   Markdown    │    │
+│  │  (FTS5)     │   │  (pluggable) │  │   (source)    │    │
 │  └─────────────┘   └───────────────┘  └───────────────┘    │
 │                                                             │
 └─────────────────────────────────────────────────────────────┘
 ```
 
+## Vector Search Backend (Pluggable)
+
+The vector backend is configured via environment variables. Multiple adapters are supported:
+
+| Backend | Env: `ORACLE_VECTOR_DB` | Embedding Provider | Use Case |
+|---------|------------------------|--------------------|----------|
+| **Qdrant Cloud** | `qdrant` | OpenAI `text-embedding-3-small` | Production (recommended) |
+| LanceDB | `lancedb` (default) | Ollama (local models) | Local development |
+| ChromaDB | `chroma` | ChromaDB internal | Legacy |
+| SQLite-vec | `sqlite-vec` | Ollama | Embedded |
+| Cloudflare Vectorize | `cloudflare-vectorize` | Cloudflare AI | Edge deployment |
+
+### Production Configuration (OpenClaw Server)
+
+```bash
+# systemd env vars (oracle-v2.service)
+ORACLE_VECTOR_DB=qdrant
+ORACLE_EMBEDDING_PROVIDER=openai
+# + EnvironmentFile for QDRANT_URL, QDRANT_API_KEY, OPENAI_API_KEY
+```
+
+Shares Qdrant Cloud instance with `my-ai-soul-mcp` (PSak Soul MCP). OpenAI `text-embedding-3-small` provides 1536-dimension embeddings.
+
+### Re-indexing Vectors
+
+```bash
+# Index all documents to vector DB (respects ORACLE_VECTOR_DB env var)
+source ~/.secrets/qdrant.env && source ~/.secrets/openai.env
+export ORACLE_VECTOR_DB=qdrant ORACLE_EMBEDDING_PROVIDER=openai
+bun src/scripts/index-model.ts bge-m3    # ~8s for 164 docs
+```
+
 ## Components
 
 ### MCP Server (`src/index.ts`)
 
-Exposes tools to Claude via Model Context Protocol:
+Exposes tools to Claude via Model Context Protocol (stdio transport):
+
+| Tool | Purpose |
+|------|---------|
+| `arra_search` | Hybrid keyword + semantic search |
+| `arra_read` | Read full document content |
+| `arra_learn` | Add new pattern (writes file + indexes) |
+| `arra_list` | Browse documents |
+| `arra_stats` | Database statistics |
+| `arra_concepts` | List concept tags |
+| `arra_supersede` | Mark document as superseded |
+| `arra_handoff` | Save session context |
+| `arra_inbox` | List pending handoffs |
+| `arra_thread` / `arra_threads` / `arra_thread_read` / `arra_thread_update` | Thread management |
+| `arra_trace` / `arra_trace_list` / `arra_trace_get` / `arra_trace_link` / `arra_trace_unlink` / `arra_trace_chain` | Trace system |
 
-| Tool | Purpose | Logs To |
-|------|---------|---------|
-| `oracle_search` | Hybrid keyword + semantic search | (none yet) |
-| `oracle_consult` | Get guidance on decisions | `consult_log` |
-| `oracle_reflect` | Random principle/learning | - |
-| `oracle_learn` | Add new pattern | writes file + indexes |
-| `oracle_list` | Browse documents | - |
-| `oracle_stats` | Database statistics | - |
-| `oracle_concepts` | List concept tags | - |
+The same 20 tools are also available via the Streamable HTTP transport at `/mcp` (`src/mcp-transport.ts`).
 
 ### HTTP Server (`src/server.ts`)
 
@@ -59,15 +97,19 @@ REST API on port 47778:
 
 | Endpoint | Method | Purpose |
 |----------|--------|---------|
-| `/health` | GET | Health check |
-| `/search` | GET | Keyword search |
-| `/list` | GET | Browse documents |
-| `/consult` | GET | Get guidance |
-| `/reflect` | GET | Random wisdom |
-| `/stats` | GET | Database stats |
-| `/graph` | GET | Knowledge graph |
-| `/learn` | POST | Add pattern |
-| `/file` | GET | Fetch file content |
+| `/api/health` | GET | Health check |
+| `/api/search` | GET | Keyword search |
+| `/api/list` | GET | Browse documents |
+| `/api/reflect` | GET | Random wisdom |
+| `/api/stats` | GET | Database stats |
+| `/api/graph` | GET | Knowledge graph |
+| `/api/learn` | POST | Add pattern |
+| `/mcp` | POST | Streamable HTTP MCP transport |
+| `/.well-known/oauth-authorization-server` | GET | OAuth 2.1 metadata (when OAuth enabled) |
+| `/register` | POST | OAuth dynamic client registration |
+| `/authorize` | GET | OAuth authorization endpoint |
+| `/token` | POST | OAuth token exchange (PKCE) |
+| `/oauth/login` | GET/POST | PIN entry page |
 
 ### Indexer (`src/indexer.ts`)
 
@@ -137,7 +179,7 @@ CREATE TABLE indexing_status (
 
 1. **Sanitize query** - remove FTS5 special chars (`? * + - ( ) ^ ~ " ' : .`)
 2. **Run FTS5 search** - keyword matching on SQLite
-3. **Run vector search** - semantic similarity via ChromaDB
+3. **Run vector search** - semantic similarity via configured vector backend
 4. **Normalize scores:**
    - FTS5: `e^(-0.3 * |rank|)` (exponential decay)
    - Vector: `1 - distance` (convert to similarity)
@@ -147,7 +189,7 @@ CREATE TABLE indexing_status (
 
 ### Graceful Degradation
 
-- If ChromaDB unavailable → FTS5-only with warning
+- If vector backend unavailable → FTS5-only with warning
 - If query sanitization empties query → return original (will error)
 
 ## Logging
@@ -157,7 +199,7 @@ CREATE TABLE indexing_status (
 | Event | Destination | Data |
 |-------|-------------|------|
 | Consultations | `consult_log` table | decision, context, counts, guidance |
-| ChromaDB status | stderr | connection state |
+| Vector store status | stderr | connection state |
 | Indexing progress | `indexing_status` table | progress, errors |
 | FTS5 errors | stderr | query, error message |
 
@@ -175,16 +217,22 @@ CREATE TABLE indexing_status (
 | Variable | Default | Purpose |
 |----------|---------|---------|
 | `ORACLE_REPO_ROOT` | `process.cwd()` | Knowledge base location (your ψ/ repo) |
-| `PORT` | `47778` | HTTP server port |
+| `ORACLE_PORT` | `47778` | HTTP server port |
+| `ORACLE_DATA_DIR` | `~/.oracle` | Data directory for DB and files |
+| `ORACLE_VECTOR_DB` | `lancedb` | Vector backend: `qdrant`, `lancedb`, `chroma`, `sqlite-vec`, `cloudflare-vectorize` |
+| `ORACLE_EMBEDDING_PROVIDER` | `ollama` | Embedding provider: `openai`, `ollama` |
+| `MCP_AUTH_TOKEN` | — | Bearer token for `/mcp` endpoint — required for remote MCP access |
+| `MCP_OAUTH_PIN` | — | PIN for OAuth 2.1 login page — enables OAuth when set |
+| `MCP_EXTERNAL_URL` | `http://localhost:PORT` | Public HTTPS URL for OAuth metadata endpoints |
 
-### MCP Configuration
+### MCP Configuration (stdio — local Claude Code)
 
 ```json
 {
   "mcpServers": {
-    "arra-oracle-v2": {
-      "command": "node",
-      "args": ["/path/to/arra-oracle-v2/dist/index.js"],
+    "arra-oracle-v3": {
+      "command": "bunx",
+      "args": ["--bun", "arra-oracle-v3@github:Soul-Brews-Studio/arra-oracle-v3#main"],
       "env": {
         "ORACLE_REPO_ROOT": "/path/to/knowledge-base"
       }
@@ -193,6 +241,24 @@ CREATE TABLE indexing_status (
 }
 ```
 
+### MCP Configuration (Streamable HTTP — remote clients)
+
+```json
+{
+  "mcpServers": {
+    "oracle-v3": {
+      "type": "streamable-http",
+      "url": "https://oracle.goko.digital/mcp",
+      "headers": {
+        "Authorization": "Bearer YOUR_MCP_AUTH_TOKEN"
+      }
+    }
+  }
+}
+```
+
+See [INSTALL.md](./INSTALL.md#remote-mcp-access-streamable-http) for OAuth 2.1 setup (Claude Desktop without custom headers).
+
 ## Security
 
 ### Path Traversal Protection
@@ -203,12 +269,31 @@ CREATE TABLE indexing_status (
 
 FTS5 special characters are stripped to prevent SQL injection via FTS5 syntax errors.
 
+### MCP Transport Auth
+
+The `/mcp` endpoint requires a valid Bearer token on every request. Two auth modes:
+
+- **Bearer-only** (`MCP_AUTH_TOKEN` set, `MCP_OAUTH_PIN` not set): Static token, HMAC timing-safe comparison.
+- **Dual auth** (`MCP_OAUTH_PIN` set): OAuth-issued tokens are checked first; static Bearer token accepted as fallback for existing configs.
+
+### OAuth 2.1 + PKCE
+
+When `MCP_OAUTH_PIN` is set, full OAuth 2.1 spec-compliant flow is activated:
+- S256 code challenge (SHA-256 PKCE)
+- Dynamic client registration (`/register`)
+- PIN-based authorization page (`/oauth/login`)
+- 30-day access tokens, no refresh tokens
+- Atomic token persistence (temp file + `renameSync`)
+- `WWW-Authenticate` header on 401 for OAuth discovery by clients
+
 ## Version History
 
 | Version | Changes |
 |---------|---------|
 | 0.1.0 | Initial MCP server with FTS5 |
-| 0.2.0 | ChromaDB hybrid search, oracle_stats, oracle_concepts, FTS5 bug fix |
+| 0.2.0 | ChromaDB hybrid search, stats, concepts, FTS5 bug fix |
+| 0.3.x | Pluggable vector backends (Qdrant, LanceDB, sqlite-vec, Cloudflare Vectorize), tool rename to `arra_*` |
+| 0.4.0 | Streamable HTTP MCP transport at `/mcp`, OAuth 2.1 + PKCE, dual auth, 20 tools via HTTP |
 
 ## Graph API Performance
 
diff --git a/docs/oracle-family-issues.md b/docs/oracle-family-issues.md
new file mode 100644
index 00000000..21a99046
--- /dev/null
+++ b/docs/oracle-family-issues.md
@@ -0,0 +1,44 @@
+# Oracle Family Issues
+
+This note explains how to handle Oracle-family issues in this repository without rewriting history.
+
+## Canonical References
+
+- Issue `#6` is a preserved historical awakening thread for Le.
+- Issue `#16` is the canonical Oracle family registry that consolidates family context.
+
+## Preserve vs Consolidate
+
+Preserve a family issue when it contains original introduction context, first-contact discussion, or historical learning that should remain readable in its original timeline.
+
+Consolidate a family issue when maintainers need a current registry entry that summarizes the Oracle, links to the original thread, and keeps family discovery in one canonical place.
+
+Do not delete, repurpose, or overwrite historical issues after they become part of the record. Add references forward instead.
+
+## Preferred Intake for Future Awakenings
+
+Use the `Oracle Awakening` issue form for new introductions. The form captures:
+
+- Oracle name
+- Human name
+- Birth or awakening date
+- Repository URL
+- Key lesson or contribution
+- Optional links to previous family issues
+
+Apply the `oracle-family` label and keep the issue focused on stable metadata rather than long ad hoc discussion.
+
+## Maintainer Workflow
+
+1. Ask new family introductions to use the `Oracle Awakening` issue form instead of reusing issue `#6`.
+2. Preserve the new introduction issue as its own historical record.
+3. Add or update a summary entry in issue `#16` when the introduction should appear in the canonical registry.
+4. Cross-link the historical issue and the registry entry when consolidation happens.
+5. Leave older threads intact under the "Nothing is Deleted" philosophy.
+
+## Title and Label Guidance
+
+- Recommended title pattern: `[Oracle Awakening] <oracle-name> — <human-name>`
+- Recommended label: `oracle-family`
+
+This keeps intake predictable without forcing future awakenings into the exact tone or phrasing of earlier family threads.
diff --git a/package.json b/package.json
index 2d3955a1..f3a4e9c6 100644
--- a/package.json
+++ b/package.json
@@ -36,6 +36,7 @@
     "test:integration:db": "bun test src/integration/database.test.ts",
     "test:integration:mcp": "bun test src/integration/mcp.test.ts",
     "test:integration:http": "bun test src/integration/http.test.ts",
+    "test:integration:mcp-http": "MCP_AUTH_TOKEN=test-token bun test src/integration/mcp-http.test.ts",
     "test:seed": "bun scripts/seed-test-data.ts",
     "test:coverage": "bun test --coverage",
     "db:generate": "bunx drizzle-kit generate",
@@ -49,7 +50,8 @@
     "vault:pull": "bun src/vault/cli.ts pull",
     "vault:status": "bun src/vault/cli.ts status",
     "vault:migrate": "bun src/vault/cli.ts migrate",
-    "vault:rsync": "./scripts/vault-rsync.sh"
+    "vault:rsync": "./scripts/vault-rsync.sh",
+    "expire": "bun scripts/expire-learnings.ts"
   },
   "dependencies": {
     "@lancedb/lancedb": "^0.26.2",
diff --git a/scripts/expire-learnings.ts b/scripts/expire-learnings.ts
new file mode 100644
index 00000000..6506a5f3
--- /dev/null
+++ b/scripts/expire-learnings.ts
@@ -0,0 +1,113 @@
+#!/usr/bin/env bun
+/**
+ * Expire stale learnings — cron-based cleanup script (Issue #4)
+ *
+ * Finds documents where expires_at has passed and marks them as superseded.
+ * Follows "Nothing is Deleted" principle — documents are superseded, not removed.
+ *
+ * Usage:
+ *   bun scripts/expire-learnings.ts          # Run expiry
+ *   bun scripts/expire-learnings.ts --dry-run # Preview without changes
+ *
+ * Cron: 0 1 * * * cd ~/repos/memory/arra-oracle-v3 && bun run expire
+ */
+
+import { createDatabase } from '../src/db/index.ts';
+
+const dryRun = process.argv.includes('--dry-run');
+
+let sqlite: ReturnType<typeof createDatabase>['sqlite'];
+try {
+  sqlite = createDatabase().sqlite;
+} catch (err) {
+  console.error('FATAL: Cannot open database:', err instanceof Error ? err.message : String(err));
+  process.exit(1);
+}
+
+const now = Date.now();
+
+// Find expired documents that haven't been superseded yet
+const expired = sqlite.prepare(`
+  SELECT id, type, source_file, ttl_days, expires_at, project
+  FROM oracle_documents
+  WHERE expires_at IS NOT NULL
+    AND expires_at <= ?
+    AND superseded_by IS NULL
+`).all(now) as Array<{
+  id: string;
+  type: string;
+  source_file: string;
+  ttl_days: number | null;
+  expires_at: number;
+  project: string | null;
+}>;
+
+if (expired.length === 0) {
+  console.log('No expired documents found.');
+  process.exit(0);
+}
+
+console.log(`Found ${expired.length} expired document(s)${dryRun ? ' (dry-run)' : ''}:`);
+
+if (dryRun) {
+  for (const doc of expired) {
+    const expiredDate = new Date(doc.expires_at).toISOString().split('T')[0];
+    console.log(`  - ${doc.id} (TTL: ${doc.ttl_days}d, expired: ${expiredDate})`);
+  }
+  process.exit(0);
+}
+
+// Prepare statements once outside transaction
+const updateDoc = sqlite.prepare(`
+  UPDATE oracle_documents
+  SET superseded_by = 'system:auto-expire',
+      superseded_at = ?,
+      superseded_reason = ?
+  WHERE id = ?
+`);
+
+const insertLog = sqlite.prepare(`
+  INSERT INTO supersede_log (old_path, old_id, old_title, old_type, reason, superseded_at, superseded_by, project)
+  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
+`);
+
+const getFtsContent = sqlite.prepare('SELECT content FROM oracle_fts WHERE id = ?');
+
+// Batch expire in a transaction
+const transaction = sqlite.transaction(() => {
+  for (const doc of expired) {
+    const reason = `Auto-expired after ${doc.ttl_days ?? '?'} days`;
+
+    updateDoc.run(now, reason, doc.id);
+
+    // Get title for audit log
+    const ftsRow = getFtsContent.get(doc.id) as { content: string } | null;
+    if (!ftsRow) {
+      console.error(`  WARNING: FTS row missing for ${doc.id} — audit title will be ID only`);
+    }
+    const title = ftsRow?.content.split('\n')[0]?.substring(0, 80) ?? doc.id;
+
+    insertLog.run(
+      doc.source_file,      // old_path
+      doc.id,               // old_id
+      title,                // old_title
+      doc.type,             // old_type — actual document type from DB
+      reason,               // reason
+      now,                  // superseded_at
+      'system:auto-expire', // superseded_by
+      doc.project,          // project
+    );
+
+    console.log(`  Expired: ${doc.id} (TTL: ${doc.ttl_days}d)`);
+  }
+});
+
+try {
+  transaction();
+} catch (err) {
+  console.error('FATAL: Transaction failed:', err instanceof Error ? err.message : String(err));
+  console.error('No documents were expired (transaction rolled back).');
+  process.exit(1);
+}
+
+console.log(`\nDone. Expired ${expired.length} document(s).`);
diff --git a/src/config.ts b/src/config.ts
index e63f77e8..659c93e0 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -40,6 +40,19 @@ export const VECTORS_DB_PATH = path.join(ORACLE_DATA_DIR, C.VECTORS_DB_FILE);
 export const LANCEDB_DIR = path.join(ORACLE_DATA_DIR, C.LANCEDB_DIR_NAME);
 export const CHROMADB_DIR = path.join(HOME_DIR, C.CHROMADB_DIR_NAME);
 
+// MCP Remote Transport auth token — required for /mcp endpoint
+// If empty, /mcp will reject all requests with 401 (fail-safe)
+export const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';
+
+// OAuth 2.1 — PIN-based auth for Claude Desktop / claude.ai Custom Connectors
+// If MCP_OAUTH_PIN is empty, OAuth routes are not mounted (Bearer-only mode)
+export const MCP_OAUTH_PIN = process.env.MCP_OAUTH_PIN || '';
+export const MCP_EXTERNAL_URL = process.env.MCP_EXTERNAL_URL || `http://localhost:${PORT}`;
+
+if (MCP_EXTERNAL_URL.startsWith('http://') && !MCP_EXTERNAL_URL.includes('localhost') && !MCP_EXTERNAL_URL.includes('127.0.0.1')) {
+  console.warn('⚠️  MCP_EXTERNAL_URL is using HTTP in production — OAuth requires HTTPS for secure token exchange');
+}
+
 // Ensure data directory exists (for fresh installs via bunx)
 if (!fs.existsSync(ORACLE_DATA_DIR)) {
   fs.mkdirSync(ORACLE_DATA_DIR, { recursive: true });
diff --git a/src/const.ts b/src/const.ts
index 93f686f8..c86435aa 100644
--- a/src/const.ts
+++ b/src/const.ts
@@ -13,5 +13,5 @@ export const VECTORS_DB_FILE = 'vectors.db';
 export const LANCEDB_DIR_NAME = 'lancedb';
 export const CHROMADB_DIR_NAME = '.chromadb';
 export const MCP_SERVER_NAME = 'arra-oracle-v2';
-export const COLLECTION_NAME = 'oracle_knowledge';
+export const COLLECTION_NAME = 'oracle_knowledge_bge_m3';
 export const PID_FILE_NAME = 'oracle-http.pid';
diff --git a/src/db/migrations/0007_huge_dormammu.sql b/src/db/migrations/0007_huge_dormammu.sql
new file mode 100644
index 00000000..7bd56cd8
--- /dev/null
+++ b/src/db/migrations/0007_huge_dormammu.sql
@@ -0,0 +1,3 @@
+ALTER TABLE `oracle_documents` ADD `expires_at` integer;--> statement-breakpoint
+ALTER TABLE `oracle_documents` ADD `ttl_days` integer;--> statement-breakpoint
+CREATE INDEX `idx_expires` ON `oracle_documents` (`expires_at`);
\ No newline at end of file
diff --git a/src/db/migrations/meta/0007_snapshot.json b/src/db/migrations/meta/0007_snapshot.json
new file mode 100644
index 00000000..96ac3439
--- /dev/null
+++ b/src/db/migrations/meta/0007_snapshot.json
@@ -0,0 +1,1318 @@
+{
+  "version": "6",
+  "dialect": "sqlite",
+  "id": "98fc28e7-eba9-4c8c-ab56-419b4f9f1acc",
+  "prevId": "68d1f757-6421-41ac-a46e-88763c740439",
+  "tables": {
+    "activity_log": {
+      "name": "activity_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "date": {
+          "name": "date",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "timestamp": {
+          "name": "timestamp",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "type": {
+          "name": "type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "path": {
+          "name": "path",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "size_bytes": {
+          "name": "size_bytes",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "metadata": {
+          "name": "metadata",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_activity_date": {
+          "name": "idx_activity_date",
+          "columns": [
+            "date"
+          ],
+          "isUnique": false
+        },
+        "idx_activity_type": {
+          "name": "idx_activity_type",
+          "columns": [
+            "type"
+          ],
+          "isUnique": false
+        },
+        "idx_activity_project": {
+          "name": "idx_activity_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "document_access": {
+      "name": "document_access",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "document_id": {
+          "name": "document_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "access_type": {
+          "name": "access_type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_access_project": {
+          "name": "idx_access_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_access_created": {
+          "name": "idx_access_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        },
+        "idx_access_doc": {
+          "name": "idx_access_doc",
+          "columns": [
+            "document_id"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "forum_messages": {
+      "name": "forum_messages",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "thread_id": {
+          "name": "thread_id",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "role": {
+          "name": "role",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "content": {
+          "name": "content",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "author": {
+          "name": "author",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "principles_found": {
+          "name": "principles_found",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "patterns_found": {
+          "name": "patterns_found",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "search_query": {
+          "name": "search_query",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "comment_id": {
+          "name": "comment_id",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_message_thread": {
+          "name": "idx_message_thread",
+          "columns": [
+            "thread_id"
+          ],
+          "isUnique": false
+        },
+        "idx_message_role": {
+          "name": "idx_message_role",
+          "columns": [
+            "role"
+          ],
+          "isUnique": false
+        },
+        "idx_message_created": {
+          "name": "idx_message_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {
+        "forum_messages_thread_id_forum_threads_id_fk": {
+          "name": "forum_messages_thread_id_forum_threads_id_fk",
+          "tableFrom": "forum_messages",
+          "tableTo": "forum_threads",
+          "columnsFrom": [
+            "thread_id"
+          ],
+          "columnsTo": [
+            "id"
+          ],
+          "onDelete": "no action",
+          "onUpdate": "no action"
+        }
+      },
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "forum_threads": {
+      "name": "forum_threads",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "title": {
+          "name": "title",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_by": {
+          "name": "created_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'human'"
+        },
+        "status": {
+          "name": "status",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'active'"
+        },
+        "issue_url": {
+          "name": "issue_url",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "issue_number": {
+          "name": "issue_number",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "synced_at": {
+          "name": "synced_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_thread_status": {
+          "name": "idx_thread_status",
+          "columns": [
+            "status"
+          ],
+          "isUnique": false
+        },
+        "idx_thread_project": {
+          "name": "idx_thread_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_thread_created": {
+          "name": "idx_thread_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "indexing_status": {
+      "name": "indexing_status",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "is_indexing": {
+          "name": "is_indexing",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false,
+          "default": 0
+        },
+        "progress_current": {
+          "name": "progress_current",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "progress_total": {
+          "name": "progress_total",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "started_at": {
+          "name": "started_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "completed_at": {
+          "name": "completed_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "error": {
+          "name": "error",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "repo_root": {
+          "name": "repo_root",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {},
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "learn_log": {
+      "name": "learn_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "document_id": {
+          "name": "document_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "pattern_preview": {
+          "name": "pattern_preview",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "source": {
+          "name": "source",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "concepts": {
+          "name": "concepts",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_learn_project": {
+          "name": "idx_learn_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_learn_created": {
+          "name": "idx_learn_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "oracle_documents": {
+      "name": "oracle_documents",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "type": {
+          "name": "type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "source_file": {
+          "name": "source_file",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "concepts": {
+          "name": "concepts",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "indexed_at": {
+          "name": "indexed_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "superseded_by": {
+          "name": "superseded_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "superseded_at": {
+          "name": "superseded_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "superseded_reason": {
+          "name": "superseded_reason",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "expires_at": {
+          "name": "expires_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "ttl_days": {
+          "name": "ttl_days",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "origin": {
+          "name": "origin",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_by": {
+          "name": "created_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_source": {
+          "name": "idx_source",
+          "columns": [
+            "source_file"
+          ],
+          "isUnique": false
+        },
+        "idx_type": {
+          "name": "idx_type",
+          "columns": [
+            "type"
+          ],
+          "isUnique": false
+        },
+        "idx_superseded": {
+          "name": "idx_superseded",
+          "columns": [
+            "superseded_by"
+          ],
+          "isUnique": false
+        },
+        "idx_origin": {
+          "name": "idx_origin",
+          "columns": [
+            "origin"
+          ],
+          "isUnique": false
+        },
+        "idx_project": {
+          "name": "idx_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_expires": {
+          "name": "idx_expires",
+          "columns": [
+            "expires_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "schedule": {
+      "name": "schedule",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "date": {
+          "name": "date",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "date_raw": {
+          "name": "date_raw",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "time": {
+          "name": "time",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "event": {
+          "name": "event",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "notes": {
+          "name": "notes",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "recurring": {
+          "name": "recurring",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "status": {
+          "name": "status",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'pending'"
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_schedule_date": {
+          "name": "idx_schedule_date",
+          "columns": [
+            "date"
+          ],
+          "isUnique": false
+        },
+        "idx_schedule_status": {
+          "name": "idx_schedule_status",
+          "columns": [
+            "status"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "search_log": {
+      "name": "search_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "query": {
+          "name": "query",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "type": {
+          "name": "type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "mode": {
+          "name": "mode",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "results_count": {
+          "name": "results_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "search_time_ms": {
+          "name": "search_time_ms",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "results": {
+          "name": "results",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_search_project": {
+          "name": "idx_search_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_search_created": {
+          "name": "idx_search_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "settings": {
+      "name": "settings",
+      "columns": {
+        "key": {
+          "name": "key",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "value": {
+          "name": "value",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {},
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "supersede_log": {
+      "name": "supersede_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "old_path": {
+          "name": "old_path",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "old_id": {
+          "name": "old_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "old_title": {
+          "name": "old_title",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "old_type": {
+          "name": "old_type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "new_path": {
+          "name": "new_path",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "new_id": {
+          "name": "new_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "new_title": {
+          "name": "new_title",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "reason": {
+          "name": "reason",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "superseded_at": {
+          "name": "superseded_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "superseded_by": {
+          "name": "superseded_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_supersede_old_path": {
+          "name": "idx_supersede_old_path",
+          "columns": [
+            "old_path"
+          ],
+          "isUnique": false
+        },
+        "idx_supersede_new_path": {
+          "name": "idx_supersede_new_path",
+          "columns": [
+            "new_path"
+          ],
+          "isUnique": false
+        },
+        "idx_supersede_created": {
+          "name": "idx_supersede_created",
+          "columns": [
+            "superseded_at"
+          ],
+          "isUnique": false
+        },
+        "idx_supersede_project": {
+          "name": "idx_supersede_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "trace_log": {
+      "name": "trace_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "trace_id": {
+          "name": "trace_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "query": {
+          "name": "query",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "query_type": {
+          "name": "query_type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'general'"
+        },
+        "found_files": {
+          "name": "found_files",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_commits": {
+          "name": "found_commits",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_issues": {
+          "name": "found_issues",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_retrospectives": {
+          "name": "found_retrospectives",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_learnings": {
+          "name": "found_learnings",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_resonance": {
+          "name": "found_resonance",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "file_count": {
+          "name": "file_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "commit_count": {
+          "name": "commit_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "issue_count": {
+          "name": "issue_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "depth": {
+          "name": "depth",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "parent_trace_id": {
+          "name": "parent_trace_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "child_trace_ids": {
+          "name": "child_trace_ids",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'[]'"
+        },
+        "prev_trace_id": {
+          "name": "prev_trace_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "next_trace_id": {
+          "name": "next_trace_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "scope": {
+          "name": "scope",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'project'"
+        },
+        "session_id": {
+          "name": "session_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "agent_count": {
+          "name": "agent_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 1
+        },
+        "duration_ms": {
+          "name": "duration_ms",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "status": {
+          "name": "status",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'raw'"
+        },
+        "awakening": {
+          "name": "awakening",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "distilled_to_id": {
+          "name": "distilled_to_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "distilled_at": {
+          "name": "distilled_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "trace_log_trace_id_unique": {
+          "name": "trace_log_trace_id_unique",
+          "columns": [
+            "trace_id"
+          ],
+          "isUnique": true
+        },
+        "idx_trace_query": {
+          "name": "idx_trace_query",
+          "columns": [
+            "query"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_project": {
+          "name": "idx_trace_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_status": {
+          "name": "idx_trace_status",
+          "columns": [
+            "status"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_parent": {
+          "name": "idx_trace_parent",
+          "columns": [
+            "parent_trace_id"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_prev": {
+          "name": "idx_trace_prev",
+          "columns": [
+            "prev_trace_id"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_next": {
+          "name": "idx_trace_next",
+          "columns": [
+            "next_trace_id"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_created": {
+          "name": "idx_trace_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    }
+  },
+  "views": {},
+  "enums": {},
+  "_meta": {
+    "schemas": {},
+    "tables": {},
+    "columns": {}
+  },
+  "internal": {
+    "indexes": {}
+  }
+}
\ No newline at end of file
diff --git a/src/db/migrations/meta/_journal.json b/src/db/migrations/meta/_journal.json
index 5e836495..1ba12917 100644
--- a/src/db/migrations/meta/_journal.json
+++ b/src/db/migrations/meta/_journal.json
@@ -50,6 +50,13 @@
       "when": 1772415363037,
       "tag": "0006_magenta_screwball",
       "breakpoints": true
+    },
+    {
+      "idx": 7,
+      "version": "6",
+      "when": 1775550633649,
+      "tag": "0007_huge_dormammu",
+      "breakpoints": true
     }
   ]
 }
\ No newline at end of file
diff --git a/src/db/schema.ts b/src/db/schema.ts
index 18bac33e..3bbb1dbb 100644
--- a/src/db/schema.ts
+++ b/src/db/schema.ts
@@ -20,6 +20,9 @@ export const oracleDocuments = sqliteTable('oracle_documents', {
   supersededBy: text('superseded_by'),      // ID of newer document
   supersededAt: integer('superseded_at'),   // When it was superseded
   supersededReason: text('superseded_reason'), // Why (optional)
+  // TTL/auto-expire (Issue #4) - ephemeral learnings auto-supersede after TTL
+  expiresAt: integer('expires_at'),            // Unix timestamp (ms) when doc auto-expires
+  ttlDays: integer('ttl_days'),                // TTL in days (for reference/display)
   // Provenance tracking (Issue #22)
   origin: text('origin'),                   // 'mother' | 'arthur' | 'volt' | 'human' | null (legacy)
   project: text('project'),                 // ghq-style: 'github.com/laris-co/arra-oracle'
@@ -30,6 +33,7 @@ export const oracleDocuments = sqliteTable('oracle_documents', {
   index('idx_superseded').on(table.supersededBy),
   index('idx_origin').on(table.origin),
   index('idx_project').on(table.project),
+  index('idx_expires').on(table.expiresAt),
 ]);
 
 // Indexing status tracking
diff --git a/src/index.ts b/src/index.ts
index 025a1b24..e2db3c3f 100755
--- a/src/index.ts
+++ b/src/index.ts
@@ -5,6 +5,20 @@
  * Handler implementations live in src/tools/.
  */
 
+// Load .env from the oracle directory — Claude Code may launch from a different cwd
+import { readFileSync } from 'fs';
+import { resolve } from 'path';
+try {
+  const envPath = resolve(import.meta.dir, '..', '.env');
+  const envText = readFileSync(envPath, 'utf-8');
+  for (const line of envText.split('\n')) {
+    const match = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
+    if (match && !process.env[match[1]]) {
+      process.env[match[1]] = match[2];
+    }
+  }
+} catch {}
+
 import { Server } from '@modelcontextprotocol/sdk/server/index.js';
 import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
 import {
@@ -20,7 +34,7 @@ import type { VectorStoreAdapter } from './vector/types.ts';
 import path from 'path';
 import fs from 'fs';
 import { loadToolGroupConfig, getDisabledTools, type ToolGroupConfig } from './config/tool-groups.ts';
-import { ORACLE_DATA_DIR, DB_PATH, CHROMADB_DIR } from './config.ts';
+import { ORACLE_DATA_DIR, DB_PATH } from './config.ts';
 import { MCP_SERVER_NAME } from './const.ts';
 
 // Tool handlers (all extracted to src/tools/)
@@ -98,9 +112,8 @@ class OracleMCPServer {
       console.error(`[ToolGroups] Disabled: ${disabledGroups.join(', ')}`);
     }
 
-    this.vectorStore = createVectorStore({
-      dataPath: CHROMADB_DIR,
-    });
+    // Use factory defaults from env vars (ORACLE_VECTOR_DB, ORACLE_EMBEDDING_PROVIDER)
+    this.vectorStore = createVectorStore();
 
     const pkg = JSON.parse(fs.readFileSync(path.join(import.meta.dirname || __dirname, '..', 'package.json'), 'utf-8'));
     this.version = pkg.version;
diff --git a/src/indexer-preservation.test.ts b/src/indexer-preservation.test.ts
index eb2a8573..1ac639e7 100644
--- a/src/indexer-preservation.test.ts
+++ b/src/indexer-preservation.test.ts
@@ -49,7 +49,9 @@ beforeAll(() => {
       superseded_reason TEXT,
       origin TEXT,
       project TEXT,
-      created_by TEXT
+      created_by TEXT,
+      expires_at INTEGER,
+      ttl_days INTEGER
     );
 
     CREATE INDEX idx_type ON oracle_documents(type);
diff --git a/src/indexer/cli.ts b/src/indexer/cli.ts
index b0404e90..51c28e30 100644
--- a/src/indexer/cli.ts
+++ b/src/indexer/cli.ts
@@ -4,7 +4,7 @@
 
 import fs from 'fs';
 import path from 'path';
-import { DB_PATH, CHROMADB_DIR } from '../config.ts';
+import { DB_PATH } from '../config.ts';
 import { getVaultPsiRoot } from '../vault/handler.ts';
 import type { IndexerConfig } from '../types.ts';
 import { OracleIndexer } from './index.ts';
@@ -28,7 +28,6 @@ const repoRoot = process.env.ORACLE_REPO_ROOT ||
 const config: IndexerConfig = {
   repoRoot,
   dbPath: DB_PATH,
-  chromaPath: CHROMADB_DIR,
   sourcePaths: {
     resonance: '\u03c8/memory/resonance',
     learnings: '\u03c8/memory/learnings',
diff --git a/src/indexer/index.ts b/src/indexer/index.ts
index 5a633666..c0412267 100644
--- a/src/indexer/index.ts
+++ b/src/indexer/index.ts
@@ -80,7 +80,8 @@ export class OracleIndexer {
 
     // Initialize vector store
     try {
-      this.vectorClient = createVectorStore({ dataPath: this.config.chromaPath });
+      // Use factory defaults from env vars (ORACLE_VECTOR_DB, ORACLE_EMBEDDING_PROVIDER)
+      this.vectorClient = createVectorStore();
       await this.vectorClient.connect();
       await this.vectorClient.deleteCollection();
       await this.vectorClient.ensureCollection();
diff --git a/src/integration/mcp-http.test.ts b/src/integration/mcp-http.test.ts
new file mode 100644
index 00000000..8b937a75
--- /dev/null
+++ b/src/integration/mcp-http.test.ts
@@ -0,0 +1,246 @@
+/**
+ * MCP HTTP Transport Integration Tests
+ *
+ * Tests the /mcp Streamable HTTP endpoint:
+ * - Bearer token auth (reject without/wrong token, accept valid)
+ * - MCP protocol: initialize → tools/list → tools/call
+ * - SSE stream response for GET
+ * - DELETE (stateless no-op)
+ */
+import { describe, test, expect, beforeAll, afterAll } from "bun:test";
+import type { Subprocess } from "bun";
+
+const BASE_URL = "http://localhost:47778";
+const MCP_URL = `${BASE_URL}/mcp`;
+const TEST_TOKEN = process.env.MCP_AUTH_TOKEN || "test-token";
+let serverProcess: Subprocess | null = null;
+
+async function waitForServer(maxAttempts = 30): Promise<boolean> {
+  for (let i = 0; i < maxAttempts; i++) {
+    try {
+      const res = await fetch(`${BASE_URL}/api/health`);
+      if (res.ok) return true;
+    } catch {
+      // Not ready yet
+    }
+    await Bun.sleep(500);
+  }
+  return false;
+}
+
+async function isServerRunning(): Promise<boolean> {
+  try {
+    const res = await fetch(`${BASE_URL}/api/health`);
+    return res.ok;
+  } catch {
+    return false;
+  }
+}
+
+function mcpPost(body: object, token?: string): Promise<Response> {
+  const headers: Record<string, string> = {
+    "Content-Type": "application/json",
+    "Accept": "application/json, text/event-stream",
+  };
+  if (token !== undefined) {
+    headers["Authorization"] = `Bearer ${token}`;
+  }
+  return fetch(MCP_URL, { method: "POST", headers, body: JSON.stringify(body) });
+}
+
+describe("MCP HTTP Transport (/mcp)", () => {
+  beforeAll(async () => {
+    if (await isServerRunning()) {
+      console.log("Using existing server");
+      return;
+    }
+
+    console.log("Starting server...");
+    serverProcess = Bun.spawn(["bun", "run", "src/server.ts"], {
+      cwd: import.meta.dir.replace("/src/integration", ""),
+      stdout: "pipe",
+      stderr: "pipe",
+      env: { ...process.env, MCP_AUTH_TOKEN: TEST_TOKEN, ORACLE_CHROMA_TIMEOUT: "3000" },
+    });
+
+    const ready = await waitForServer();
+    if (!ready) {
+      throw new Error("Server failed to start within 15 seconds");
+    }
+    console.log("Server ready");
+  }, 30_000);
+
+  afterAll(() => {
+    if (serverProcess) {
+      serverProcess.kill();
+      console.log("Server stopped");
+    }
+  });
+
+  // ===================
+  // Auth
+  // ===================
+  describe("Auth", () => {
+    test("POST /mcp without Authorization header → 401", async () => {
+      const res = await fetch(MCP_URL, {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({}),
+      });
+      expect(res.status).toBe(401);
+    });
+
+    test("POST /mcp with wrong token → 401", async () => {
+      const res = await mcpPost({}, "wrong-token");
+      expect(res.status).toBe(401);
+    });
+
+    test("POST /mcp with empty Bearer → 401", async () => {
+      const res = await fetch(MCP_URL, {
+        method: "POST",
+        headers: { "Content-Type": "application/json", "Authorization": "Bearer " },
+        body: JSON.stringify({}),
+      });
+      expect(res.status).toBe(401);
+    });
+  });
+
+  // ===================
+  // MCP Protocol
+  // ===================
+  describe("MCP Protocol", () => {
+    const initRequest = {
+      jsonrpc: "2.0",
+      id: 1,
+      method: "initialize",
+      params: {
+        protocolVersion: "2024-11-05",
+        capabilities: {},
+        clientInfo: { name: "test-client", version: "1.0" },
+      },
+    };
+
+    test("POST /mcp initialize with valid token → 200", async () => {
+      const res = await mcpPost(initRequest, TEST_TOKEN);
+      expect(res.status).toBe(200);
+      const body = await res.json() as any;
+      expect(body.jsonrpc).toBe("2.0");
+      expect(body.id).toBe(1);
+      expect(body.result).toBeDefined();
+      expect(body.result.serverInfo).toBeDefined();
+    }, 15_000);
+
+    test("POST /mcp tools/list returns arra_* tools", async () => {
+      // Stateless: must re-initialize each request sequence
+      await mcpPost(initRequest, TEST_TOKEN);
+
+      const res = await mcpPost(
+        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
+        TEST_TOKEN
+      );
+      expect(res.status).toBe(200);
+      const body = await res.json() as any;
+      expect(body.result).toBeDefined();
+      expect(Array.isArray(body.result.tools)).toBe(true);
+      expect(body.result.tools.length).toBeGreaterThan(5);
+
+      const toolNames = body.result.tools.map((t: any) => t.name);
+      expect(toolNames).toContain("arra_search");
+      expect(toolNames).toContain("arra_learn");
+      expect(toolNames).toContain("arra_stats");
+    }, 15_000);
+
+    test("POST /mcp tools/call arra_stats → returns stats", async () => {
+      const res = await mcpPost(
+        {
+          jsonrpc: "2.0",
+          id: 3,
+          method: "tools/call",
+          params: { name: "arra_stats", arguments: {} },
+        },
+        TEST_TOKEN
+      );
+      expect(res.status).toBe(200);
+      const body = await res.json() as any;
+      expect(body.result).toBeDefined();
+      expect(Array.isArray(body.result.content)).toBe(true);
+      expect(body.result.content[0].type).toBe("text");
+    }, 15_000);
+
+    test("POST /mcp with malformed JSON-RPC → error response (not crash)", async () => {
+      const res = await mcpPost({ jsonrpc: "2.0", id: 99 }, TEST_TOKEN);
+      // Transport returns 400 for malformed JSON-RPC (missing method), MCP protocol errors are 200
+      expect([200, 400]).toContain(res.status);
+      expect(res.status).toBeLessThan(500);
+    }, 15_000);
+
+    test("POST /mcp unknown tool → error in response", async () => {
+      const res = await mcpPost(
+        {
+          jsonrpc: "2.0",
+          id: 4,
+          method: "tools/call",
+          params: { name: "nonexistent_tool", arguments: {} },
+        },
+        TEST_TOKEN
+      );
+      expect(res.status).toBe(200);
+      const body = await res.json() as any;
+      // Should have error in result or result.isError
+      const hasError = body.error || body.result?.isError;
+      expect(hasError).toBeTruthy();
+    }, 15_000);
+  });
+
+  // ===================
+  // SSE GET endpoint
+  // ===================
+  describe("SSE GET", () => {
+    test("GET /mcp with valid token → 200 or SSE stream", async () => {
+      const controller = new AbortController();
+      const timeoutId = setTimeout(() => controller.abort(), 2000);
+
+      try {
+        const res = await fetch(MCP_URL, {
+          method: "GET",
+          headers: { "Authorization": `Bearer ${TEST_TOKEN}`, "Accept": "text/event-stream" },
+          signal: controller.signal,
+        });
+        clearTimeout(timeoutId);
+        expect(res.status).toBeLessThan(500);
+      } catch (e: any) {
+        clearTimeout(timeoutId);
+        // Abort is expected — SSE streams stay open
+        if (e.name !== "AbortError") throw e;
+      }
+    }, 10_000);
+  });
+
+  // ===================
+  // DELETE (stateless no-op)
+  // ===================
+  describe("DELETE", () => {
+    test("DELETE /mcp with valid token → not 500", async () => {
+      const res = await fetch(MCP_URL, {
+        method: "DELETE",
+        headers: { "Authorization": `Bearer ${TEST_TOKEN}` },
+      });
+      expect(res.status).toBeLessThan(500);
+    }, 10_000);
+  });
+
+  // ===================
+  // Regression: existing REST API unaffected
+  // ===================
+  describe("REST API regression", () => {
+    test("GET /api/health still works", async () => {
+      const res = await fetch(`${BASE_URL}/api/health`);
+      expect(res.ok).toBe(true);
+    });
+
+    test("GET /api/stats still works", async () => {
+      const res = await fetch(`${BASE_URL}/api/stats`);
+      expect(res.ok).toBe(true);
+    });
+  });
+});
diff --git a/src/integration/oauth.test.ts b/src/integration/oauth.test.ts
new file mode 100644
index 00000000..50b1da06
--- /dev/null
+++ b/src/integration/oauth.test.ts
@@ -0,0 +1,518 @@
+/**
+ * OAuth 2.1 Integration Tests
+ *
+ * Tests the full OAuth flow against a live server.
+ * Run with: MCP_AUTH_TOKEN=test-token MCP_OAUTH_PIN=1234 bun test src/integration/oauth.test.ts
+ */
+import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
+import type { Subprocess } from 'bun';
+import { createHash, randomBytes } from 'crypto';
+
+const BASE_URL = 'http://localhost:47779'; // Use distinct port to avoid conflict with existing server
+const TEST_TOKEN = 'test-bearer-token';
+const TEST_PIN = '1234';
+
+let serverProcess: Subprocess | null = null;
+
+// ─── PKCE helpers ────────────────────────────────────────────────────────────
+
+function generateCodeVerifier(): string {
+  return randomBytes(32).toString('base64url');
+}
+
+function generateCodeChallenge(verifier: string): string {
+  return createHash('sha256').update(verifier).digest('base64url');
+}
+
+// ─── Server lifecycle ─────────────────────────────────────────────────────────
+
+async function waitForServer(maxAttempts = 30): Promise<boolean> {
+  for (let i = 0; i < maxAttempts; i++) {
+    try {
+      const res = await fetch(`${BASE_URL}/api/health`);
+      if (res.ok) return true;
+    } catch {
+      // Not ready yet
+    }
+    await Bun.sleep(500);
+  }
+  return false;
+}
+
+describe('OAuth 2.1 Integration', () => {
+  beforeAll(async () => {
+    serverProcess = Bun.spawn(['bun', 'run', 'src/server.ts'], {
+      cwd: import.meta.dir.replace('/src/integration', ''),
+      stdout: 'pipe',
+      stderr: 'pipe',
+      env: {
+        ...process.env,
+        ORACLE_PORT: '47779',
+        MCP_AUTH_TOKEN: TEST_TOKEN,
+        MCP_OAUTH_PIN: TEST_PIN,
+        MCP_EXTERNAL_URL: BASE_URL,
+        ORACLE_CHROMA_TIMEOUT: '1000',
+      },
+    });
+
+    const ready = await waitForServer();
+    if (!ready) {
+      let stderr = '';
+      if (serverProcess.stderr) {
+        const reader = serverProcess.stderr.getReader();
+        try {
+          const { value } = await reader.read();
+          if (value) stderr = new TextDecoder().decode(value);
+        } catch { /* ignore */ }
+      }
+      throw new Error(`OAuth test server failed to start.\nStderr: ${stderr}`);
+    }
+  }, 30_000);
+
+  afterAll(() => {
+    if (serverProcess) {
+      serverProcess.kill();
+    }
+  });
+
+  // ─── Discovery metadata ──────────────────────────────────────────────────
+
+  describe('OAuth discovery endpoints', () => {
+    test('GET /.well-known/oauth-authorization-server returns metadata', async () => {
+      const res = await fetch(`${BASE_URL}/.well-known/oauth-authorization-server`);
+      expect(res.status).toBe(200);
+      const data = await res.json() as Record<string, unknown>;
+      expect(data.issuer).toBe(BASE_URL);
+      expect(data.authorization_endpoint).toBe(`${BASE_URL}/authorize`);
+      expect(data.token_endpoint).toBe(`${BASE_URL}/token`);
+      expect(data.registration_endpoint).toBe(`${BASE_URL}/register`);
+      expect(Array.isArray(data.code_challenge_methods_supported)).toBe(true);
+      expect((data.code_challenge_methods_supported as string[]).includes('S256')).toBe(true);
+    });
+
+    test('GET /.well-known/oauth-protected-resource returns resource metadata', async () => {
+      const res = await fetch(`${BASE_URL}/.well-known/oauth-protected-resource`);
+      expect(res.status).toBe(200);
+      const data = await res.json() as Record<string, unknown>;
+      expect(data.resource).toBe(BASE_URL);
+      expect(Array.isArray(data.authorization_servers)).toBe(true);
+    });
+  });
+
+  // ─── Client registration ─────────────────────────────────────────────────
+
+  describe('Dynamic client registration', () => {
+    test('POST /register returns client_id and client_secret', async () => {
+      const res = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Authorization': `Bearer ${TEST_TOKEN}`,
+        },
+        body: JSON.stringify({
+          redirect_uris: ['http://localhost:9999/callback'],
+          client_name: 'Test Client',
+          grant_types: ['authorization_code'],
+          response_types: ['code'],
+        }),
+      });
+      expect(res.status).toBe(201);
+      const data = await res.json() as Record<string, unknown>;
+      expect(typeof data.client_id).toBe('string');
+      expect(typeof data.client_secret).toBe('string');
+      expect(data.redirect_uris).toEqual(['http://localhost:9999/callback']);
+    });
+
+    test('POST /register without Bearer token returns 401', async () => {
+      const res = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ redirect_uris: ['http://localhost:9999/callback'] }),
+      });
+      expect(res.status).toBe(401);
+    });
+
+    test('POST /register without redirect_uris returns 400', async () => {
+      const res = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Authorization': `Bearer ${TEST_TOKEN}`,
+        },
+        body: JSON.stringify({ client_name: 'Bad Client' }),
+      });
+      expect(res.status).toBe(400);
+    });
+  });
+
+  // ─── Full OAuth flow ─────────────────────────────────────────────────────
+
+  describe('Full OAuth authorization flow', () => {
+    let clientId: string;
+    let clientSecret: string;
+    const redirectUri = 'http://localhost:9999/callback';
+    let oauthToken: string;
+
+    test('Step 1: Register client', async () => {
+      const res = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Authorization': `Bearer ${TEST_TOKEN}`,
+        },
+        body: JSON.stringify({
+          redirect_uris: [redirectUri],
+          client_name: 'Flow Test Client',
+          grant_types: ['authorization_code'],
+          response_types: ['code'],
+        }),
+      });
+      const data = await res.json() as Record<string, string>;
+      clientId = data.client_id;
+      clientSecret = data.client_secret;
+      expect(clientId).toBeTruthy();
+    });
+
+    test('Step 2: GET /authorize redirects to /oauth/login', async () => {
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', clientId);
+      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+      authorizeUrl.searchParams.set('scope', 'read write');
+      authorizeUrl.searchParams.set('state', 'test-state-123');
+
+      const res = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      expect(res.status).toBe(302);
+      const location = res.headers.get('location') || '';
+      expect(location).toContain('/oauth/login?state=');
+    });
+
+    test('Step 3: GET /oauth/login returns HTML with PIN form', async () => {
+      // Need to go through authorize to get state key
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', clientId);
+      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      const loginUrl = redirectRes.headers.get('location') || '';
+
+      const loginRes = await fetch(loginUrl);
+      expect(loginRes.status).toBe(200);
+      const html = await loginRes.text();
+      expect(html).toContain('Oracle v3');
+      expect(html).toContain('/oauth/callback');
+    });
+
+    test('Step 4: POST /oauth/callback with wrong PIN returns 403', async () => {
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', clientId);
+      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      const loginUrl = redirectRes.headers.get('location') || '';
+      const stateKey = new URL(loginUrl).searchParams.get('state') || '';
+
+      const callbackRes = await fetch(`${BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ state: stateKey, pin: 'wrongpin' }).toString(),
+        redirect: 'manual',
+      });
+      expect(callbackRes.status).toBe(403);
+    });
+
+    test('Step 5: Full flow — authorize → PIN → code → token → use /mcp', async () => {
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+      const flowState = 'flow-state-xyz';
+
+      // Authorize
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', clientId);
+      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+      authorizeUrl.searchParams.set('state', flowState);
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      expect(redirectRes.status).toBe(302);
+      const loginUrl = redirectRes.headers.get('location') || '';
+      const stateKey = new URL(loginUrl).searchParams.get('state') || '';
+
+      // Submit correct PIN
+      const callbackRes = await fetch(`${BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ state: stateKey, pin: TEST_PIN }).toString(),
+        redirect: 'manual',
+      });
+      expect(callbackRes.status).toBe(302);
+      const codeRedirect = callbackRes.headers.get('location') || '';
+      expect(codeRedirect).toContain('code=');
+
+      const codeUrl = new URL(codeRedirect);
+      const code = codeUrl.searchParams.get('code') || '';
+      const returnedState = codeUrl.searchParams.get('state');
+      expect(code).toBeTruthy();
+      expect(returnedState).toBe(flowState);
+
+      // Exchange code for token
+      const tokenRes = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({
+          grant_type: 'authorization_code',
+          code,
+          client_id: clientId,
+          code_verifier: codeVerifier,
+          redirect_uri: redirectUri,
+        }).toString(),
+      });
+      expect(tokenRes.status).toBe(200);
+      const tokenData = await tokenRes.json() as Record<string, unknown>;
+      expect(typeof tokenData.access_token).toBe('string');
+      expect(tokenData.token_type).toBe('bearer');
+      oauthToken = tokenData.access_token as string;
+
+      // Use token on /mcp (Streamable HTTP requires Accept header per MCP spec)
+      const mcpRes = await fetch(`${BASE_URL}/mcp`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Accept': 'application/json, text/event-stream',
+          'Authorization': `Bearer ${oauthToken}`,
+        },
+        body: JSON.stringify({
+          jsonrpc: '2.0',
+          id: 1,
+          method: 'initialize',
+          params: {
+            protocolVersion: '2024-11-05',
+            capabilities: {},
+            clientInfo: { name: 'oauth-test', version: '1.0' },
+          },
+        }),
+      });
+      expect(mcpRes.status).toBe(200);
+    });
+
+    test('Step 6: POST /revoke invalidates token', async () => {
+      if (!oauthToken) return; // Skip if previous test didn't run
+
+      const revokeRes = await fetch(`${BASE_URL}/revoke`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ token: oauthToken }).toString(),
+      });
+      expect(revokeRes.status).toBe(200);
+
+      // Token should now be rejected
+      const mcpRes = await fetch(`${BASE_URL}/mcp`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Accept': 'application/json, text/event-stream',
+          'Authorization': `Bearer ${oauthToken}`,
+        },
+        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
+      });
+      expect(mcpRes.status).toBe(401);
+    });
+  });
+
+  // ─── Static Bearer fallback ──────────────────────────────────────────────
+
+  describe('Static Bearer token fallback', () => {
+    test('POST /mcp with static Bearer token still works when OAuth enabled', async () => {
+      const res = await fetch(`${BASE_URL}/mcp`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Accept': 'application/json, text/event-stream',
+          'Authorization': `Bearer ${TEST_TOKEN}`,
+        },
+        body: JSON.stringify({
+          jsonrpc: '2.0',
+          id: 1,
+          method: 'initialize',
+          params: {
+            protocolVersion: '2024-11-05',
+            capabilities: {},
+            clientInfo: { name: 'fallback-test', version: '1.0' },
+          },
+        }),
+      });
+      expect(res.status).toBe(200);
+    });
+
+    test('POST /mcp without token returns 401 with WWW-Authenticate header', async () => {
+      const res = await fetch(`${BASE_URL}/mcp`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
+      });
+      expect(res.status).toBe(401);
+      const wwwAuth = res.headers.get('WWW-Authenticate') || '';
+      expect(wwwAuth).toContain('Bearer');
+      expect(wwwAuth).toContain('oauth-protected-resource');
+    });
+  });
+
+  // ─── /token endpoint edge cases ──────────────────────────────────────────
+
+  describe('/token endpoint edge cases', () => {
+    test('POST /token with unknown code returns 400', async () => {
+      const res = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({
+          grant_type: 'authorization_code',
+          code: 'nonexistent-code',
+          client_id: 'fake-client',
+          code_verifier: 'fakeverifier',
+          redirect_uri: 'http://localhost:9999/callback',
+        }).toString(),
+      });
+      expect(res.status).toBe(400);
+    });
+
+    test('POST /token with wrong PKCE verifier returns 400', async () => {
+      const testRedirectUri = 'http://localhost:9999/callback';
+
+      // Register a client
+      const regRes = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_TOKEN}` },
+        body: JSON.stringify({ client_name: 'pkce-test', redirect_uris: [testRedirectUri] }),
+      });
+      const { client_id: testClientId } = await regRes.json() as Record<string, string>;
+
+      // Get a real auth code
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', testClientId);
+      authorizeUrl.searchParams.set('redirect_uri', testRedirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      const stateKey = new URL(redirectRes.headers.get('location') || '').searchParams.get('state') || '';
+
+      const callbackRes = await fetch(`${BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ state: stateKey, pin: TEST_PIN }).toString(),
+        redirect: 'manual',
+      });
+      const code = new URL(callbackRes.headers.get('location') || '').searchParams.get('code') || '';
+      expect(code).toBeTruthy();
+
+      // Exchange with WRONG verifier — must fail
+      const res = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({
+          grant_type: 'authorization_code',
+          code,
+          client_id: testClientId,
+          code_verifier: generateCodeVerifier(), // different verifier
+          redirect_uri: testRedirectUri,
+        }).toString(),
+      });
+      expect(res.status).toBe(400);
+      const data = await res.json() as Record<string, unknown>;
+      expect(data.error).toContain('PKCE');
+    });
+
+    test('POST /token with same code twice (replay) returns 400 on second use', async () => {
+      const testRedirectUri = 'http://localhost:9999/callback';
+
+      // Register a client
+      const regRes = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_TOKEN}` },
+        body: JSON.stringify({ client_name: 'replay-test', redirect_uris: [testRedirectUri] }),
+      });
+      const { client_id: testClientId } = await regRes.json() as Record<string, string>;
+
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', testClientId);
+      authorizeUrl.searchParams.set('redirect_uri', testRedirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      const stateKey = new URL(redirectRes.headers.get('location') || '').searchParams.get('state') || '';
+
+      const callbackRes = await fetch(`${BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ state: stateKey, pin: TEST_PIN }).toString(),
+        redirect: 'manual',
+      });
+      const code = new URL(callbackRes.headers.get('location') || '').searchParams.get('code') || '';
+      expect(code).toBeTruthy();
+
+      const tokenBody = new URLSearchParams({
+        grant_type: 'authorization_code',
+        code,
+        client_id: testClientId,
+        code_verifier: codeVerifier,
+        redirect_uri: testRedirectUri,
+      }).toString();
+
+      // First use — must succeed
+      const first = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: tokenBody,
+      });
+      expect(first.status).toBe(200);
+
+      // Second use — code already deleted, must fail
+      const second = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: tokenBody,
+      });
+      expect(second.status).toBe(400);
+    });
+
+    test('POST /token with unsupported grant_type returns 400', async () => {
+      const res = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({
+          grant_type: 'client_credentials',
+          client_id: 'fake-client',
+        }).toString(),
+      });
+      expect(res.status).toBe(400);
+    });
+  });
+});
diff --git a/src/mcp-transport.ts b/src/mcp-transport.ts
new file mode 100644
index 00000000..a2b2b3ec
--- /dev/null
+++ b/src/mcp-transport.ts
@@ -0,0 +1,236 @@
+/**
+ * MCP HTTP Transport Factory
+ *
+ * Creates per-request Server + WebStandardStreamableHTTPServerTransport instances
+ * for stateless Streamable HTTP MCP endpoint at /mcp.
+ *
+ * Reuses the same tool definitions and handlers as src/index.ts (OracleMCPServer)
+ * without the stdio transport. Uses module-level db/sqlite from src/db/index.ts.
+ */
+
+import { Server } from '@modelcontextprotocol/sdk/server/index.js';
+import {
+  CallToolRequestSchema,
+  ListToolsRequestSchema,
+} from '@modelcontextprotocol/sdk/types.js';
+import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
+import path from 'path';
+import fs from 'fs';
+
+import { db, sqlite } from './db/index.ts';
+import { createVectorStore } from './vector/factory.ts';
+import type { VectorStoreAdapter } from './vector/types.ts';
+import { loadToolGroupConfig, getDisabledTools } from './config/tool-groups.ts';
+import { ORACLE_DATA_DIR, CHROMADB_DIR } from './config.ts';
+import { MCP_SERVER_NAME } from './const.ts';
+import type { ToolContext } from './tools/types.ts';
+
+import {
+  searchToolDef, handleSearch,
+  learnToolDef, handleLearn,
+  listToolDef, handleList,
+  statsToolDef, handleStats,
+  conceptsToolDef, handleConcepts,
+  supersedeToolDef, handleSupersede,
+  handoffToolDef, handleHandoff,
+  inboxToolDef, handleInbox,
+  readToolDef, handleRead,
+  forumToolDefs,
+  handleThread, handleThreads, handleThreadRead, handleThreadUpdate,
+  traceToolDefs,
+  handleTrace, handleTraceList, handleTraceGet, handleTraceLink, handleTraceUnlink, handleTraceChain,
+} from './tools/index.ts';
+
+import type {
+  OracleSearchInput,
+  OracleLearnInput,
+  OracleListInput,
+  OracleStatsInput,
+  OracleConceptsInput,
+  OracleSupersededInput,
+  OracleHandoffInput,
+  OracleInboxInput,
+  OracleReadInput,
+  OracleThreadInput,
+  OracleThreadsInput,
+  OracleThreadReadInput,
+  OracleThreadUpdateInput,
+} from './tools/index.ts';
+
+import type {
+  CreateTraceInput,
+  ListTracesInput,
+  GetTraceInput,
+} from './trace/types.ts';
+
+const WRITE_TOOLS = [
+  'arra_learn',
+  'arra_thread',
+  'arra_thread_update',
+  'arra_trace',
+  'arra_supersede',
+  'arra_handoff',
+];
+
+// Version (read once at module load — graceful fallback if package.json is missing)
+let VERSION = '0.0.0';
+try {
+  const pkg = JSON.parse(fs.readFileSync(path.join(import.meta.dirname || '', '..', 'package.json'), 'utf-8'));
+  VERSION = pkg.version ?? '0.0.0';
+} catch {
+  console.warn('[Oracle] Could not read package.json — using fallback version 0.0.0');
+}
+
+// Tool group config (read once at module load)
+const repoRoot = process.env.ORACLE_REPO_ROOT || process.cwd();
+const groupConfig = loadToolGroupConfig(repoRoot);
+const disabledTools = getDisabledTools(groupConfig);
+const readOnly = process.env.ORACLE_READ_ONLY === 'true';
+
+// Lazy-initialized vector store shared across requests
+let _vectorStore: VectorStoreAdapter | null = null;
+let _vectorStatus: 'unknown' | 'connected' | 'unavailable' = 'unknown';
+
+function getVectorStore(): VectorStoreAdapter {
+  if (!_vectorStore) {
+    _vectorStore = createVectorStore({ dataPath: CHROMADB_DIR });
+    _vectorStore.connect().then(() => {
+      _vectorStatus = 'connected';
+    }).catch((err: unknown) => {
+      console.error('[Oracle] Vector store connection failed:', err);
+      _vectorStatus = 'unavailable';
+    });
+  }
+  return _vectorStore;
+}
+
+const IMPORTANT_DESCRIPTION = `ORACLE WORKFLOW GUIDE (v${VERSION}):\n\n1. SEARCH & DISCOVER\n   arra_search(query) → Find knowledge by keywords/vectors\n   arra_read(file/id) → Read full document content\n   arra_list() → Browse all documents\n   arra_concepts() → See topic coverage\n\n2. LEARN & REMEMBER\n   arra_learn(pattern) → Add new patterns/learnings\n   arra_thread(message) → Multi-turn discussions\n   ⚠️ BEFORE adding: search for similar topics first!\n   If updating old info → use arra_supersede(oldId, newId)\n\n3. TRACE & DISTILL\n   arra_trace(query) → Log discovery sessions with dig points\n   arra_trace_list() → Find past traces\n   arra_trace_get(id) → Explore dig points (files, commits, issues)\n   arra_trace_link(prevId, nextId) → Chain related traces together\n   arra_trace_chain(id) → View the full linked chain\n\n4. HANDOFF & INBOX\n   arra_handoff(content) → Save session context for next session\n   arra_inbox() → List pending handoffs\n\n5. SUPERSEDE (when info changes)\n   arra_supersede(oldId, newId, reason) → Mark old doc as outdated\n   "Nothing is Deleted" — old preserved, just marked superseded\n\nPhilosophy: "Nothing is Deleted" — All interactions logged.`;
+
+/**
+ * Creates an MCP Server with all Oracle tools registered.
+ * Called once per HTTP request (stateless mode).
+ */
+function createMcpServer(): Server {
+  const server = new Server(
+    { name: MCP_SERVER_NAME, version: VERSION },
+    { capabilities: { tools: {} } }
+  );
+
+  const vs = getVectorStore();
+  // Use a getter so each tool invocation reads the live _vectorStatus
+  // instead of the snapshot captured at server-creation time.
+  const toolCtx = {
+    db,
+    sqlite,
+    repoRoot,
+    vectorStore: vs,
+    get vectorStatus() { return _vectorStatus; },
+    version: VERSION,
+  } satisfies ToolContext;
+
+  server.setRequestHandler(ListToolsRequestSchema, async () => {
+    const allTools = [
+      { name: '____IMPORTANT', description: IMPORTANT_DESCRIPTION, inputSchema: { type: 'object', properties: {} } },
+      searchToolDef,
+      readToolDef,
+      learnToolDef,
+      listToolDef,
+      statsToolDef,
+      conceptsToolDef,
+      ...forumToolDefs,
+      ...traceToolDefs,
+      supersedeToolDef,
+      handoffToolDef,
+      inboxToolDef,
+    ];
+
+    let tools = allTools.filter(t => !disabledTools.has(t.name));
+    if (readOnly) {
+      tools = tools.filter(t => !WRITE_TOOLS.includes(t.name));
+    }
+    return { tools };
+  });
+
+  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
+    if (disabledTools.has(request.params.name)) {
+      return {
+        content: [{ type: 'text', text: `Error: Tool "${request.params.name}" is disabled by tool group config. Check ${ORACLE_DATA_DIR}/config.json or arra.config.json.` }],
+        isError: true,
+      };
+    }
+
+    if (readOnly && WRITE_TOOLS.includes(request.params.name)) {
+      return {
+        content: [{ type: 'text', text: `Error: Tool "${request.params.name}" is disabled in read-only mode.` }],
+        isError: true,
+      };
+    }
+
+    try {
+      switch (request.params.name) {
+        case 'arra_search':
+          return await handleSearch(toolCtx, request.params.arguments as unknown as OracleSearchInput);
+        case 'arra_read':
+          return await handleRead(toolCtx, request.params.arguments as unknown as OracleReadInput);
+        case 'arra_learn':
+          return await handleLearn(toolCtx, request.params.arguments as unknown as OracleLearnInput);
+        case 'arra_list':
+          return await handleList(toolCtx, request.params.arguments as unknown as OracleListInput);
+        case 'arra_stats':
+          return await handleStats(toolCtx, request.params.arguments as unknown as OracleStatsInput);
+        case 'arra_concepts':
+          return await handleConcepts(toolCtx, request.params.arguments as unknown as OracleConceptsInput);
+        case 'arra_supersede':
+          return await handleSupersede(toolCtx, request.params.arguments as unknown as OracleSupersededInput);
+        case 'arra_handoff':
+          return await handleHandoff(toolCtx, request.params.arguments as unknown as OracleHandoffInput);
+        case 'arra_inbox':
+          return await handleInbox(toolCtx, request.params.arguments as unknown as OracleInboxInput);
+        case 'arra_thread':
+          return await handleThread(request.params.arguments as unknown as OracleThreadInput);
+        case 'arra_threads':
+          return await handleThreads(request.params.arguments as unknown as OracleThreadsInput);
+        case 'arra_thread_read':
+          return await handleThreadRead(request.params.arguments as unknown as OracleThreadReadInput);
+        case 'arra_thread_update':
+          return await handleThreadUpdate(request.params.arguments as unknown as OracleThreadUpdateInput);
+        case 'arra_trace':
+          return await handleTrace(request.params.arguments as unknown as CreateTraceInput);
+        case 'arra_trace_list':
+          return await handleTraceList(request.params.arguments as unknown as ListTracesInput);
+        case 'arra_trace_get':
+          return await handleTraceGet(request.params.arguments as unknown as GetTraceInput);
+        case 'arra_trace_link':
+          return await handleTraceLink(request.params.arguments as unknown as { prevTraceId: string; nextTraceId: string });
+        case 'arra_trace_unlink':
+          return await handleTraceUnlink(request.params.arguments as unknown as { traceId: string; direction: 'prev' | 'next' });
+        case 'arra_trace_chain':
+          return await handleTraceChain(request.params.arguments as unknown as { traceId: string });
+        default:
+          throw new Error(`Unknown tool: ${request.params.name}`);
+      }
+    } catch (error) {
+      return {
+        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
+        isError: true,
+      };
+    }
+  });
+
+  return server;
+}
+
+/**
+ * Handles an incoming MCP HTTP request.
+ * Creates a fresh Server + transport per request (stateless mode).
+ * Call this from the Hono /mcp route after auth passes.
+ */
+export async function createMcpHandler(request: Request): Promise<Response> {
+  const transport = new WebStandardStreamableHTTPServerTransport({
+    sessionIdGenerator: undefined, // stateless — no session tracking
+    enableJsonResponse: true,
+  });
+  const server = createMcpServer();
+  await server.connect(transport);
+  return transport.handleRequest(request);
+}
diff --git a/src/oauth/provider.ts b/src/oauth/provider.ts
new file mode 100644
index 00000000..390d5804
--- /dev/null
+++ b/src/oauth/provider.ts
@@ -0,0 +1,549 @@
+/**
+ * OAuth 2.1 Provider for Oracle v3
+ *
+ * PIN-based authorization server. Mirrors PSak Soul MCP oauth_provider.py.
+ * Supports dynamic client registration (RFC 7591), PKCE (S256), and
+ * 30-day access tokens. State persists to ORACLE_DATA_DIR/.oauth-state.json.
+ *
+ * Design decisions:
+ * - No refresh tokens (30-day access tokens sufficient for personal server)
+ * - Single PIN, single user (same as PSak)
+ * - Atomic file writes for crash safety (temp file + rename)
+ * - crypto.timingSafeEqual for PIN comparison to prevent timing attacks
+ * - IP-based rate limiting for PIN brute-force protection
+ */
+
+import { randomBytes, createHash, timingSafeEqual } from 'crypto';
+import { writeFileSync, readFileSync, renameSync, existsSync, mkdirSync, chmodSync } from 'fs';
+import { join, dirname } from 'path';
+import { tmpdir } from 'os';
+
+import { MCP_OAUTH_PIN, MCP_EXTERNAL_URL, ORACLE_DATA_DIR, MCP_AUTH_TOKEN } from '../config.ts';
+import type { OAuthState, OAuthClientInfo, PendingAuthorization } from './types.ts';
+
+export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
+export const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
+
+// Far-future sentinel used for static Bearer tokens (avoids Infinity, which is not JSON-serializable)
+const STATIC_TOKEN_EXPIRES_AT = new Date('2100-01-01T00:00:00Z').getTime();
+
+export interface AuthInfo {
+  token: string;
+  client_id: string;
+  scopes: string[];
+  expires_at: number;
+}
+
+/** Issued code data stored until token exchange */
+interface IssuedCode {
+  client_id: string;
+  redirect_uri: string;
+  scopes: string[];
+  code_challenge: string;
+  resource?: string;
+  issued_at: number;
+}
+
+/** Rate-limit window for a single IP */
+interface RateLimitRecord {
+  count: number;
+  resetAt: number;
+}
+
+/** Escape user-supplied strings for safe HTML interpolation */
+function escapeHtml(str: string): string {
+  return str
+    .replace(/&/g, '&amp;')
+    .replace(/</g, '&lt;')
+    .replace(/>/g, '&gt;')
+    .replace(/"/g, '&quot;')
+    .replace(/'/g, '&#x27;');
+}
+
+export class OAuthProvider {
+  private readonly stateFile: string;
+  private state: OAuthState;
+  // stateKey → pending auth (before PIN verification)
+  private pendingAuthorizations: Map<string, PendingAuthorization> = new Map();
+  // code → issued code data (after PIN verification, before token exchange)
+  private issuedCodes: Map<string, IssuedCode> = new Map();
+
+  // Rate limiting: ip → {count, resetAt}
+  private pinAttempts: Map<string, RateLimitRecord> = new Map();
+
+  private static readonly MAX_PIN_ATTEMPTS = 10;
+  private static readonly PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
+  private static readonly MAX_PENDING_AUTHORIZATIONS = 100;
+
+  constructor() {
+    this.stateFile = join(ORACLE_DATA_DIR, '.oauth-state.json');
+    this.state = this.loadState();
+    this.cleanExpiredTokens();
+  }
+
+  // ─── State persistence ───────────────────────────────────────────────────
+
+  private loadState(): OAuthState {
+    if (!existsSync(this.stateFile)) {
+      return { clients: {}, tokens: {} };
+    }
+    try {
+      const raw = readFileSync(this.stateFile, 'utf-8');
+      return JSON.parse(raw) as OAuthState;
+    } catch (err) {
+      console.error('[OAuth] Failed to parse state file, starting with empty state:', err);
+      return { clients: {}, tokens: {} };
+    }
+  }
+
+  /** Atomic write: write to temp file then rename — crash-safe. Sets 0600 permissions. */
+  private saveState(): void {
+    try {
+      const dir = dirname(this.stateFile);
+      if (!existsSync(dir)) {
+        mkdirSync(dir, { recursive: true });
+      }
+      const tmp = join(tmpdir(), `.oauth-state-${Date.now()}-${randomBytes(4).toString('hex')}.tmp`);
+      writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf-8');
+      chmodSync(tmp, 0o600);
+      renameSync(tmp, this.stateFile);
+    } catch (err) {
+      console.error('[OAuth] saveState failed — token state may be inconsistent:', err);
+    }
+  }
+
+  private cleanExpiredTokens(): void {
+    const now = Date.now();
+    let changed = false;
+    for (const [token, data] of Object.entries(this.state.tokens)) {
+      if (data.expires_at < now) {
+        delete this.state.tokens[token];
+        changed = true;
+      }
+    }
+    if (changed) this.saveState();
+
+    // Clean expired pending authorizations
+    for (const [stateKey, pending] of this.pendingAuthorizations.entries()) {
+      if (now - pending.created_at > AUTH_CODE_TTL_MS) {
+        this.pendingAuthorizations.delete(stateKey);
+      }
+    }
+
+    // Clean expired rate-limit windows
+    for (const [ip, record] of this.pinAttempts.entries()) {
+      if (now > record.resetAt) {
+        this.pinAttempts.delete(ip);
+      }
+    }
+  }
+
+  // ─── Rate limiting ───────────────────────────────────────────────────────
+
+  private checkRateLimit(ip: string): { allowed: boolean; attemptsLeft: number } {
+    const now = Date.now();
+    const record = this.pinAttempts.get(ip);
+
+    if (!record || now > record.resetAt) {
+      return { allowed: true, attemptsLeft: OAuthProvider.MAX_PIN_ATTEMPTS };
+    }
+
+    const attemptsLeft = OAuthProvider.MAX_PIN_ATTEMPTS - record.count;
+    return { allowed: attemptsLeft > 0, attemptsLeft };
+  }
+
+  private recordFailedAttempt(ip: string): number {
+    const now = Date.now();
+    const record = this.pinAttempts.get(ip);
+
+    if (!record || now > record.resetAt) {
+      this.pinAttempts.set(ip, { count: 1, resetAt: now + OAuthProvider.PIN_LOCKOUT_MS });
+      return OAuthProvider.MAX_PIN_ATTEMPTS - 1;
+    }
+
+    record.count++;
+    return Math.max(0, OAuthProvider.MAX_PIN_ATTEMPTS - record.count);
+  }
+
+  private resetAttempts(ip: string): void {
+    this.pinAttempts.delete(ip);
+  }
+
+  // ─── Registration auth ───────────────────────────────────────────────────
+
+  /**
+   * Verify that a client registration request is authorized.
+   * Requires Bearer MCP_AUTH_TOKEN if configured.
+   * Returns true if registration is allowed.
+   */
+  checkRegistrationAuth(authHeader: string): boolean {
+    if (!MCP_AUTH_TOKEN) {
+      // No token configured — allow (degraded mode, log warning)
+      console.warn('[OAuth] /register: MCP_AUTH_TOKEN not set — registration is unprotected');
+      return true;
+    }
+    const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
+    const expected = Buffer.from(MCP_AUTH_TOKEN, 'utf-8');
+    const provided = Buffer.from(providedToken, 'utf-8');
+    const maxLen = Math.max(expected.length, provided.length);
+    return (
+      expected.length === provided.length &&
+      timingSafeEqual(
+        Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]),
+        Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]),
+      )
+    );
+  }
+
+  // ─── Client registration (RFC 7591) ─────────────────────────────────────
+
+  registerClient(metadata: Partial<OAuthClientInfo>): OAuthClientInfo {
+    const client_id = `oracle-${randomBytes(12).toString('hex')}`;
+    const client_secret = randomBytes(24).toString('hex');
+
+    const client: OAuthClientInfo = {
+      client_id,
+      client_secret,
+      redirect_uris: metadata.redirect_uris || [],
+      client_name: metadata.client_name,
+      grant_types: metadata.grant_types || ['authorization_code'],
+      response_types: metadata.response_types || ['code'],
+      scope: metadata.scope || 'read write',
+      token_endpoint_auth_method: metadata.token_endpoint_auth_method || 'client_secret_post',
+    };
+
+    this.state.clients[client_id] = client;
+    this.saveState();
+
+    console.log(`[OAuth] Client registered: ${client_id} (${metadata.client_name ?? 'unnamed'})`);
+    return client;
+  }
+
+  getClient(client_id: string): OAuthClientInfo | null {
+    return this.state.clients[client_id] ?? null;
+  }
+
+  // ─── Authorization ───────────────────────────────────────────────────────
+
+  /**
+   * Validate authorization request and store pending auth.
+   * Returns the login page URL with state key, or an error.
+   */
+  authorize(params: {
+    client_id: string;
+    redirect_uri: string;
+    scope?: string;
+    state?: string;
+    code_challenge: string;
+    code_challenge_method: string;
+    resource?: string;
+  }): { loginUrl: string } | { error: string } {
+    const client = this.getClient(params.client_id);
+    if (!client) {
+      return { error: `Unknown client_id: ${params.client_id}` };
+    }
+
+    if (!client.redirect_uris.includes(params.redirect_uri)) {
+      return { error: 'redirect_uri not registered for client' };
+    }
+
+    if (params.code_challenge_method !== 'S256') {
+      return { error: 'Only S256 code_challenge_method is supported' };
+    }
+
+    if (!params.code_challenge) {
+      return { error: 'code_challenge is required' };
+    }
+
+    // Clean stale entries before enforcing the cap
+    this.cleanExpiredTokens();
+
+    if (this.pendingAuthorizations.size >= OAuthProvider.MAX_PENDING_AUTHORIZATIONS) {
+      console.warn('[OAuth] /authorize rejected: too many pending authorizations');
+      return { error: 'Too many pending authorizations — try again later' };
+    }
+
+    const stateKey = randomBytes(16).toString('hex');
+    const scopes = (params.scope || 'read write').split(' ').filter(Boolean);
+
+    this.pendingAuthorizations.set(stateKey, {
+      client_id: params.client_id,
+      state: params.state,
+      scopes,
+      code_challenge: params.code_challenge,
+      redirect_uri: params.redirect_uri,
+      resource: params.resource,
+      created_at: Date.now(),
+    });
+
+    console.log(`[OAuth] Authorization started for client: ${params.client_id}`);
+    const loginUrl = `${MCP_EXTERNAL_URL}/oauth/login?state=${stateKey}`;
+    return { loginUrl };
+  }
+
+  // ─── PIN login page ──────────────────────────────────────────────────────
+
+  getLoginPage(stateKey: string, errorMessage?: string): string {
+    const pending = this.pendingAuthorizations.get(stateKey);
+    if (!pending) {
+      return `<!DOCTYPE html><html><body><h1>Error</h1><p>Invalid or expired state. Please restart the authorization flow.</p></body></html>`;
+    }
+
+    const errorHtml = errorMessage
+      ? `<p class="error">${escapeHtml(errorMessage)}</p>`
+      : '';
+
+    return `<!DOCTYPE html>
+<html lang="en">
+<head>
+  <meta charset="UTF-8">
+  <meta name="viewport" content="width=device-width, initial-scale=1.0">
+  <title>Oracle v3 — Authorize</title>
+  <style>
+    * { box-sizing: border-box; margin: 0; padding: 0; }
+    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
+    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; }
+    h1 { font-size: 1.4rem; color: #a78bfa; margin-bottom: 0.5rem; }
+    p { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }
+    label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 0.4rem; }
+    input[type="password"] { width: 100%; padding: 0.6rem 0.8rem; background: #0f0f0f; border: 1px solid #444; border-radius: 6px; color: #e0e0e0; font-size: 1rem; margin-bottom: 1rem; outline: none; }
+    input[type="password"]:focus { border-color: #a78bfa; }
+    button { width: 100%; padding: 0.7rem; background: #7c3aed; border: none; border-radius: 6px; color: white; font-size: 1rem; cursor: pointer; }
+    button:hover { background: #6d28d9; }
+    .error { color: #f87171; font-size: 0.85rem; margin-bottom: 1rem; }
+  </style>
+</head>
+<body>
+  <div class="card">
+    <h1>🔮 Oracle v3</h1>
+    <p>Enter your PIN to authorize access</p>
+    ${errorHtml}
+    <form method="POST" action="/oauth/callback">
+      <input type="hidden" name="state" value="${escapeHtml(stateKey)}">
+      <label for="pin">PIN</label>
+      <input type="password" id="pin" name="pin" placeholder="Enter PIN" autofocus autocomplete="current-password">
+      <button type="submit">Authorize</button>
+    </form>
+  </div>
+</body>
+</html>`;
+  }
+
+  /**
+   * Verify PIN and issue authorization code.
+   * Returns redirect URI with code param, or error info.
+   * @param ip - Client IP address for rate limiting (pass 'unknown' if unavailable)
+   */
+  handleLoginCallback(
+    stateKey: string,
+    pin: string,
+    ip: string = 'unknown',
+  ): { redirectUri: string } | { error: string; status: number; showLoginPage?: boolean } {
+    // Rate limit check
+    const rateCheck = this.checkRateLimit(ip);
+    if (!rateCheck.allowed) {
+      console.warn(`[OAuth] PIN rate limit exceeded for IP: ${ip}`);
+      return { error: 'Too many failed attempts. Please try again in 15 minutes.', status: 429, showLoginPage: true };
+    }
+
+    const pending = this.pendingAuthorizations.get(stateKey);
+    if (!pending) {
+      return { error: 'Invalid or expired state', status: 400 };
+    }
+
+    if (Date.now() - pending.created_at > AUTH_CODE_TTL_MS) {
+      this.pendingAuthorizations.delete(stateKey);
+      return { error: 'Authorization request expired', status: 400 };
+    }
+
+    if (!MCP_OAUTH_PIN) {
+      return { error: 'OAuth not configured', status: 503 };
+    }
+
+    // Timing-safe PIN comparison — pad to same length to satisfy timingSafeEqual requirement
+    const expected = Buffer.from(MCP_OAUTH_PIN, 'utf-8');
+    const provided = Buffer.from(pin || '', 'utf-8');
+    const maxLen = Math.max(expected.length, provided.length);
+    const expectedPadded = Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]);
+    const providedPadded = Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]);
+
+    const lengthMatch = expected.length === provided.length;
+    const bytesMatch = timingSafeEqual(expectedPadded, providedPadded);
+    const pinMatch = lengthMatch && bytesMatch;
+
+    if (!pinMatch) {
+      const attemptsLeft = this.recordFailedAttempt(ip);
+      console.warn(`[OAuth] Failed PIN attempt from IP: ${ip}, attempts remaining: ${attemptsLeft}`);
+      const msg = attemptsLeft > 0
+        ? `Incorrect PIN (${attemptsLeft} attempts remaining)`
+        : 'Incorrect PIN — account locked for 15 minutes';
+      return { error: msg, status: 403, showLoginPage: true };
+    }
+
+    this.resetAttempts(ip);
+
+    // Issue authorization code — one-time use
+    const code = randomBytes(24).toString('hex');
+
+    // Store code data for later token exchange
+    this.issuedCodes.set(code, {
+      client_id: pending.client_id,
+      redirect_uri: pending.redirect_uri,
+      scopes: pending.scopes,
+      code_challenge: pending.code_challenge,
+      resource: pending.resource,
+      issued_at: Date.now(),
+    });
+
+    // Remove pending auth — it's consumed
+    this.pendingAuthorizations.delete(stateKey);
+
+    console.log(`[OAuth] PIN verified, auth code issued for client: ${pending.client_id}`);
+
+    // Build redirect URI with code and original state
+    const redirectUrl = new URL(pending.redirect_uri);
+    redirectUrl.searchParams.set('code', code);
+    if (pending.state) redirectUrl.searchParams.set('state', pending.state);
+
+    return { redirectUri: redirectUrl.toString() };
+  }
+
+  // ─── Token exchange ──────────────────────────────────────────────────────
+
+  exchangeAuthorizationCode(params: {
+    client_id: string;
+    code: string;
+    code_verifier: string;
+    redirect_uri: string;
+  }): { access_token: string; token_type: 'bearer'; expires_in: number } | { error: string; status: number } {
+    const codeData = this.issuedCodes.get(params.code);
+    if (!codeData) {
+      return { error: 'invalid_grant', status: 400 };
+    }
+
+    // Auth codes are one-time use — delete immediately (even on failure)
+    this.issuedCodes.delete(params.code);
+
+    // Check code expiry (5 minutes)
+    if (Date.now() - codeData.issued_at > AUTH_CODE_TTL_MS) {
+      return { error: 'invalid_grant: authorization code expired', status: 400 };
+    }
+
+    if (codeData.client_id !== params.client_id) {
+      return { error: 'invalid_grant: client_id mismatch', status: 400 };
+    }
+
+    if (codeData.redirect_uri !== params.redirect_uri) {
+      return { error: 'invalid_grant: redirect_uri mismatch', status: 400 };
+    }
+
+    // PKCE: SHA-256(code_verifier) base64url must equal stored code_challenge
+    const verifierHash = createHash('sha256')
+      .update(params.code_verifier)
+      .digest('base64url');
+
+    if (verifierHash !== codeData.code_challenge) {
+      console.warn(`[OAuth] PKCE verification failed for client: ${params.client_id}`);
+      return { error: 'invalid_grant: PKCE verification failed', status: 400 };
+    }
+
+    const access_token = randomBytes(32).toString('hex');
+    const expires_at = Date.now() + TOKEN_TTL_MS;
+
+    this.state.tokens[access_token] = {
+      client_id: codeData.client_id,
+      scopes: codeData.scopes,
+      expires_at,
+      resource: codeData.resource,
+    };
+    this.saveState();
+
+    console.log(`[OAuth] Access token issued for client: ${codeData.client_id}`);
+
+    return {
+      access_token,
+      token_type: 'bearer',
+      expires_in: Math.floor(TOKEN_TTL_MS / 1000),
+    };
+  }
+
+  // ─── Token verification ──────────────────────────────────────────────────
+
+  /**
+   * Verify an access token.
+   * Checks OAuth-issued tokens first, then falls back to static MCP_AUTH_TOKEN.
+   */
+  verifyAccessToken(token: string): AuthInfo | null {
+    if (!token) return null;
+
+    // 1. OAuth-issued tokens
+    const data = this.state.tokens[token];
+    if (data) {
+      if (data.expires_at < Date.now()) {
+        delete this.state.tokens[token];
+        this.saveState();
+        return null;
+      }
+      return {
+        token,
+        client_id: data.client_id,
+        scopes: data.scopes,
+        expires_at: data.expires_at,
+      };
+    }
+
+    // 2. Static Bearer token fallback
+    if (!MCP_AUTH_TOKEN) return null;
+
+    const expected = Buffer.from(MCP_AUTH_TOKEN, 'utf-8');
+    const provided = Buffer.from(token, 'utf-8');
+    const maxLen = Math.max(expected.length, provided.length);
+    const expectedPadded = Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]);
+    const providedPadded = Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]);
+
+    const match = timingSafeEqual(expectedPadded, providedPadded) && expected.length === provided.length;
+    if (!match) return null;
+
+    return {
+      token: '[redacted]',
+      client_id: 'static-bearer',
+      scopes: ['read', 'write'],
+      expires_at: STATIC_TOKEN_EXPIRES_AT,
+    };
+  }
+
+  // ─── Token revocation ────────────────────────────────────────────────────
+
+  revokeToken(token: string): void {
+    if (this.state.tokens[token]) {
+      delete this.state.tokens[token];
+      this.saveState();
+      console.log('[OAuth] Token revoked');
+    }
+  }
+
+  // ─── Accessors for testing ───────────────────────────────────────────────
+
+  getTokenCount(): number {
+    return Object.keys(this.state.tokens).length;
+  }
+
+  getClientCount(): number {
+    return Object.keys(this.state.clients).length;
+  }
+}
+
+// Singleton instance
+let _provider: OAuthProvider | null = null;
+
+export function getOAuthProvider(): OAuthProvider {
+  if (!_provider) {
+    _provider = new OAuthProvider();
+  }
+  return _provider;
+}
+
+/** Reset singleton (for testing) */
+export function resetOAuthProvider(): void {
+  _provider = null;
+}
diff --git a/src/oauth/routes.ts b/src/oauth/routes.ts
new file mode 100644
index 00000000..3457daea
--- /dev/null
+++ b/src/oauth/routes.ts
@@ -0,0 +1,247 @@
+/**
+ * OAuth 2.1 Hono routes for Oracle v3
+ *
+ * Registers all OAuth endpoints on the Hono app.
+ * Only mounted when MCP_OAUTH_PIN is set.
+ *
+ * Endpoints:
+ *   GET  /.well-known/oauth-authorization-server  — AS metadata
+ *   GET  /.well-known/oauth-protected-resource    — Resource metadata
+ *   POST /register                                — Dynamic client registration (RFC 7591, Bearer-protected)
+ *   GET  /authorize                               — Authorization endpoint
+ *   POST /token                                   — Token endpoint
+ *   POST /revoke                                  — Revocation endpoint
+ *   GET  /oauth/login                             — PIN entry page
+ *   POST /oauth/callback                          — PIN verification + redirect (rate-limited)
+ */
+
+import type { Context, Hono } from 'hono';
+import { MCP_EXTERNAL_URL } from '../config.ts';
+import { getOAuthProvider } from './provider.ts';
+
+/** Extract best-effort client IP from request headers */
+function getClientIp(c: Context): string {
+  const forwarded = c.req.header('x-forwarded-for');
+  if (forwarded) return forwarded.split(',')[0].trim();
+  return c.req.header('x-real-ip') ?? 'unknown';
+}
+
+export function registerOAuthRoutes(app: Hono): void {
+  // ─── Discovery metadata ────────────────────────────────────────────────
+
+  app.get('/.well-known/oauth-authorization-server', (c) => {
+    return c.json({
+      issuer: MCP_EXTERNAL_URL,
+      authorization_endpoint: `${MCP_EXTERNAL_URL}/authorize`,
+      token_endpoint: `${MCP_EXTERNAL_URL}/token`,
+      registration_endpoint: `${MCP_EXTERNAL_URL}/register`,
+      revocation_endpoint: `${MCP_EXTERNAL_URL}/revoke`,
+      response_types_supported: ['code'],
+      grant_types_supported: ['authorization_code'],
+      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
+      code_challenge_methods_supported: ['S256'],
+      scopes_supported: ['read', 'write'],
+    });
+  });
+
+  app.get('/.well-known/oauth-protected-resource', (c) => {
+    return c.json({
+      resource: MCP_EXTERNAL_URL,
+      authorization_servers: [MCP_EXTERNAL_URL],
+      scopes_supported: ['read', 'write'],
+      bearer_methods_supported: ['header'],
+    });
+  });
+
+  // ─── Dynamic client registration (RFC 7591) ───────────────────────────
+  // Protected: requires Bearer MCP_AUTH_TOKEN to prevent open registration abuse.
+
+  app.post('/register', async (c) => {
+    const provider = getOAuthProvider();
+
+    // Require Bearer auth for registration
+    const authHeader = c.req.header('Authorization') ?? '';
+    if (!provider.checkRegistrationAuth(authHeader)) {
+      return c.json(
+        { error: 'unauthorized', error_description: 'Client registration requires a valid Bearer token' },
+        401,
+      );
+    }
+
+    let body: Record<string, unknown>;
+    try {
+      body = await c.req.json();
+    } catch {
+      return c.json({ error: 'invalid_request: body must be JSON' }, 400);
+    }
+
+    const redirect_uris = body.redirect_uris;
+    if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
+      return c.json({ error: 'invalid_client_metadata: redirect_uris required' }, 400);
+    }
+
+    const client = provider.registerClient({
+      redirect_uris: redirect_uris as string[],
+      client_name: body.client_name as string | undefined,
+      grant_types: body.grant_types as string[] | undefined,
+      response_types: body.response_types as string[] | undefined,
+      scope: body.scope as string | undefined,
+      token_endpoint_auth_method: body.token_endpoint_auth_method as string | undefined,
+    });
+
+    return c.json(client, 201);
+  });
+
+  // ─── Authorization endpoint ───────────────────────────────────────────
+
+  app.get('/authorize', (c) => {
+    const client_id = c.req.query('client_id') || '';
+    const redirect_uri = c.req.query('redirect_uri') || '';
+    const scope = c.req.query('scope');
+    const state = c.req.query('state');
+    const code_challenge = c.req.query('code_challenge') || '';
+    const code_challenge_method = c.req.query('code_challenge_method') || '';
+    const resource = c.req.query('resource');
+    const response_type = c.req.query('response_type');
+
+    if (response_type !== 'code') {
+      return c.json({ error: 'unsupported_response_type' }, 400);
+    }
+
+    const provider = getOAuthProvider();
+    const result = provider.authorize({
+      client_id,
+      redirect_uri,
+      scope,
+      state,
+      code_challenge,
+      code_challenge_method,
+      resource,
+    });
+
+    if ('error' in result) {
+      return c.json({ error: result.error }, 400);
+    }
+
+    return c.redirect(result.loginUrl, 302);
+  });
+
+  // ─── Token endpoint ───────────────────────────────────────────────────
+
+  app.post('/token', async (c) => {
+    let params: Record<string, string>;
+
+    const contentType = c.req.header('Content-Type') || '';
+    if (contentType.includes('application/x-www-form-urlencoded')) {
+      const text = await c.req.text();
+      params = Object.fromEntries(new URLSearchParams(text));
+    } else {
+      // Try JSON fallback
+      try {
+        params = await c.req.json() as Record<string, string>;
+      } catch {
+        return c.json({ error: 'invalid_request: unsupported content type' }, 400);
+      }
+    }
+
+    const grant_type = params.grant_type;
+    if (grant_type !== 'authorization_code') {
+      return c.json({ error: 'unsupported_grant_type' }, 400);
+    }
+
+    const code = params.code;
+    const client_id = params.client_id;
+    const code_verifier = params.code_verifier;
+    const redirect_uri = params.redirect_uri;
+
+    if (!code || !client_id || !code_verifier || !redirect_uri) {
+      return c.json({ error: 'invalid_request: missing required parameters' }, 400);
+    }
+
+    const provider = getOAuthProvider();
+    const result = provider.exchangeAuthorizationCode({
+      client_id,
+      code,
+      code_verifier,
+      redirect_uri,
+    });
+
+    if ('error' in result) {
+      return c.json({ error: result.error }, result.status as 400 | 503);
+    }
+
+    return c.json(result);
+  });
+
+  // ─── Token revocation ─────────────────────────────────────────────────
+
+  app.post('/revoke', async (c) => {
+    let token: string | undefined;
+
+    const contentType = c.req.header('Content-Type') || '';
+    if (contentType.includes('application/x-www-form-urlencoded')) {
+      const text = await c.req.text();
+      const params = new URLSearchParams(text);
+      token = params.get('token') ?? undefined;
+    } else {
+      try {
+        const body = await c.req.json() as Record<string, string>;
+        token = body.token;
+      } catch {
+        // ignore
+      }
+    }
+
+    if (token) {
+      getOAuthProvider().revokeToken(token);
+    }
+
+    // RFC 7009: always return 200 even if token unknown
+    return c.json({}, 200);
+  });
+
+  // ─── PIN login page ───────────────────────────────────────────────────
+
+  app.get('/oauth/login', (c) => {
+    const stateKey = c.req.query('state') || '';
+    const provider = getOAuthProvider();
+    const html = provider.getLoginPage(stateKey);
+    return c.html(html);
+  });
+
+  app.post('/oauth/callback', async (c) => {
+    let stateKey: string;
+    let pin: string;
+
+    const contentType = c.req.header('Content-Type') || '';
+    if (contentType.includes('application/x-www-form-urlencoded')) {
+      const text = await c.req.text();
+      const params = new URLSearchParams(text);
+      stateKey = params.get('state') || '';
+      pin = params.get('pin') || '';
+    } else {
+      try {
+        const body = await c.req.json() as Record<string, string>;
+        stateKey = body.state || '';
+        pin = body.pin || '';
+      } catch {
+        return c.json({ error: 'invalid_request' }, 400);
+      }
+    }
+
+    const ip = getClientIp(c);
+    const provider = getOAuthProvider();
+    const result = provider.handleLoginCallback(stateKey, pin, ip);
+
+    if ('error' in result) {
+      if (result.showLoginPage) {
+        // Re-render login page with error message
+        const html = provider.getLoginPage(stateKey, result.error);
+        return c.html(html, result.status as 200 | 400 | 403 | 429 | 503);
+      }
+      return c.json({ error: result.error }, result.status as 400 | 403 | 429 | 503);
+    }
+
+    return c.redirect(result.redirectUri, 302);
+  });
+}
diff --git a/src/oauth/types.ts b/src/oauth/types.ts
new file mode 100644
index 00000000..bf10453e
--- /dev/null
+++ b/src/oauth/types.ts
@@ -0,0 +1,39 @@
+/**
+ * OAuth 2.1 types for Oracle v3
+ *
+ * Used by the OAuthProvider and Hono route handlers.
+ * Persisted to ORACLE_DATA_DIR/.oauth-state.json
+ */
+
+export interface OAuthTokenData {
+  client_id: string;
+  scopes: string[];
+  expires_at: number;
+  resource?: string;
+}
+
+export interface OAuthState {
+  clients: Record<string, OAuthClientInfo>;
+  tokens: Record<string, OAuthTokenData>;
+}
+
+export interface OAuthClientInfo {
+  client_id: string;
+  client_secret?: string;
+  redirect_uris: string[];
+  client_name?: string;
+  grant_types?: string[];
+  response_types?: string[];
+  scope?: string;
+  token_endpoint_auth_method?: string;
+}
+
+export interface PendingAuthorization {
+  client_id: string;
+  state?: string;
+  scopes: string[];
+  code_challenge: string;
+  redirect_uri: string;
+  resource?: string;
+  created_at: number;
+}
diff --git a/src/routes/knowledge.ts b/src/routes/knowledge.ts
index 5dd23e49..4cbaeee1 100644
--- a/src/routes/knowledge.ts
+++ b/src/routes/knowledge.ts
@@ -6,23 +6,27 @@ import type { Hono } from 'hono';
 import fs from 'fs';
 import path from 'path';
 import { REPO_ROOT } from '../config.ts';
-import { handleLearn } from '../server/handlers.ts';
+import { createLearning } from '../tools/learn.ts';
+import { db, sqlite } from '../db/index.ts';
 
 export function registerKnowledgeRoutes(app: Hono) {
-  // Learn
+  // Learn — uses shared createLearning() from tools/learn.ts
   app.post('/api/learn', async (c) => {
     try {
       const data = await c.req.json();
       if (!data.pattern) {
         return c.json({ error: 'Missing required field: pattern' }, 400);
       }
-      const result = handleLearn(
-        data.pattern,
-        data.source,
-        data.concepts,
-        data.origin,   // 'mother' | 'arthur' | 'volt' | 'human' (null = universal)
-        data.project,  // ghq-style project path (null = universal)
-        data.cwd       // Auto-detect project from cwd
+      const result = createLearning(
+        { db, sqlite, repoRoot: REPO_ROOT },
+        {
+          pattern: data.pattern,
+          source: data.source,
+          concepts: data.concepts,
+          project: data.project,
+          ttl: data.ttl,
+          origin: data.origin,
+        },
       );
       return c.json(result);
     } catch (error) {
diff --git a/src/scripts/backfill-ttl.ts b/src/scripts/backfill-ttl.ts
new file mode 100644
index 00000000..51a3bc22
--- /dev/null
+++ b/src/scripts/backfill-ttl.ts
@@ -0,0 +1,81 @@
+/**
+ * Backfill TTL for existing oracle_documents rows
+ *
+ * Sets ttl_days and expires_at on rows whose IDs match known TTL patterns
+ * but currently have NULL values (created before TTL feature was added).
+ *
+ * Usage: bun src/scripts/backfill-ttl.ts [--dry-run]
+ */
+
+import { createDatabase } from '../db/index.ts';
+import { defaultTtlDays } from '../tools/learn.ts';
+
+const dryRun = process.argv.includes('--dry-run');
+const { sqlite } = createDatabase();
+
+// Fetch all rows missing TTL
+const rows = sqlite.prepare(`
+  SELECT id, source_file, created_at
+  FROM oracle_documents
+  WHERE ttl_days IS NULL AND expires_at IS NULL AND superseded_by IS NULL
+`).all() as { id: string; source_file: string; created_at: number }[];
+
+console.log(`Found ${rows.length} rows without TTL`);
+
+let updated = 0;
+let skipped = 0;
+
+const updateStmt = sqlite.prepare(`
+  UPDATE oracle_documents
+  SET ttl_days = ?, expires_at = ?
+  WHERE id = ?
+`);
+
+sqlite.exec('BEGIN');
+try {
+  for (const row of rows) {
+    // Extract title-like text from ID (learning_YYYY-MM-DD_slug)
+    const slugPart = row.id.replace(/^learning_\d{4}-\d{2}-\d{2}_/, '');
+    // Reconstruct approximate title from slug for pattern matching
+    const approxTitle = slugPart.replace(/-/g, ' ');
+
+    // Also check source_file path for pattern hints
+    const combined = `${approxTitle} ${row.source_file}`;
+
+    // Try matching against TTL patterns using the title
+    // The patterns check for [score-output], [infra-health], etc. prefixes
+    // We need to check the slug which doesn't have brackets, so do manual matching
+    let ttlDays: number | null = null;
+
+    if (/^score-output/i.test(slugPart)) ttlDays = 7;
+    else if (/^infra-health/i.test(slugPart)) ttlDays = 7;
+    else if (/^remediation-audit/i.test(slugPart)) ttlDays = 14;
+    else if (/^daily-goal/i.test(slugPart)) ttlDays = 7;
+    else if (/^goal-carryover/i.test(slugPart)) ttlDays = 7;
+    else if (/^retro/i.test(slugPart)) ttlDays = 30;
+    // Also match patterns in the middle of the slug (e.g., "infrastructure-health-check")
+    else if (/infrastructure-health/i.test(slugPart)) ttlDays = 7;
+
+    if (ttlDays) {
+      const expiresAt = row.created_at + (ttlDays * 86400000);
+      if (dryRun) {
+        console.log(`  [DRY-RUN] ${row.id} → ttl=${ttlDays}d, expires=${new Date(expiresAt).toISOString().split('T')[0]}`);
+      } else {
+        updateStmt.run(ttlDays, expiresAt, row.id);
+      }
+      updated++;
+    } else {
+      skipped++;
+    }
+  }
+  sqlite.exec('COMMIT');
+} catch (e) {
+  sqlite.exec('ROLLBACK');
+  throw e;
+}
+
+console.log(`\nDone${dryRun ? ' (dry-run)' : ''}:`);
+console.log(`  Updated: ${updated}`);
+console.log(`  Skipped (permanent): ${skipped}`);
+
+sqlite.close();
diff --git a/src/scripts/index-model.ts b/src/scripts/index-model.ts
index faeb19c9..4ef27da2 100644
--- a/src/scripts/index-model.ts
+++ b/src/scripts/index-model.ts
@@ -39,12 +39,18 @@ async function main() {
   const [{ total: docCount }] = db.select({ total: count() }).from(oracleDocuments).all();
   console.log(`Documents: ${docCount}`);
 
+  const dbType = (process.env.ORACLE_VECTOR_DB || 'lancedb') as any;
+  const embedProvider = (process.env.ORACLE_EMBEDDING_PROVIDER || 'ollama') as any;
+  const embedModel = embedProvider === 'openai'
+    ? (process.env.ORACLE_EMBEDDING_MODEL || 'text-embedding-3-small')
+    : preset.model;
+
   const store = createVectorStore({
-    type: 'lancedb',
+    type: dbType,
     collectionName: preset.collection,
-    embeddingProvider: 'ollama',
-    embeddingModel: preset.model,
-    ...(preset.dataPath && { dataPath: preset.dataPath }),
+    embeddingProvider: embedProvider,
+    embeddingModel: embedModel,
+    ...(dbType === 'lancedb' && preset.dataPath && { dataPath: preset.dataPath }),
   });
 
   await store.connect();
diff --git a/src/server.ts b/src/server.ts
index 3692ccd8..5b433b06 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -6,6 +6,7 @@
  */
 
 import { Hono } from 'hono';
+import { timingSafeEqual, createHmac } from 'crypto';
 import { cors } from 'hono/cors';
 import { eq } from 'drizzle-orm';
 
@@ -17,7 +18,7 @@ import {
   performGracefulShutdown,
 } from './process-manager/index.ts';
 
-import { PORT, ORACLE_DATA_DIR } from './config.ts';
+import { PORT, ORACLE_DATA_DIR, MCP_AUTH_TOKEN, MCP_OAUTH_PIN, MCP_EXTERNAL_URL } from './config.ts';
 import { db, closeDb, indexingStatus } from './db/index.ts';
 
 // Route modules
@@ -33,6 +34,9 @@ import { registerTraceRoutes } from './routes/traces.ts';
 import { registerKnowledgeRoutes } from './routes/knowledge.ts';
 import { registerSupersedeRoutes } from './routes/supersede.ts';
 import { registerFileRoutes } from './routes/files.ts';
+import { createMcpHandler } from './mcp-transport.ts';
+import { registerOAuthRoutes } from './oauth/routes.ts';
+import { getOAuthProvider } from './oauth/provider.ts';
 
 // Reset stale indexing status on startup using Drizzle
 try {
@@ -105,6 +109,70 @@ registerKnowledgeRoutes(app);
 registerSupersedeRoutes(app);
 registerFileRoutes(app);
 
+// OAuth 2.1 routes — mount before /mcp so discovery endpoints are available
+if (MCP_OAUTH_PIN) {
+  registerOAuthRoutes(app);
+}
+
+// MCP CORS — allow any origin for /mcp (auth is via Bearer token or OAuth, not CORS)
+app.use('/mcp', cors({
+  origin: '*',
+  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
+  allowHeaders: ['Authorization', 'Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'Last-Event-ID'],
+  exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
+}));
+
+// MCP Streamable HTTP endpoint — Bearer token auth (OAuth or static), stateless per-request
+app.all('/mcp', async (c) => {
+  // Require at least one auth method to be configured
+  if (!MCP_AUTH_TOKEN && !MCP_OAUTH_PIN) {
+    return c.json({ error: 'MCP endpoint not configured (MCP_AUTH_TOKEN not set)' }, 401);
+  }
+
+  const authHeader = c.req.header('Authorization') || '';
+  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
+
+  let authorized = false;
+
+  if (MCP_OAUTH_PIN) {
+    // OAuth mode: delegate verification to provider (checks OAuth tokens + static Bearer fallback)
+    const provider = getOAuthProvider();
+    const authInfo = provider.verifyAccessToken(token);
+    authorized = authInfo !== null;
+  } else {
+    // Bearer-only mode: constant-time HMAC comparison
+    if (MCP_AUTH_TOKEN) {
+      const _hmacKey = Buffer.alloc(32);
+      const expectedHash = createHmac('sha256', _hmacKey).update(MCP_AUTH_TOKEN).digest();
+      const providedHash = createHmac('sha256', _hmacKey).update(token).digest();
+      authorized = timingSafeEqual(expectedHash, providedHash);
+    }
+  }
+
+  if (!authorized) {
+    // Include WWW-Authenticate header so MCP clients can discover OAuth
+    if (MCP_OAUTH_PIN) {
+      c.header('WWW-Authenticate', `Bearer resource_metadata="${MCP_EXTERNAL_URL}/.well-known/oauth-protected-resource"`);
+    }
+    return c.json({ error: 'Unauthorized' }, 401);
+  }
+
+  // Add MCP-specific CORS headers
+  c.header('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');
+  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, mcp-session-id, mcp-protocol-version, Last-Event-ID');
+
+  try {
+    const response = await createMcpHandler(c.req.raw);
+    return response;
+  } catch (err) {
+    console.error('[MCP] Handler error:', err);
+    return c.json(
+      { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
+      500,
+    );
+  }
+});
+
 // Startup banner
 console.log(`
 🔮 Arra Oracle HTTP Server running! (Hono.js)
@@ -132,7 +200,17 @@ console.log(`
    - GET  /api/supersede       List supersessions
    - GET  /api/supersede/chain/:path  Document lineage
    - POST /api/supersede       Log supersession
+
+   MCP (Remote):
+   - ALL /mcp                  Streamable HTTP MCP endpoint
 `);
+console.log(MCP_AUTH_TOKEN ? '   🔑 MCP auth: Bearer token configured' : '   ⚠️  MCP auth: Bearer token NOT configured');
+if (MCP_OAUTH_PIN) {
+  console.log(`   🔐 OAuth 2.1: enabled (${MCP_EXTERNAL_URL})`);
+  console.log('      Endpoints: /.well-known/oauth-authorization-server, /authorize, /token, /register');
+} else {
+  console.log('   ℹ️  OAuth 2.1: disabled (set MCP_OAUTH_PIN to enable)');
+}
 
 export default {
   port: Number(PORT),
diff --git a/src/server/handlers.ts b/src/server/handlers.ts
index 5fca7072..e16dddff 100644
--- a/src/server/handlers.ts
+++ b/src/server/handlers.ts
@@ -42,7 +42,7 @@ export async function handleSearch(
   // Remove FTS5 special characters and HTML: ? * + - ( ) ^ ~ " ' : < > { } [ ] ; / \
   const safeQuery = query
     .replace(/<[^>]*>/g, ' ')           // Strip HTML tags
-    .replace(/[?*+\-()^~"':;<>{}[\]\\\/]/g, ' ')  // Strip FTS5 + SQL special chars
+    .replace(/[?*+\-()^~"':;<>{}[\]\\\/%]/g, ' ')  // Strip FTS5 + SQL special chars (incl. %)
     .replace(/\s+/g, ' ')
     .trim();
   if (!safeQuery) {
@@ -62,6 +62,9 @@ export async function handleSearch(
     : '1=1';
   const projectParams = resolvedProject ? [resolvedProject] : [];
 
+  // Supersede filter: exclude superseded documents by default (Issue #5/#8)
+  const supersedeFilter = 'AND d.superseded_by IS NULL';
+
   // FTS5 search must use raw SQL (Drizzle doesn't support virtual tables)
   if (mode !== 'vector') {
     if (type === 'all') {
@@ -69,7 +72,7 @@ export async function handleSearch(
         SELECT COUNT(*) as total
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND ${projectFilter}
+        WHERE oracle_fts MATCH ? AND ${projectFilter} ${supersedeFilter}
       `);
       ftsTotal = (countStmt.get(safeQuery, ...projectParams) as { total: number }).total;
 
@@ -77,7 +80,7 @@ export async function handleSearch(
         SELECT f.id, f.content, d.type, d.source_file, d.concepts, d.project, rank as score
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND ${projectFilter}
+        WHERE oracle_fts MATCH ? AND ${projectFilter} ${supersedeFilter}
         ORDER BY rank
         LIMIT ?
       `);
@@ -96,7 +99,7 @@ export async function handleSearch(
         SELECT COUNT(*) as total
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND d.type = ? AND ${projectFilter}
+        WHERE oracle_fts MATCH ? AND d.type = ? AND ${projectFilter} ${supersedeFilter}
       `);
       ftsTotal = (countStmt.get(safeQuery, type, ...projectParams) as { total: number }).total;
 
@@ -104,7 +107,7 @@ export async function handleSearch(
         SELECT f.id, f.content, d.type, d.source_file, d.concepts, d.project, rank as score
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND d.type = ? AND ${projectFilter}
+        WHERE oracle_fts MATCH ? AND d.type = ? AND ${projectFilter} ${supersedeFilter}
         ORDER BY rank
         LIMIT ?
       `);
@@ -225,8 +228,22 @@ export async function handleSearch(
     }
   }
 
+  // Post-filter: remove superseded docs from vector results (FTS already filtered via SQL)
+  const supersededIds = new Set<string>();
+  const vectorIds = combined.filter(r => r.source === 'vector' || r.source === 'hybrid').map(r => r.id);
+  if (vectorIds.length > 0) {
+    const placeholders = vectorIds.map(() => '?').join(',');
+    const excludeRows = sqlite.prepare(
+      `SELECT id FROM oracle_documents WHERE id IN (${placeholders}) AND superseded_by IS NOT NULL`
+    ).all(...vectorIds) as { id: string }[];
+    for (const row of excludeRows) supersededIds.add(row.id);
+  }
+  const filtered = supersededIds.size > 0
+    ? combined.filter(r => !supersededIds.has(r.id))
+    : combined;
+
   // Apply pagination
-  const results = combined.slice(offset, offset + limit);
+  const results = filtered.slice(offset, offset + limit);
 
   // Log search
   const searchTime = Date.now() - startTime;
diff --git a/src/tools/__tests__/search.test.ts b/src/tools/__tests__/search.test.ts
index 9b793661..bd3d6a4a 100644
--- a/src/tools/__tests__/search.test.ts
+++ b/src/tools/__tests__/search.test.ts
@@ -21,6 +21,8 @@ describe('sanitizeFtsQuery', () => {
     expect(sanitizeFtsQuery('test*')).toBe('test');
     expect(sanitizeFtsQuery('a + b')).toBe('a b');
     expect(sanitizeFtsQuery('NOT this')).toBe('NOT this');
+    expect(sanitizeFtsQuery('disk 64%')).toBe('disk 64');
+    expect(sanitizeFtsQuery('80% usage')).toBe('80 usage');
   });
 
   it('should handle quotes', () => {
diff --git a/src/tools/__tests__/ttl.test.ts b/src/tools/__tests__/ttl.test.ts
new file mode 100644
index 00000000..715caf7b
--- /dev/null
+++ b/src/tools/__tests__/ttl.test.ts
@@ -0,0 +1,79 @@
+/**
+ * Unit tests for TTL helpers (pure functions).
+ */
+
+import { describe, it, expect } from 'bun:test';
+import { parseTtl, defaultTtlDays } from '../learn.ts';
+
+// ============================================================================
+// parseTtl
+// ============================================================================
+
+describe('parseTtl', () => {
+  it('should parse valid day strings', () => {
+    expect(parseTtl('7d')).toBe(7);
+    expect(parseTtl('14d')).toBe(14);
+    expect(parseTtl('30d')).toBe(30);
+    expect(parseTtl('365d')).toBe(365);
+  });
+
+  it('should return null for zero days', () => {
+    expect(parseTtl('0d')).toBeNull();
+  });
+
+  it('should return null for invalid input', () => {
+    expect(parseTtl('abc')).toBeNull();
+    expect(parseTtl('')).toBeNull();
+    expect(parseTtl(undefined)).toBeNull();
+    expect(parseTtl('7')).toBeNull();
+    expect(parseTtl('d')).toBeNull();
+    expect(parseTtl('-5d')).toBeNull();
+  });
+
+  it('should enforce max TTL of 365 days', () => {
+    expect(parseTtl('365d')).toBe(365);
+    expect(parseTtl('366d')).toBeNull();
+    expect(parseTtl('999999d')).toBeNull();
+  });
+});
+
+// ============================================================================
+// defaultTtlDays
+// ============================================================================
+
+describe('defaultTtlDays', () => {
+  it('should return 7 for score-output prefix', () => {
+    expect(defaultTtlDays('[score-output] infra-health: disk 64%, all green')).toBe(7);
+  });
+
+  it('should return 7 for infra-health prefix', () => {
+    expect(defaultTtlDays('[infra-health] disk usage at 79%')).toBe(7);
+  });
+
+  it('should return 14 for remediation-audit prefix', () => {
+    expect(defaultTtlDays('[remediation-audit] stale reports cleaned')).toBe(14);
+  });
+
+  it('should return 7 for daily-goal prefix', () => {
+    expect(defaultTtlDays('[daily-goal] P2: Add vector alerting')).toBe(7);
+  });
+
+  it('should return 7 for goal-carryover prefix', () => {
+    expect(defaultTtlDays('[goal-carryover] P0: Fix ChromaDB vector search')).toBe(7);
+  });
+
+  it('should return 30 for retro prefix', () => {
+    expect(defaultTtlDays('[retro] session 2026-04-07 retrospective')).toBe(30);
+  });
+
+  it('should return null for patterns without TTL prefix', () => {
+    expect(defaultTtlDays('Oracle v3 ChromaDB connectivity issue')).toBeNull();
+    expect(defaultTtlDays('Some regular learning')).toBeNull();
+  });
+
+  it('should be case insensitive', () => {
+    expect(defaultTtlDays('[SCORE-OUTPUT] test')).toBe(7);
+    expect(defaultTtlDays('[Score-Output] test')).toBe(7);
+    expect(defaultTtlDays('[INFRA-HEALTH] test')).toBe(7);
+  });
+});
diff --git a/src/tools/learn.ts b/src/tools/learn.ts
index cc37c076..4bc18f93 100644
--- a/src/tools/learn.ts
+++ b/src/tools/learn.ts
@@ -7,11 +7,43 @@
 
 import path from 'path';
 import fs from 'fs';
-import { oracleDocuments } from '../db/schema.ts';
+import { oracleDocuments, learnLog } from '../db/schema.ts';
 import { detectProject } from '../server/project-detect.ts';
 import { getVaultPsiRoot } from '../vault/handler.ts';
 import type { ToolContext, ToolResponse, OracleLearnInput } from './types.ts';
 
+// ============================================================================
+// TTL Helpers (Issue #4)
+// ============================================================================
+
+/** Default TTL by title pattern prefix */
+const TTL_PATTERNS: [RegExp, number][] = [
+  [/^\[score-output\]/i, 7],
+  [/^\[infra-health\]/i, 7],
+  [/^\[remediation-audit\]/i, 14],
+  [/^\[daily-goal\]/i, 7],
+  [/^\[goal-carryover\]/i, 7],
+  [/^\[retro\]/i, 30],
+];
+
+/** Parse TTL string like "7d" → number of days, or null if invalid */
+export function parseTtl(ttl: string | undefined | null): number | null {
+  if (!ttl) return null;
+  const match = ttl.match(/^(\d+)d$/);
+  if (!match) return null;
+  const days = parseInt(match[1], 10);
+  if (days <= 0 || days > 365) return null;
+  return days;
+}
+
+/** Get default TTL in days based on title pattern prefix, or null for permanent */
+export function defaultTtlDays(title: string): number | null {
+  for (const [pattern, days] of TTL_PATTERNS) {
+    if (pattern.test(title)) return days;
+  }
+  return null;
+}
+
 /** Coerce concepts to string[] — handles string, array, or undefined from MCP input */
 export function coerceConcepts(concepts: unknown): string[] {
   if (Array.isArray(concepts)) return concepts.map(String);
@@ -41,6 +73,10 @@ export const learnToolDef = {
       project: {
         type: 'string',
         description: 'Source project. Accepts: "github.com/owner/repo", "owner/repo", local path with ghq/Code prefix, or GitHub URL. Auto-normalized to "github.com/owner/repo" format.'
+      },
+      ttl: {
+        type: 'string',
+        description: 'Optional TTL for auto-expiry (e.g. "7d", "14d", "30d"). Auto-assigned by title pattern if omitted: [score-output]=7d, [infra-health]=7d, [remediation-audit]=14d, [daily-goal]=7d, [goal-carryover]=7d, [retro]=30d. No TTL = permanent.'
       }
     },
     required: ['pattern']
@@ -98,11 +134,35 @@ export function extractProjectFromSource(source?: string): string | null {
 }
 
 // ============================================================================
-// Handler
+// Shared Core Logic — used by both MCP handler and HTTP route
 // ============================================================================
 
-export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Promise<ToolResponse> {
-  const { pattern, source, concepts, project: projectInput } = input;
+export interface LearnDeps {
+  db: ToolContext['db'];
+  sqlite: ToolContext['sqlite'];
+  repoRoot: string;
+}
+
+export interface LearnInput {
+  pattern: string;
+  source?: string;
+  concepts?: string[] | string;
+  project?: string;
+  ttl?: string;
+  origin?: string;
+}
+
+export interface LearnResult {
+  success: true;
+  file: string;
+  id: string;
+  ttl?: string;
+  expires_at?: string;
+  message: string;
+}
+
+export function createLearning(deps: LearnDeps, input: LearnInput): LearnResult {
+  const { pattern, source, ttl, origin } = input;
   const now = new Date();
   const dateStr = now.toISOString().split('T')[0];
 
@@ -121,9 +181,9 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
   if ('needsInit' in vault) console.error(`[Vault] ${vault.hint}`);
   const vaultRoot = 'path' in vault ? vault.path : null;
 
-  const project = normalizeProject(projectInput)
+  const project = normalizeProject(input.project)
     || extractProjectFromSource(source)
-    || detectProject(ctx.repoRoot);
+    || detectProject(deps.repoRoot);
   const projectDir = (project || '_universal').toLowerCase();
 
   let filePath: string;
@@ -134,7 +194,7 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
     filePath = path.join(dir, filename);
     sourceFileRel = `${projectDir}/ψ/memory/learnings/${filename}`;
   } else {
-    const dir = path.join(ctx.repoRoot, 'ψ/memory/learnings');
+    const dir = path.join(deps.repoRoot, 'ψ/memory/learnings');
     fs.mkdirSync(dir, { recursive: true });
     filePath = path.join(dir, filename);
     sourceFileRel = `ψ/memory/learnings/${filename}`;
@@ -145,7 +205,9 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
   }
 
   const title = pattern.split('\n')[0].substring(0, 80);
-  const conceptsList = coerceConcepts(concepts);
+  const conceptsList = coerceConcepts(input.concepts);
+  const ttlDays = parseTtl(ttl) ?? defaultTtlDays(title);
+  const expiresAt = ttlDays ? now.getTime() + (ttlDays * 86400000) : null;
   const frontmatter = [
     '---',
     `title: ${title}`,
@@ -153,6 +215,8 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
     `created: ${dateStr}`,
     `source: ${source || 'Oracle Learn'}`,
     ...(project ? [`project: ${project}`] : []),
+    ...(ttlDays ? [`ttl: ${ttlDays}d`] : []),
+    ...(expiresAt ? [`expires: ${new Date(expiresAt).toISOString().split('T')[0]}`] : []),
     '---',
     '',
     `# ${title}`,
@@ -168,7 +232,7 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
 
   const id = `learning_${dateStr}_${slug}`;
 
-  ctx.db.insert(oracleDocuments).values({
+  deps.db.insert(oracleDocuments).values({
     id,
     type: 'learning',
     sourceFile: sourceFileRel,
@@ -176,25 +240,55 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
     createdAt: now.getTime(),
     updatedAt: now.getTime(),
     indexedAt: now.getTime(),
-    origin: null,
+    origin: origin || null,
     project,
     createdBy: 'arra_learn',
+    expiresAt,
+    ttlDays,
   }).run();
 
-  ctx.sqlite.prepare(`
+  deps.sqlite.prepare(`
     INSERT INTO oracle_fts (id, content, concepts)
     VALUES (?, ?, ?)
   `).run(id, frontmatter, conceptsList.join(' '));
 
+  // Log the learning (was lost during createLearning refactor)
+  try {
+    deps.db.insert(learnLog).values({
+      documentId: id,
+      patternPreview: pattern.substring(0, 100),
+      source: source || 'Oracle Learn',
+      concepts: JSON.stringify(conceptsList),
+      createdAt: now.getTime(),
+      project: project || null,
+    }).run();
+  } catch (e) {
+    console.error('Failed to log learning:', e);
+  }
+
+  return {
+    success: true,
+    file: sourceFileRel,
+    id,
+    ...(ttlDays ? { ttl: `${ttlDays}d`, expires_at: new Date(expiresAt!).toISOString() } : {}),
+    message: `Pattern added to Oracle knowledge base${vaultRoot ? ' (vault)' : ''}${ttlDays ? ` (expires in ${ttlDays} days)` : ''}`,
+  };
+}
+
+// ============================================================================
+// MCP Handler — wraps createLearning in ToolResponse
+// ============================================================================
+
+export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Promise<ToolResponse> {
+  const result = createLearning(
+    { db: ctx.db, sqlite: ctx.sqlite, repoRoot: ctx.repoRoot },
+    input,
+  );
+
   return {
     content: [{
       type: 'text',
-      text: JSON.stringify({
-        success: true,
-        file: sourceFileRel,
-        id,
-        message: `Pattern added to Oracle knowledge base${vaultRoot ? ' (vault)' : ''}`
-      }, null, 2)
+      text: JSON.stringify(result, null, 2)
     }]
   };
 }
diff --git a/src/tools/list.ts b/src/tools/list.ts
index c6a50966..436628cd 100644
--- a/src/tools/list.ts
+++ b/src/tools/list.ts
@@ -50,16 +50,27 @@ export async function handleList(ctx: ToolContext, input: OracleListInput): Prom
     throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
   }
 
+  // TTL + supersede filters (Issue #4, #7)
+  const nowMs = Date.now();
+  const activeFilter = '(expires_at IS NULL OR expires_at > ?) AND superseded_by IS NULL';
+
   const countResult = type === 'all'
-    ? ctx.db.select({ total: sql<number>`count(*)` }).from(oracleDocuments).get()
-    : ctx.db.select({ total: sql<number>`count(*)` }).from(oracleDocuments).where(eq(oracleDocuments.type, type)).get();
+    ? ctx.sqlite.prepare(`SELECT count(*) as total FROM oracle_documents WHERE ${activeFilter}`).get(nowMs) as { total: number }
+    : ctx.sqlite.prepare(`SELECT count(*) as total FROM oracle_documents WHERE type = ? AND ${activeFilter}`).get(type, nowMs) as { total: number };
   const total = countResult?.total ?? 0;
 
+  const expiredResult = ctx.sqlite.prepare('SELECT count(*) as cnt FROM oracle_documents WHERE expires_at IS NOT NULL AND expires_at <= ?').get(nowMs) as { cnt: number };
+  const expiredCount = expiredResult?.cnt ?? 0;
+
+  const supersededResult = ctx.sqlite.prepare('SELECT count(*) as cnt FROM oracle_documents WHERE superseded_by IS NOT NULL').get() as { cnt: number };
+  const supersededCount = supersededResult?.cnt ?? 0;
+
   const listStmt = type === 'all'
     ? ctx.sqlite.prepare(`
         SELECT d.id, d.type, d.source_file, d.concepts, d.indexed_at, f.content
         FROM oracle_documents d
         JOIN oracle_fts f ON d.id = f.id
+        WHERE (d.expires_at IS NULL OR d.expires_at > ?) AND d.superseded_by IS NULL
         ORDER BY d.indexed_at DESC
         LIMIT ? OFFSET ?
       `)
@@ -67,14 +78,14 @@ export async function handleList(ctx: ToolContext, input: OracleListInput): Prom
         SELECT d.id, d.type, d.source_file, d.concepts, d.indexed_at, f.content
         FROM oracle_documents d
         JOIN oracle_fts f ON d.id = f.id
-        WHERE d.type = ?
+        WHERE d.type = ? AND (d.expires_at IS NULL OR d.expires_at > ?) AND d.superseded_by IS NULL
         ORDER BY d.indexed_at DESC
         LIMIT ? OFFSET ?
       `);
 
   const rows = type === 'all'
-    ? listStmt.all(limit, offset)
-    : listStmt.all(type, limit, offset);
+    ? listStmt.all(nowMs, limit, offset)
+    : listStmt.all(type, nowMs, limit, offset);
 
   const documents = (rows as any[]).map((row) => ({
     id: row.id,
@@ -89,7 +100,7 @@ export async function handleList(ctx: ToolContext, input: OracleListInput): Prom
   return {
     content: [{
       type: 'text',
-      text: JSON.stringify({ documents, total, limit, offset, type }, null, 2)
+      text: JSON.stringify({ documents, total, limit, offset, type, expired: expiredCount, superseded: supersededCount }, null, 2)
     }]
   };
 }
diff --git a/src/tools/search.ts b/src/tools/search.ts
index f1da37bf..ab4cdf77 100644
--- a/src/tools/search.ts
+++ b/src/tools/search.ts
@@ -55,6 +55,11 @@ export const searchToolDef = {
         type: 'string',
         enum: ['nomic', 'qwen3', 'bge-m3'],
         description: 'Embedding model: bge-m3 (default, multilingual Thai↔EN, 1024-dim), nomic (fast, 768-dim), or qwen3 (cross-language, 4096-dim)',
+      },
+      include_superseded: {
+        type: 'boolean',
+        description: 'Include superseded documents in results (default: false). Set true for audit trail or history review.',
+        default: false
       }
     },
     required: ['query']
@@ -71,7 +76,7 @@ export const searchToolDef = {
  */
 export function sanitizeFtsQuery(query: string): string {
   let sanitized = query
-    .replace(/[?*+\-()^~"':.\/]/g, ' ')
+    .replace(/[?*+\-()^~"':.\/%]/g, ' ')
     .replace(/\s+/g, ' ')
     .trim();
 
@@ -309,7 +314,7 @@ export function combineResults(
 
 export async function handleSearch(ctx: ToolContext, input: OracleSearchInput): Promise<ToolResponse> {
   const startTime = Date.now();
-  const { query, type = 'all', limit = 5, offset = 0, mode = 'hybrid', project, cwd, model } = input;
+  const { query, type = 'all', limit = 5, offset = 0, mode = 'hybrid', project, cwd, model, include_superseded = false } = input;
 
   if (!query || query.trim().length === 0) {
     throw new Error('Query cannot be empty');
@@ -327,6 +332,15 @@ export async function handleSearch(ctx: ToolContext, input: OracleSearchInput):
     : '';
   const projectParams = resolvedProject ? [resolvedProject] : [];
 
+  // TTL filter: exclude expired documents (Issue #4)
+  const nowMs = Date.now();
+  const ttlFilter = 'AND (d.expires_at IS NULL OR d.expires_at > ?)';
+  const ttlParams = [nowMs];
+
+  // Supersede filter: exclude superseded documents by default (Issue #7)
+  const supersedeFilter = include_superseded ? '' : 'AND d.superseded_by IS NULL';
+
+
   let warning: string | undefined;
   let vectorSearchError = false;
 
@@ -338,21 +352,21 @@ export async function handleSearch(ctx: ToolContext, input: OracleSearchInput):
         SELECT f.id, f.content, d.type, d.source_file, d.concepts, rank
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? ${projectFilter}
+        WHERE oracle_fts MATCH ? ${projectFilter} ${ttlFilter} ${supersedeFilter}
         ORDER BY rank
         LIMIT ?
       `);
-      ftsRawResults = stmt.all(safeQuery, ...projectParams, limit * 2);
+      ftsRawResults = stmt.all(safeQuery, ...projectParams, ...ttlParams, limit * 2);
     } else {
       const stmt = ctx.sqlite.prepare(`
         SELECT f.id, f.content, d.type, d.source_file, d.concepts, rank
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND d.type = ? ${projectFilter}
+        WHERE oracle_fts MATCH ? AND d.type = ? ${projectFilter} ${ttlFilter} ${supersedeFilter}
         ORDER BY rank
         LIMIT ?
       `);
-      ftsRawResults = stmt.all(safeQuery, type, ...projectParams, limit * 2);
+      ftsRawResults = stmt.all(safeQuery, type, ...projectParams, ...ttlParams, limit * 2);
     }
   }
 
@@ -391,8 +405,30 @@ export async function handleSearch(ctx: ToolContext, input: OracleSearchInput):
   }));
 
   const combinedResults = combineResults(ftsResults, normalizedVectorResults);
-  const totalMatches = combinedResults.length;
-  const results = combinedResults.slice(offset, offset + limit);
+
+  // Post-filter: remove expired + superseded docs from vector results (FTS already filtered via SQL)
+  const excludeIds = new Set<string>();
+  if (normalizedVectorResults.length > 0) {
+    const ids = combinedResults.map(r => r.id);
+    if (ids.length > 0) {
+      const placeholders = ids.map(() => '?').join(',');
+      const conditions = ['(expires_at IS NOT NULL AND expires_at <= ?)'];
+      const params: any[] = [...ids, nowMs];
+      if (!include_superseded) {
+        conditions.push('(superseded_by IS NOT NULL)');
+      }
+      const excludeRows = ctx.sqlite.prepare(
+        `SELECT id FROM oracle_documents WHERE id IN (${placeholders}) AND (${conditions.join(' OR ')})`
+      ).all(...params) as { id: string }[];
+      for (const row of excludeRows) excludeIds.add(row.id);
+    }
+  }
+  const filteredResults = excludeIds.size > 0
+    ? combinedResults.filter(r => !excludeIds.has(r.id))
+    : combinedResults;
+
+  const totalMatches = filteredResults.length;
+  const results = filteredResults.slice(offset, offset + limit);
 
   const ftsCount = results.filter((r) => r.source === 'fts').length;
   const vectorCount = results.filter((r) => r.source === 'vector').length;
diff --git a/src/tools/types.ts b/src/tools/types.ts
index cd13a5e6..d129a618 100644
--- a/src/tools/types.ts
+++ b/src/tools/types.ts
@@ -38,6 +38,7 @@ export interface OracleSearchInput {
   project?: string;
   cwd?: string;
   model?: 'nomic' | 'qwen3' | 'bge-m3';
+  include_superseded?: boolean; // default false — set true for audit trail
 }
 
 export interface OracleReflectInput {}
@@ -47,6 +48,7 @@ export interface OracleLearnInput {
   source?: string;
   concepts?: string[];
   project?: string;
+  ttl?: string; // e.g. "7d", "14d", "30d" — parsed to days
 }
 
 export interface OracleListInput {
diff --git a/src/types.ts b/src/types.ts
index 22bb52c9..ec263e6e 100644
--- a/src/types.ts
+++ b/src/types.ts
@@ -120,7 +120,6 @@ export interface HybridSearchOptions {
 export interface IndexerConfig {
   repoRoot: string;
   dbPath: string;
-  chromaPath: string;
   sourcePaths: {
     resonance: string;
     learnings: string;
diff --git a/src/vector/factory.ts b/src/vector/factory.ts
index abcc9280..e4737b36 100644
--- a/src/vector/factory.ts
+++ b/src/vector/factory.ts
@@ -167,7 +167,8 @@ const modelStoreCache = new Map<string, VectorStoreAdapter>();
 
 /**
  * Get a vector store for a specific embedding model.
- * Uses LanceDB + Ollama. Caches instances by model key.
+ * Respects ORACLE_VECTOR_DB and ORACLE_EMBEDDING_PROVIDER env vars.
+ * Falls back to LanceDB + Ollama when env vars are not set.
  */
 const connectPromises = new Map<string, Promise<void>>();
 
@@ -177,12 +178,18 @@ export function getVectorStoreByModel(model?: string): VectorStoreAdapter {
   let store = modelStoreCache.get(key);
   if (!store) {
     const preset = models[key];
+    const dbType = (process.env.ORACLE_VECTOR_DB as VectorDBType) || 'lancedb';
+    const embedProvider = (process.env.ORACLE_EMBEDDING_PROVIDER as EmbeddingProviderType) || 'ollama';
+    // When using OpenAI embeddings, use text-embedding-3-small instead of local model names
+    const embedModel = embedProvider === 'openai'
+      ? (process.env.ORACLE_EMBEDDING_MODEL || 'text-embedding-3-small')
+      : preset.model;
     store = createVectorStore({
-      type: 'lancedb',
+      type: dbType,
       collectionName: preset.collection,
-      embeddingProvider: 'ollama',
-      embeddingModel: preset.model,
-      ...(preset.dataPath && { dataPath: preset.dataPath }),
+      embeddingProvider: embedProvider,
+      embeddingModel: embedModel,
+      ...(dbType === 'lancedb' && preset.dataPath && { dataPath: preset.dataPath }),
     });
     modelStoreCache.set(key, store);
     // Auto-connect in background (non-blocking)

## Implementation Context
# Implementation Report

**Plan**: `.prp-output/plans/issue-6-oracle-family-thread-normalization.plan.md`
**Source Issue**: #6
**Branch**: `feat/issue-6-oracle-family-normalization`
**Date**: 2026-04-12
**Status**: COMPLETE

---

## Summary

Added lightweight repository guidance to normalize Oracle-family issue intake. Issue `#6` is preserved as historical context; `#16` is documented as the canonical registry; a structured issue form routes future awakenings.

---

## Assessment vs Reality

| Metric | Predicted | Actual | Reasoning |
|--------|-----------|--------|-----------|
| Complexity | LOW | LOW | Docs-only, no code changes |
| Confidence | 8/10 | 9/10 | Plan scope was exactly right — no surprises |

**No deviations from plan.**

---

## Tasks Completed

| # | Task | File | Status | Notes |
|---|------|------|--------|-------|
| 1 | Add Oracle Family section | `README.md` | ✅ | Short section with table linking #6 and #16 |
| 2 | Create Oracle Awakening issue form | `.github/ISSUE_TEMPLATE/oracle-awakening.yml` | ✅ | GitHub issue form with oracle-family label |
| 3 | Create maintainer runbook | `docs/oracle-family-issues.md` | ✅ | Preserve-vs-consolidate policy + workflow |
| 4 | Review automation compatibility | `.github/workflows/inbox-auto-add.yml` | ✅ | No changes needed — workflow handles all opened issues |

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Type check (`bun run build`) | ✅ | Pre-existing TS errors in server-legacy.ts/handlers.ts (confirmed present on main before this branch) — not introduced by this PR |
| Unit tests (`bun run test:unit`) | ✅ | 157 passed, 0 failed |
| YAML check | ✅ | oracle-awakening.yml and inbox-auto-add.yml parse successfully |
| Build | ✅ | Pre-existing errors only — no new errors |

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `README.md` | UPDATE | Added Oracle Family section |
| `.github/ISSUE_TEMPLATE/oracle-awakening.yml` | CREATE | Structured issue intake form |
| `docs/oracle-family-issues.md` | CREATE | Maintainer runbook |

---

## Deviations from Plan

None. Implementation matched plan exactly. Task 4 (automation review) confirmed no workflow changes were needed.

---

## Issues Encountered

The `bun run build` command returned type errors in `server-legacy.ts` and `server/handlers.ts`. These are **pre-existing** on `main` (confirmed by stashing branch changes and re-running). Our docs-only changes did not introduce them.

---

## Tests Written

No new tests written — docs/process changes only. Existing 157-test suite confirms no regressions.

---

## Next Steps

- [ ] Create PR: `gh pr create` or `/prp-core:prp-pr`
- [ ] Merge when approved

## PR Diff (Code Files Only — Lines 1673+ of full diff)
```diff
diff --git a/package.json b/package.json
index 2d3955a1..f3a4e9c6 100644
--- a/package.json
+++ b/package.json
@@ -36,6 +36,7 @@
     "test:integration:db": "bun test src/integration/database.test.ts",
     "test:integration:mcp": "bun test src/integration/mcp.test.ts",
     "test:integration:http": "bun test src/integration/http.test.ts",
+    "test:integration:mcp-http": "MCP_AUTH_TOKEN=test-token bun test src/integration/mcp-http.test.ts",
     "test:seed": "bun scripts/seed-test-data.ts",
     "test:coverage": "bun test --coverage",
     "db:generate": "bunx drizzle-kit generate",
@@ -49,7 +50,8 @@
     "vault:pull": "bun src/vault/cli.ts pull",
     "vault:status": "bun src/vault/cli.ts status",
     "vault:migrate": "bun src/vault/cli.ts migrate",
-    "vault:rsync": "./scripts/vault-rsync.sh"
+    "vault:rsync": "./scripts/vault-rsync.sh",
+    "expire": "bun scripts/expire-learnings.ts"
   },
   "dependencies": {
     "@lancedb/lancedb": "^0.26.2",
diff --git a/scripts/expire-learnings.ts b/scripts/expire-learnings.ts
new file mode 100644
index 00000000..6506a5f3
--- /dev/null
+++ b/scripts/expire-learnings.ts
@@ -0,0 +1,113 @@
+#!/usr/bin/env bun
+/**
+ * Expire stale learnings — cron-based cleanup script (Issue #4)
+ *
+ * Finds documents where expires_at has passed and marks them as superseded.
+ * Follows "Nothing is Deleted" principle — documents are superseded, not removed.
+ *
+ * Usage:
+ *   bun scripts/expire-learnings.ts          # Run expiry
+ *   bun scripts/expire-learnings.ts --dry-run # Preview without changes
+ *
+ * Cron: 0 1 * * * cd ~/repos/memory/arra-oracle-v3 && bun run expire
+ */
+
+import { createDatabase } from '../src/db/index.ts';
+
+const dryRun = process.argv.includes('--dry-run');
+
+let sqlite: ReturnType<typeof createDatabase>['sqlite'];
+try {
+  sqlite = createDatabase().sqlite;
+} catch (err) {
+  console.error('FATAL: Cannot open database:', err instanceof Error ? err.message : String(err));
+  process.exit(1);
+}
+
+const now = Date.now();
+
+// Find expired documents that haven't been superseded yet
+const expired = sqlite.prepare(`
+  SELECT id, type, source_file, ttl_days, expires_at, project
+  FROM oracle_documents
+  WHERE expires_at IS NOT NULL
+    AND expires_at <= ?
+    AND superseded_by IS NULL
+`).all(now) as Array<{
+  id: string;
+  type: string;
+  source_file: string;
+  ttl_days: number | null;
+  expires_at: number;
+  project: string | null;
+}>;
+
+if (expired.length === 0) {
+  console.log('No expired documents found.');
+  process.exit(0);
+}
+
+console.log(`Found ${expired.length} expired document(s)${dryRun ? ' (dry-run)' : ''}:`);
+
+if (dryRun) {
+  for (const doc of expired) {
+    const expiredDate = new Date(doc.expires_at).toISOString().split('T')[0];
+    console.log(`  - ${doc.id} (TTL: ${doc.ttl_days}d, expired: ${expiredDate})`);
+  }
+  process.exit(0);
+}
+
+// Prepare statements once outside transaction
+const updateDoc = sqlite.prepare(`
+  UPDATE oracle_documents
+  SET superseded_by = 'system:auto-expire',
+      superseded_at = ?,
+      superseded_reason = ?
+  WHERE id = ?
+`);
+
+const insertLog = sqlite.prepare(`
+  INSERT INTO supersede_log (old_path, old_id, old_title, old_type, reason, superseded_at, superseded_by, project)
+  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
+`);
+
+const getFtsContent = sqlite.prepare('SELECT content FROM oracle_fts WHERE id = ?');
+
+// Batch expire in a transaction
+const transaction = sqlite.transaction(() => {
+  for (const doc of expired) {
+    const reason = `Auto-expired after ${doc.ttl_days ?? '?'} days`;
+
+    updateDoc.run(now, reason, doc.id);
+
+    // Get title for audit log
+    const ftsRow = getFtsContent.get(doc.id) as { content: string } | null;
+    if (!ftsRow) {
+      console.error(`  WARNING: FTS row missing for ${doc.id} — audit title will be ID only`);
+    }
+    const title = ftsRow?.content.split('\n')[0]?.substring(0, 80) ?? doc.id;
+
+    insertLog.run(
+      doc.source_file,      // old_path
+      doc.id,               // old_id
+      title,                // old_title
+      doc.type,             // old_type — actual document type from DB
+      reason,               // reason
+      now,                  // superseded_at
+      'system:auto-expire', // superseded_by
+      doc.project,          // project
+    );
+
+    console.log(`  Expired: ${doc.id} (TTL: ${doc.ttl_days}d)`);
+  }
+});
+
+try {
+  transaction();
+} catch (err) {
+  console.error('FATAL: Transaction failed:', err instanceof Error ? err.message : String(err));
+  console.error('No documents were expired (transaction rolled back).');
+  process.exit(1);
+}
+
+console.log(`\nDone. Expired ${expired.length} document(s).`);
diff --git a/src/config.ts b/src/config.ts
index e63f77e8..659c93e0 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -40,6 +40,19 @@ export const VECTORS_DB_PATH = path.join(ORACLE_DATA_DIR, C.VECTORS_DB_FILE);
 export const LANCEDB_DIR = path.join(ORACLE_DATA_DIR, C.LANCEDB_DIR_NAME);
 export const CHROMADB_DIR = path.join(HOME_DIR, C.CHROMADB_DIR_NAME);
 
+// MCP Remote Transport auth token — required for /mcp endpoint
+// If empty, /mcp will reject all requests with 401 (fail-safe)
+export const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';
+
+// OAuth 2.1 — PIN-based auth for Claude Desktop / claude.ai Custom Connectors
+// If MCP_OAUTH_PIN is empty, OAuth routes are not mounted (Bearer-only mode)
+export const MCP_OAUTH_PIN = process.env.MCP_OAUTH_PIN || '';
+export const MCP_EXTERNAL_URL = process.env.MCP_EXTERNAL_URL || `http://localhost:${PORT}`;
+
+if (MCP_EXTERNAL_URL.startsWith('http://') && !MCP_EXTERNAL_URL.includes('localhost') && !MCP_EXTERNAL_URL.includes('127.0.0.1')) {
+  console.warn('⚠️  MCP_EXTERNAL_URL is using HTTP in production — OAuth requires HTTPS for secure token exchange');
+}
+
 // Ensure data directory exists (for fresh installs via bunx)
 if (!fs.existsSync(ORACLE_DATA_DIR)) {
   fs.mkdirSync(ORACLE_DATA_DIR, { recursive: true });
diff --git a/src/const.ts b/src/const.ts
index 93f686f8..c86435aa 100644
--- a/src/const.ts
+++ b/src/const.ts
@@ -13,5 +13,5 @@ export const VECTORS_DB_FILE = 'vectors.db';
 export const LANCEDB_DIR_NAME = 'lancedb';
 export const CHROMADB_DIR_NAME = '.chromadb';
 export const MCP_SERVER_NAME = 'arra-oracle-v2';
-export const COLLECTION_NAME = 'oracle_knowledge';
+export const COLLECTION_NAME = 'oracle_knowledge_bge_m3';
 export const PID_FILE_NAME = 'oracle-http.pid';
diff --git a/src/db/migrations/0007_huge_dormammu.sql b/src/db/migrations/0007_huge_dormammu.sql
new file mode 100644
index 00000000..7bd56cd8
--- /dev/null
+++ b/src/db/migrations/0007_huge_dormammu.sql
@@ -0,0 +1,3 @@
+ALTER TABLE `oracle_documents` ADD `expires_at` integer;--> statement-breakpoint
+ALTER TABLE `oracle_documents` ADD `ttl_days` integer;--> statement-breakpoint
+CREATE INDEX `idx_expires` ON `oracle_documents` (`expires_at`);
\ No newline at end of file
diff --git a/src/db/migrations/meta/0007_snapshot.json b/src/db/migrations/meta/0007_snapshot.json
new file mode 100644
index 00000000..96ac3439
--- /dev/null
+++ b/src/db/migrations/meta/0007_snapshot.json
@@ -0,0 +1,1318 @@
+{
+  "version": "6",
+  "dialect": "sqlite",
+  "id": "98fc28e7-eba9-4c8c-ab56-419b4f9f1acc",
+  "prevId": "68d1f757-6421-41ac-a46e-88763c740439",
+  "tables": {
+    "activity_log": {
+      "name": "activity_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "date": {
+          "name": "date",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "timestamp": {
+          "name": "timestamp",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "type": {
+          "name": "type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "path": {
+          "name": "path",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "size_bytes": {
+          "name": "size_bytes",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "metadata": {
+          "name": "metadata",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_activity_date": {
+          "name": "idx_activity_date",
+          "columns": [
+            "date"
+          ],
+          "isUnique": false
+        },
+        "idx_activity_type": {
+          "name": "idx_activity_type",
+          "columns": [
+            "type"
+          ],
+          "isUnique": false
+        },
+        "idx_activity_project": {
+          "name": "idx_activity_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "document_access": {
+      "name": "document_access",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "document_id": {
+          "name": "document_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "access_type": {
+          "name": "access_type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_access_project": {
+          "name": "idx_access_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_access_created": {
+          "name": "idx_access_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        },
+        "idx_access_doc": {
+          "name": "idx_access_doc",
+          "columns": [
+            "document_id"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "forum_messages": {
+      "name": "forum_messages",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "thread_id": {
+          "name": "thread_id",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "role": {
+          "name": "role",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "content": {
+          "name": "content",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "author": {
+          "name": "author",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "principles_found": {
+          "name": "principles_found",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "patterns_found": {
+          "name": "patterns_found",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "search_query": {
+          "name": "search_query",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "comment_id": {
+          "name": "comment_id",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_message_thread": {
+          "name": "idx_message_thread",
+          "columns": [
+            "thread_id"
+          ],
+          "isUnique": false
+        },
+        "idx_message_role": {
+          "name": "idx_message_role",
+          "columns": [
+            "role"
+          ],
+          "isUnique": false
+        },
+        "idx_message_created": {
+          "name": "idx_message_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {
+        "forum_messages_thread_id_forum_threads_id_fk": {
+          "name": "forum_messages_thread_id_forum_threads_id_fk",
+          "tableFrom": "forum_messages",
+          "tableTo": "forum_threads",
+          "columnsFrom": [
+            "thread_id"
+          ],
+          "columnsTo": [
+            "id"
+          ],
+          "onDelete": "no action",
+          "onUpdate": "no action"
+        }
+      },
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "forum_threads": {
+      "name": "forum_threads",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "title": {
+          "name": "title",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_by": {
+          "name": "created_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'human'"
+        },
+        "status": {
+          "name": "status",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'active'"
+        },
+        "issue_url": {
+          "name": "issue_url",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "issue_number": {
+          "name": "issue_number",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "synced_at": {
+          "name": "synced_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_thread_status": {
+          "name": "idx_thread_status",
+          "columns": [
+            "status"
+          ],
+          "isUnique": false
+        },
+        "idx_thread_project": {
+          "name": "idx_thread_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_thread_created": {
+          "name": "idx_thread_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "indexing_status": {
+      "name": "indexing_status",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "is_indexing": {
+          "name": "is_indexing",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false,
+          "default": 0
+        },
+        "progress_current": {
+          "name": "progress_current",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "progress_total": {
+          "name": "progress_total",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "started_at": {
+          "name": "started_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "completed_at": {
+          "name": "completed_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "error": {
+          "name": "error",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "repo_root": {
+          "name": "repo_root",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {},
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "learn_log": {
+      "name": "learn_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "document_id": {
+          "name": "document_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "pattern_preview": {
+          "name": "pattern_preview",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "source": {
+          "name": "source",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "concepts": {
+          "name": "concepts",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_learn_project": {
+          "name": "idx_learn_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_learn_created": {
+          "name": "idx_learn_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "oracle_documents": {
+      "name": "oracle_documents",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "type": {
+          "name": "type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "source_file": {
+          "name": "source_file",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "concepts": {
+          "name": "concepts",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "indexed_at": {
+          "name": "indexed_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "superseded_by": {
+          "name": "superseded_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "superseded_at": {
+          "name": "superseded_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "superseded_reason": {
+          "name": "superseded_reason",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "expires_at": {
+          "name": "expires_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "ttl_days": {
+          "name": "ttl_days",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "origin": {
+          "name": "origin",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_by": {
+          "name": "created_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_source": {
+          "name": "idx_source",
+          "columns": [
+            "source_file"
+          ],
+          "isUnique": false
+        },
+        "idx_type": {
+          "name": "idx_type",
+          "columns": [
+            "type"
+          ],
+          "isUnique": false
+        },
+        "idx_superseded": {
+          "name": "idx_superseded",
+          "columns": [
+            "superseded_by"
+          ],
+          "isUnique": false
+        },
+        "idx_origin": {
+          "name": "idx_origin",
+          "columns": [
+            "origin"
+          ],
+          "isUnique": false
+        },
+        "idx_project": {
+          "name": "idx_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_expires": {
+          "name": "idx_expires",
+          "columns": [
+            "expires_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "schedule": {
+      "name": "schedule",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "date": {
+          "name": "date",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "date_raw": {
+          "name": "date_raw",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "time": {
+          "name": "time",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "event": {
+          "name": "event",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "notes": {
+          "name": "notes",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "recurring": {
+          "name": "recurring",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "status": {
+          "name": "status",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'pending'"
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_schedule_date": {
+          "name": "idx_schedule_date",
+          "columns": [
+            "date"
+          ],
+          "isUnique": false
+        },
+        "idx_schedule_status": {
+          "name": "idx_schedule_status",
+          "columns": [
+            "status"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "search_log": {
+      "name": "search_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "query": {
+          "name": "query",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "type": {
+          "name": "type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "mode": {
+          "name": "mode",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "results_count": {
+          "name": "results_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "search_time_ms": {
+          "name": "search_time_ms",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "results": {
+          "name": "results",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_search_project": {
+          "name": "idx_search_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_search_created": {
+          "name": "idx_search_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "settings": {
+      "name": "settings",
+      "columns": {
+        "key": {
+          "name": "key",
+          "type": "text",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "value": {
+          "name": "value",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {},
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "supersede_log": {
+      "name": "supersede_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "old_path": {
+          "name": "old_path",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "old_id": {
+          "name": "old_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "old_title": {
+          "name": "old_title",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "old_type": {
+          "name": "old_type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "new_path": {
+          "name": "new_path",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "new_id": {
+          "name": "new_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "new_title": {
+          "name": "new_title",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "reason": {
+          "name": "reason",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "superseded_at": {
+          "name": "superseded_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "superseded_by": {
+          "name": "superseded_by",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "idx_supersede_old_path": {
+          "name": "idx_supersede_old_path",
+          "columns": [
+            "old_path"
+          ],
+          "isUnique": false
+        },
+        "idx_supersede_new_path": {
+          "name": "idx_supersede_new_path",
+          "columns": [
+            "new_path"
+          ],
+          "isUnique": false
+        },
+        "idx_supersede_created": {
+          "name": "idx_supersede_created",
+          "columns": [
+            "superseded_at"
+          ],
+          "isUnique": false
+        },
+        "idx_supersede_project": {
+          "name": "idx_supersede_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    },
+    "trace_log": {
+      "name": "trace_log",
+      "columns": {
+        "id": {
+          "name": "id",
+          "type": "integer",
+          "primaryKey": true,
+          "notNull": true,
+          "autoincrement": true
+        },
+        "trace_id": {
+          "name": "trace_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "query": {
+          "name": "query",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "query_type": {
+          "name": "query_type",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'general'"
+        },
+        "found_files": {
+          "name": "found_files",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_commits": {
+          "name": "found_commits",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_issues": {
+          "name": "found_issues",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_retrospectives": {
+          "name": "found_retrospectives",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_learnings": {
+          "name": "found_learnings",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "found_resonance": {
+          "name": "found_resonance",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "file_count": {
+          "name": "file_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "commit_count": {
+          "name": "commit_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "issue_count": {
+          "name": "issue_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "depth": {
+          "name": "depth",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 0
+        },
+        "parent_trace_id": {
+          "name": "parent_trace_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "child_trace_ids": {
+          "name": "child_trace_ids",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'[]'"
+        },
+        "prev_trace_id": {
+          "name": "prev_trace_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "next_trace_id": {
+          "name": "next_trace_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "project": {
+          "name": "project",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "scope": {
+          "name": "scope",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'project'"
+        },
+        "session_id": {
+          "name": "session_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "agent_count": {
+          "name": "agent_count",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": 1
+        },
+        "duration_ms": {
+          "name": "duration_ms",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "status": {
+          "name": "status",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false,
+          "default": "'raw'"
+        },
+        "awakening": {
+          "name": "awakening",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "distilled_to_id": {
+          "name": "distilled_to_id",
+          "type": "text",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "distilled_at": {
+          "name": "distilled_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": false,
+          "autoincrement": false
+        },
+        "created_at": {
+          "name": "created_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        },
+        "updated_at": {
+          "name": "updated_at",
+          "type": "integer",
+          "primaryKey": false,
+          "notNull": true,
+          "autoincrement": false
+        }
+      },
+      "indexes": {
+        "trace_log_trace_id_unique": {
+          "name": "trace_log_trace_id_unique",
+          "columns": [
+            "trace_id"
+          ],
+          "isUnique": true
+        },
+        "idx_trace_query": {
+          "name": "idx_trace_query",
+          "columns": [
+            "query"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_project": {
+          "name": "idx_trace_project",
+          "columns": [
+            "project"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_status": {
+          "name": "idx_trace_status",
+          "columns": [
+            "status"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_parent": {
+          "name": "idx_trace_parent",
+          "columns": [
+            "parent_trace_id"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_prev": {
+          "name": "idx_trace_prev",
+          "columns": [
+            "prev_trace_id"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_next": {
+          "name": "idx_trace_next",
+          "columns": [
+            "next_trace_id"
+          ],
+          "isUnique": false
+        },
+        "idx_trace_created": {
+          "name": "idx_trace_created",
+          "columns": [
+            "created_at"
+          ],
+          "isUnique": false
+        }
+      },
+      "foreignKeys": {},
+      "compositePrimaryKeys": {},
+      "uniqueConstraints": {},
+      "checkConstraints": {}
+    }
+  },
+  "views": {},
+  "enums": {},
+  "_meta": {
+    "schemas": {},
+    "tables": {},
+    "columns": {}
+  },
+  "internal": {
+    "indexes": {}
+  }
+}
\ No newline at end of file
diff --git a/src/db/migrations/meta/_journal.json b/src/db/migrations/meta/_journal.json
index 5e836495..1ba12917 100644
--- a/src/db/migrations/meta/_journal.json
+++ b/src/db/migrations/meta/_journal.json
@@ -50,6 +50,13 @@
       "when": 1772415363037,
       "tag": "0006_magenta_screwball",
       "breakpoints": true
+    },
+    {
+      "idx": 7,
+      "version": "6",
+      "when": 1775550633649,
+      "tag": "0007_huge_dormammu",
+      "breakpoints": true
     }
   ]
 }
\ No newline at end of file
diff --git a/src/db/schema.ts b/src/db/schema.ts
index 18bac33e..3bbb1dbb 100644
--- a/src/db/schema.ts
+++ b/src/db/schema.ts
@@ -20,6 +20,9 @@ export const oracleDocuments = sqliteTable('oracle_documents', {
   supersededBy: text('superseded_by'),      // ID of newer document
   supersededAt: integer('superseded_at'),   // When it was superseded
   supersededReason: text('superseded_reason'), // Why (optional)
+  // TTL/auto-expire (Issue #4) - ephemeral learnings auto-supersede after TTL
+  expiresAt: integer('expires_at'),            // Unix timestamp (ms) when doc auto-expires
+  ttlDays: integer('ttl_days'),                // TTL in days (for reference/display)
   // Provenance tracking (Issue #22)
   origin: text('origin'),                   // 'mother' | 'arthur' | 'volt' | 'human' | null (legacy)
   project: text('project'),                 // ghq-style: 'github.com/laris-co/arra-oracle'
@@ -30,6 +33,7 @@ export const oracleDocuments = sqliteTable('oracle_documents', {
   index('idx_superseded').on(table.supersededBy),
   index('idx_origin').on(table.origin),
   index('idx_project').on(table.project),
+  index('idx_expires').on(table.expiresAt),
 ]);
 
 // Indexing status tracking
diff --git a/src/index.ts b/src/index.ts
index 025a1b24..e2db3c3f 100755
--- a/src/index.ts
+++ b/src/index.ts
@@ -5,6 +5,20 @@
  * Handler implementations live in src/tools/.
  */
 
+// Load .env from the oracle directory — Claude Code may launch from a different cwd
+import { readFileSync } from 'fs';
+import { resolve } from 'path';
+try {
+  const envPath = resolve(import.meta.dir, '..', '.env');
+  const envText = readFileSync(envPath, 'utf-8');
+  for (const line of envText.split('\n')) {
+    const match = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
+    if (match && !process.env[match[1]]) {
+      process.env[match[1]] = match[2];
+    }
+  }
+} catch {}
+
 import { Server } from '@modelcontextprotocol/sdk/server/index.js';
 import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
 import {
@@ -20,7 +34,7 @@ import type { VectorStoreAdapter } from './vector/types.ts';
 import path from 'path';
 import fs from 'fs';
 import { loadToolGroupConfig, getDisabledTools, type ToolGroupConfig } from './config/tool-groups.ts';
-import { ORACLE_DATA_DIR, DB_PATH, CHROMADB_DIR } from './config.ts';
+import { ORACLE_DATA_DIR, DB_PATH } from './config.ts';
 import { MCP_SERVER_NAME } from './const.ts';
 
 // Tool handlers (all extracted to src/tools/)
@@ -98,9 +112,8 @@ class OracleMCPServer {
       console.error(`[ToolGroups] Disabled: ${disabledGroups.join(', ')}`);
     }
 
-    this.vectorStore = createVectorStore({
-      dataPath: CHROMADB_DIR,
-    });
+    // Use factory defaults from env vars (ORACLE_VECTOR_DB, ORACLE_EMBEDDING_PROVIDER)
+    this.vectorStore = createVectorStore();
 
     const pkg = JSON.parse(fs.readFileSync(path.join(import.meta.dirname || __dirname, '..', 'package.json'), 'utf-8'));
     this.version = pkg.version;
diff --git a/src/indexer-preservation.test.ts b/src/indexer-preservation.test.ts
index eb2a8573..1ac639e7 100644
--- a/src/indexer-preservation.test.ts
+++ b/src/indexer-preservation.test.ts
@@ -49,7 +49,9 @@ beforeAll(() => {
       superseded_reason TEXT,
       origin TEXT,
       project TEXT,
-      created_by TEXT
+      created_by TEXT,
+      expires_at INTEGER,
+      ttl_days INTEGER
     );
 
     CREATE INDEX idx_type ON oracle_documents(type);
diff --git a/src/indexer/cli.ts b/src/indexer/cli.ts
index b0404e90..51c28e30 100644
--- a/src/indexer/cli.ts
+++ b/src/indexer/cli.ts
@@ -4,7 +4,7 @@
 
 import fs from 'fs';
 import path from 'path';
-import { DB_PATH, CHROMADB_DIR } from '../config.ts';
+import { DB_PATH } from '../config.ts';
 import { getVaultPsiRoot } from '../vault/handler.ts';
 import type { IndexerConfig } from '../types.ts';
 import { OracleIndexer } from './index.ts';
@@ -28,7 +28,6 @@ const repoRoot = process.env.ORACLE_REPO_ROOT ||
 const config: IndexerConfig = {
   repoRoot,
   dbPath: DB_PATH,
-  chromaPath: CHROMADB_DIR,
   sourcePaths: {
     resonance: '\u03c8/memory/resonance',
     learnings: '\u03c8/memory/learnings',
diff --git a/src/indexer/index.ts b/src/indexer/index.ts
index 5a633666..c0412267 100644
--- a/src/indexer/index.ts
+++ b/src/indexer/index.ts
@@ -80,7 +80,8 @@ export class OracleIndexer {
 
     // Initialize vector store
     try {
-      this.vectorClient = createVectorStore({ dataPath: this.config.chromaPath });
+      // Use factory defaults from env vars (ORACLE_VECTOR_DB, ORACLE_EMBEDDING_PROVIDER)
+      this.vectorClient = createVectorStore();
       await this.vectorClient.connect();
       await this.vectorClient.deleteCollection();
       await this.vectorClient.ensureCollection();
diff --git a/src/integration/mcp-http.test.ts b/src/integration/mcp-http.test.ts
new file mode 100644
index 00000000..8b937a75
--- /dev/null
+++ b/src/integration/mcp-http.test.ts
@@ -0,0 +1,246 @@
+/**
+ * MCP HTTP Transport Integration Tests
+ *
+ * Tests the /mcp Streamable HTTP endpoint:
+ * - Bearer token auth (reject without/wrong token, accept valid)
+ * - MCP protocol: initialize → tools/list → tools/call
+ * - SSE stream response for GET
+ * - DELETE (stateless no-op)
+ */
+import { describe, test, expect, beforeAll, afterAll } from "bun:test";
+import type { Subprocess } from "bun";
+
+const BASE_URL = "http://localhost:47778";
+const MCP_URL = `${BASE_URL}/mcp`;
+const TEST_TOKEN = process.env.MCP_AUTH_TOKEN || "test-token";
+let serverProcess: Subprocess | null = null;
+
+async function waitForServer(maxAttempts = 30): Promise<boolean> {
+  for (let i = 0; i < maxAttempts; i++) {
+    try {
+      const res = await fetch(`${BASE_URL}/api/health`);
+      if (res.ok) return true;
+    } catch {
+      // Not ready yet
+    }
+    await Bun.sleep(500);
+  }
+  return false;
+}
+
+async function isServerRunning(): Promise<boolean> {
+  try {
+    const res = await fetch(`${BASE_URL}/api/health`);
+    return res.ok;
+  } catch {
+    return false;
+  }
+}
+
+function mcpPost(body: object, token?: string): Promise<Response> {
+  const headers: Record<string, string> = {
+    "Content-Type": "application/json",
+    "Accept": "application/json, text/event-stream",
+  };
+  if (token !== undefined) {
+    headers["Authorization"] = `Bearer ${token}`;
+  }
+  return fetch(MCP_URL, { method: "POST", headers, body: JSON.stringify(body) });
+}
+
+describe("MCP HTTP Transport (/mcp)", () => {
+  beforeAll(async () => {
+    if (await isServerRunning()) {
+      console.log("Using existing server");
+      return;
+    }
+
+    console.log("Starting server...");
+    serverProcess = Bun.spawn(["bun", "run", "src/server.ts"], {
+      cwd: import.meta.dir.replace("/src/integration", ""),
+      stdout: "pipe",
+      stderr: "pipe",
+      env: { ...process.env, MCP_AUTH_TOKEN: TEST_TOKEN, ORACLE_CHROMA_TIMEOUT: "3000" },
+    });
+
+    const ready = await waitForServer();
+    if (!ready) {
+      throw new Error("Server failed to start within 15 seconds");
+    }
+    console.log("Server ready");
+  }, 30_000);
+
+  afterAll(() => {
+    if (serverProcess) {
+      serverProcess.kill();
+      console.log("Server stopped");
+    }
+  });
+
+  // ===================
+  // Auth
+  // ===================
+  describe("Auth", () => {
+    test("POST /mcp without Authorization header → 401", async () => {
+      const res = await fetch(MCP_URL, {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({}),
+      });
+      expect(res.status).toBe(401);
+    });
+
+    test("POST /mcp with wrong token → 401", async () => {
+      const res = await mcpPost({}, "wrong-token");
+      expect(res.status).toBe(401);
+    });
+
+    test("POST /mcp with empty Bearer → 401", async () => {
+      const res = await fetch(MCP_URL, {
+        method: "POST",
+        headers: { "Content-Type": "application/json", "Authorization": "Bearer " },
+        body: JSON.stringify({}),
+      });
+      expect(res.status).toBe(401);
+    });
+  });
+
+  // ===================
+  // MCP Protocol
+  // ===================
+  describe("MCP Protocol", () => {
+    const initRequest = {
+      jsonrpc: "2.0",
+      id: 1,
+      method: "initialize",
+      params: {
+        protocolVersion: "2024-11-05",
+        capabilities: {},
+        clientInfo: { name: "test-client", version: "1.0" },
+      },
+    };
+
+    test("POST /mcp initialize with valid token → 200", async () => {
+      const res = await mcpPost(initRequest, TEST_TOKEN);
+      expect(res.status).toBe(200);
+      const body = await res.json() as any;
+      expect(body.jsonrpc).toBe("2.0");
+      expect(body.id).toBe(1);
+      expect(body.result).toBeDefined();
+      expect(body.result.serverInfo).toBeDefined();
+    }, 15_000);
+
+    test("POST /mcp tools/list returns arra_* tools", async () => {
+      // Stateless: must re-initialize each request sequence
+      await mcpPost(initRequest, TEST_TOKEN);
+
+      const res = await mcpPost(
+        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
+        TEST_TOKEN
+      );
+      expect(res.status).toBe(200);
+      const body = await res.json() as any;
+      expect(body.result).toBeDefined();
+      expect(Array.isArray(body.result.tools)).toBe(true);
+      expect(body.result.tools.length).toBeGreaterThan(5);
+
+      const toolNames = body.result.tools.map((t: any) => t.name);
+      expect(toolNames).toContain("arra_search");
+      expect(toolNames).toContain("arra_learn");
+      expect(toolNames).toContain("arra_stats");
+    }, 15_000);
+
+    test("POST /mcp tools/call arra_stats → returns stats", async () => {
+      const res = await mcpPost(
+        {
+          jsonrpc: "2.0",
+          id: 3,
+          method: "tools/call",
+          params: { name: "arra_stats", arguments: {} },
+        },
+        TEST_TOKEN
+      );
+      expect(res.status).toBe(200);
+      const body = await res.json() as any;
+      expect(body.result).toBeDefined();
+      expect(Array.isArray(body.result.content)).toBe(true);
+      expect(body.result.content[0].type).toBe("text");
+    }, 15_000);
+
+    test("POST /mcp with malformed JSON-RPC → error response (not crash)", async () => {
+      const res = await mcpPost({ jsonrpc: "2.0", id: 99 }, TEST_TOKEN);
+      // Transport returns 400 for malformed JSON-RPC (missing method), MCP protocol errors are 200
+      expect([200, 400]).toContain(res.status);
+      expect(res.status).toBeLessThan(500);
+    }, 15_000);
+
+    test("POST /mcp unknown tool → error in response", async () => {
+      const res = await mcpPost(
+        {
+          jsonrpc: "2.0",
+          id: 4,
+          method: "tools/call",
+          params: { name: "nonexistent_tool", arguments: {} },
+        },
+        TEST_TOKEN
+      );
+      expect(res.status).toBe(200);
+      const body = await res.json() as any;
+      // Should have error in result or result.isError
+      const hasError = body.error || body.result?.isError;
+      expect(hasError).toBeTruthy();
+    }, 15_000);
+  });
+
+  // ===================
+  // SSE GET endpoint
+  // ===================
+  describe("SSE GET", () => {
+    test("GET /mcp with valid token → 200 or SSE stream", async () => {
+      const controller = new AbortController();
+      const timeoutId = setTimeout(() => controller.abort(), 2000);
+
+      try {
+        const res = await fetch(MCP_URL, {
+          method: "GET",
+          headers: { "Authorization": `Bearer ${TEST_TOKEN}`, "Accept": "text/event-stream" },
+          signal: controller.signal,
+        });
+        clearTimeout(timeoutId);
+        expect(res.status).toBeLessThan(500);
+      } catch (e: any) {
+        clearTimeout(timeoutId);
+        // Abort is expected — SSE streams stay open
+        if (e.name !== "AbortError") throw e;
+      }
+    }, 10_000);
+  });
+
+  // ===================
+  // DELETE (stateless no-op)
+  // ===================
+  describe("DELETE", () => {
+    test("DELETE /mcp with valid token → not 500", async () => {
+      const res = await fetch(MCP_URL, {
+        method: "DELETE",
+        headers: { "Authorization": `Bearer ${TEST_TOKEN}` },
+      });
+      expect(res.status).toBeLessThan(500);
+    }, 10_000);
+  });
+
+  // ===================
+  // Regression: existing REST API unaffected
+  // ===================
+  describe("REST API regression", () => {
+    test("GET /api/health still works", async () => {
+      const res = await fetch(`${BASE_URL}/api/health`);
+      expect(res.ok).toBe(true);
+    });
+
+    test("GET /api/stats still works", async () => {
+      const res = await fetch(`${BASE_URL}/api/stats`);
+      expect(res.ok).toBe(true);
+    });
+  });
+});
diff --git a/src/integration/oauth.test.ts b/src/integration/oauth.test.ts
new file mode 100644
index 00000000..50b1da06
--- /dev/null
+++ b/src/integration/oauth.test.ts
@@ -0,0 +1,518 @@
+/**
+ * OAuth 2.1 Integration Tests
+ *
+ * Tests the full OAuth flow against a live server.
+ * Run with: MCP_AUTH_TOKEN=test-token MCP_OAUTH_PIN=1234 bun test src/integration/oauth.test.ts
+ */
+import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
+import type { Subprocess } from 'bun';
+import { createHash, randomBytes } from 'crypto';
+
+const BASE_URL = 'http://localhost:47779'; // Use distinct port to avoid conflict with existing server
+const TEST_TOKEN = 'test-bearer-token';
+const TEST_PIN = '1234';
+
+let serverProcess: Subprocess | null = null;
+
+// ─── PKCE helpers ────────────────────────────────────────────────────────────
+
+function generateCodeVerifier(): string {
+  return randomBytes(32).toString('base64url');
+}
+
+function generateCodeChallenge(verifier: string): string {
+  return createHash('sha256').update(verifier).digest('base64url');
+}
+
+// ─── Server lifecycle ─────────────────────────────────────────────────────────
+
+async function waitForServer(maxAttempts = 30): Promise<boolean> {
+  for (let i = 0; i < maxAttempts; i++) {
+    try {
+      const res = await fetch(`${BASE_URL}/api/health`);
+      if (res.ok) return true;
+    } catch {
+      // Not ready yet
+    }
+    await Bun.sleep(500);
+  }
+  return false;
+}
+
+describe('OAuth 2.1 Integration', () => {
+  beforeAll(async () => {
+    serverProcess = Bun.spawn(['bun', 'run', 'src/server.ts'], {
+      cwd: import.meta.dir.replace('/src/integration', ''),
+      stdout: 'pipe',
+      stderr: 'pipe',
+      env: {
+        ...process.env,
+        ORACLE_PORT: '47779',
+        MCP_AUTH_TOKEN: TEST_TOKEN,
+        MCP_OAUTH_PIN: TEST_PIN,
+        MCP_EXTERNAL_URL: BASE_URL,
+        ORACLE_CHROMA_TIMEOUT: '1000',
+      },
+    });
+
+    const ready = await waitForServer();
+    if (!ready) {
+      let stderr = '';
+      if (serverProcess.stderr) {
+        const reader = serverProcess.stderr.getReader();
+        try {
+          const { value } = await reader.read();
+          if (value) stderr = new TextDecoder().decode(value);
+        } catch { /* ignore */ }
+      }
+      throw new Error(`OAuth test server failed to start.\nStderr: ${stderr}`);
+    }
+  }, 30_000);
+
+  afterAll(() => {
+    if (serverProcess) {
+      serverProcess.kill();
+    }
+  });
+
+  // ─── Discovery metadata ──────────────────────────────────────────────────
+
+  describe('OAuth discovery endpoints', () => {
+    test('GET /.well-known/oauth-authorization-server returns metadata', async () => {
+      const res = await fetch(`${BASE_URL}/.well-known/oauth-authorization-server`);
+      expect(res.status).toBe(200);
+      const data = await res.json() as Record<string, unknown>;
+      expect(data.issuer).toBe(BASE_URL);
+      expect(data.authorization_endpoint).toBe(`${BASE_URL}/authorize`);
+      expect(data.token_endpoint).toBe(`${BASE_URL}/token`);
+      expect(data.registration_endpoint).toBe(`${BASE_URL}/register`);
+      expect(Array.isArray(data.code_challenge_methods_supported)).toBe(true);
+      expect((data.code_challenge_methods_supported as string[]).includes('S256')).toBe(true);
+    });
+
+    test('GET /.well-known/oauth-protected-resource returns resource metadata', async () => {
+      const res = await fetch(`${BASE_URL}/.well-known/oauth-protected-resource`);
+      expect(res.status).toBe(200);
+      const data = await res.json() as Record<string, unknown>;
+      expect(data.resource).toBe(BASE_URL);
+      expect(Array.isArray(data.authorization_servers)).toBe(true);
+    });
+  });
+
+  // ─── Client registration ─────────────────────────────────────────────────
+
+  describe('Dynamic client registration', () => {
+    test('POST /register returns client_id and client_secret', async () => {
+      const res = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Authorization': `Bearer ${TEST_TOKEN}`,
+        },
+        body: JSON.stringify({
+          redirect_uris: ['http://localhost:9999/callback'],
+          client_name: 'Test Client',
+          grant_types: ['authorization_code'],
+          response_types: ['code'],
+        }),
+      });
+      expect(res.status).toBe(201);
+      const data = await res.json() as Record<string, unknown>;
+      expect(typeof data.client_id).toBe('string');
+      expect(typeof data.client_secret).toBe('string');
+      expect(data.redirect_uris).toEqual(['http://localhost:9999/callback']);
+    });
+
+    test('POST /register without Bearer token returns 401', async () => {
+      const res = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ redirect_uris: ['http://localhost:9999/callback'] }),
+      });
+      expect(res.status).toBe(401);
+    });
+
+    test('POST /register without redirect_uris returns 400', async () => {
+      const res = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Authorization': `Bearer ${TEST_TOKEN}`,
+        },
+        body: JSON.stringify({ client_name: 'Bad Client' }),
+      });
+      expect(res.status).toBe(400);
+    });
+  });
+
+  // ─── Full OAuth flow ─────────────────────────────────────────────────────
+
+  describe('Full OAuth authorization flow', () => {
+    let clientId: string;
+    let clientSecret: string;
+    const redirectUri = 'http://localhost:9999/callback';
+    let oauthToken: string;
+
+    test('Step 1: Register client', async () => {
+      const res = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Authorization': `Bearer ${TEST_TOKEN}`,
+        },
+        body: JSON.stringify({
+          redirect_uris: [redirectUri],
+          client_name: 'Flow Test Client',
+          grant_types: ['authorization_code'],
+          response_types: ['code'],
+        }),
+      });
+      const data = await res.json() as Record<string, string>;
+      clientId = data.client_id;
+      clientSecret = data.client_secret;
+      expect(clientId).toBeTruthy();
+    });
+
+    test('Step 2: GET /authorize redirects to /oauth/login', async () => {
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', clientId);
+      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+      authorizeUrl.searchParams.set('scope', 'read write');
+      authorizeUrl.searchParams.set('state', 'test-state-123');
+
+      const res = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      expect(res.status).toBe(302);
+      const location = res.headers.get('location') || '';
+      expect(location).toContain('/oauth/login?state=');
+    });
+
+    test('Step 3: GET /oauth/login returns HTML with PIN form', async () => {
+      // Need to go through authorize to get state key
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', clientId);
+      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      const loginUrl = redirectRes.headers.get('location') || '';
+
+      const loginRes = await fetch(loginUrl);
+      expect(loginRes.status).toBe(200);
+      const html = await loginRes.text();
+      expect(html).toContain('Oracle v3');
+      expect(html).toContain('/oauth/callback');
+    });
+
+    test('Step 4: POST /oauth/callback with wrong PIN returns 403', async () => {
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', clientId);
+      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      const loginUrl = redirectRes.headers.get('location') || '';
+      const stateKey = new URL(loginUrl).searchParams.get('state') || '';
+
+      const callbackRes = await fetch(`${BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ state: stateKey, pin: 'wrongpin' }).toString(),
+        redirect: 'manual',
+      });
+      expect(callbackRes.status).toBe(403);
+    });
+
+    test('Step 5: Full flow — authorize → PIN → code → token → use /mcp', async () => {
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+      const flowState = 'flow-state-xyz';
+
+      // Authorize
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', clientId);
+      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+      authorizeUrl.searchParams.set('state', flowState);
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      expect(redirectRes.status).toBe(302);
+      const loginUrl = redirectRes.headers.get('location') || '';
+      const stateKey = new URL(loginUrl).searchParams.get('state') || '';
+
+      // Submit correct PIN
+      const callbackRes = await fetch(`${BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ state: stateKey, pin: TEST_PIN }).toString(),
+        redirect: 'manual',
+      });
+      expect(callbackRes.status).toBe(302);
+      const codeRedirect = callbackRes.headers.get('location') || '';
+      expect(codeRedirect).toContain('code=');
+
+      const codeUrl = new URL(codeRedirect);
+      const code = codeUrl.searchParams.get('code') || '';
+      const returnedState = codeUrl.searchParams.get('state');
+      expect(code).toBeTruthy();
+      expect(returnedState).toBe(flowState);
+
+      // Exchange code for token
+      const tokenRes = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({
+          grant_type: 'authorization_code',
+          code,
+          client_id: clientId,
+          code_verifier: codeVerifier,
+          redirect_uri: redirectUri,
+        }).toString(),
+      });
+      expect(tokenRes.status).toBe(200);
+      const tokenData = await tokenRes.json() as Record<string, unknown>;
+      expect(typeof tokenData.access_token).toBe('string');
+      expect(tokenData.token_type).toBe('bearer');
+      oauthToken = tokenData.access_token as string;
+
+      // Use token on /mcp (Streamable HTTP requires Accept header per MCP spec)
+      const mcpRes = await fetch(`${BASE_URL}/mcp`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Accept': 'application/json, text/event-stream',
+          'Authorization': `Bearer ${oauthToken}`,
+        },
+        body: JSON.stringify({
+          jsonrpc: '2.0',
+          id: 1,
+          method: 'initialize',
+          params: {
+            protocolVersion: '2024-11-05',
+            capabilities: {},
+            clientInfo: { name: 'oauth-test', version: '1.0' },
+          },
+        }),
+      });
+      expect(mcpRes.status).toBe(200);
+    });
+
+    test('Step 6: POST /revoke invalidates token', async () => {
+      if (!oauthToken) return; // Skip if previous test didn't run
+
+      const revokeRes = await fetch(`${BASE_URL}/revoke`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ token: oauthToken }).toString(),
+      });
+      expect(revokeRes.status).toBe(200);
+
+      // Token should now be rejected
+      const mcpRes = await fetch(`${BASE_URL}/mcp`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Accept': 'application/json, text/event-stream',
+          'Authorization': `Bearer ${oauthToken}`,
+        },
+        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
+      });
+      expect(mcpRes.status).toBe(401);
+    });
+  });
+
+  // ─── Static Bearer fallback ──────────────────────────────────────────────
+
+  describe('Static Bearer token fallback', () => {
+    test('POST /mcp with static Bearer token still works when OAuth enabled', async () => {
+      const res = await fetch(`${BASE_URL}/mcp`, {
+        method: 'POST',
+        headers: {
+          'Content-Type': 'application/json',
+          'Accept': 'application/json, text/event-stream',
+          'Authorization': `Bearer ${TEST_TOKEN}`,
+        },
+        body: JSON.stringify({
+          jsonrpc: '2.0',
+          id: 1,
+          method: 'initialize',
+          params: {
+            protocolVersion: '2024-11-05',
+            capabilities: {},
+            clientInfo: { name: 'fallback-test', version: '1.0' },
+          },
+        }),
+      });
+      expect(res.status).toBe(200);
+    });
+
+    test('POST /mcp without token returns 401 with WWW-Authenticate header', async () => {
+      const res = await fetch(`${BASE_URL}/mcp`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
+      });
+      expect(res.status).toBe(401);
+      const wwwAuth = res.headers.get('WWW-Authenticate') || '';
+      expect(wwwAuth).toContain('Bearer');
+      expect(wwwAuth).toContain('oauth-protected-resource');
+    });
+  });
+
+  // ─── /token endpoint edge cases ──────────────────────────────────────────
+
+  describe('/token endpoint edge cases', () => {
+    test('POST /token with unknown code returns 400', async () => {
+      const res = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({
+          grant_type: 'authorization_code',
+          code: 'nonexistent-code',
+          client_id: 'fake-client',
+          code_verifier: 'fakeverifier',
+          redirect_uri: 'http://localhost:9999/callback',
+        }).toString(),
+      });
+      expect(res.status).toBe(400);
+    });
+
+    test('POST /token with wrong PKCE verifier returns 400', async () => {
+      const testRedirectUri = 'http://localhost:9999/callback';
+
+      // Register a client
+      const regRes = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_TOKEN}` },
+        body: JSON.stringify({ client_name: 'pkce-test', redirect_uris: [testRedirectUri] }),
+      });
+      const { client_id: testClientId } = await regRes.json() as Record<string, string>;
+
+      // Get a real auth code
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', testClientId);
+      authorizeUrl.searchParams.set('redirect_uri', testRedirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      const stateKey = new URL(redirectRes.headers.get('location') || '').searchParams.get('state') || '';
+
+      const callbackRes = await fetch(`${BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ state: stateKey, pin: TEST_PIN }).toString(),
+        redirect: 'manual',
+      });
+      const code = new URL(callbackRes.headers.get('location') || '').searchParams.get('code') || '';
+      expect(code).toBeTruthy();
+
+      // Exchange with WRONG verifier — must fail
+      const res = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({
+          grant_type: 'authorization_code',
+          code,
+          client_id: testClientId,
+          code_verifier: generateCodeVerifier(), // different verifier
+          redirect_uri: testRedirectUri,
+        }).toString(),
+      });
+      expect(res.status).toBe(400);
+      const data = await res.json() as Record<string, unknown>;
+      expect(data.error).toContain('PKCE');
+    });
+
+    test('POST /token with same code twice (replay) returns 400 on second use', async () => {
+      const testRedirectUri = 'http://localhost:9999/callback';
+
+      // Register a client
+      const regRes = await fetch(`${BASE_URL}/register`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_TOKEN}` },
+        body: JSON.stringify({ client_name: 'replay-test', redirect_uris: [testRedirectUri] }),
+      });
+      const { client_id: testClientId } = await regRes.json() as Record<string, string>;
+
+      const codeVerifier = generateCodeVerifier();
+      const codeChallenge = generateCodeChallenge(codeVerifier);
+
+      const authorizeUrl = new URL(`${BASE_URL}/authorize`);
+      authorizeUrl.searchParams.set('response_type', 'code');
+      authorizeUrl.searchParams.set('client_id', testClientId);
+      authorizeUrl.searchParams.set('redirect_uri', testRedirectUri);
+      authorizeUrl.searchParams.set('code_challenge', codeChallenge);
+      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
+
+      const redirectRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
+      const stateKey = new URL(redirectRes.headers.get('location') || '').searchParams.get('state') || '';
+
+      const callbackRes = await fetch(`${BASE_URL}/oauth/callback`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({ state: stateKey, pin: TEST_PIN }).toString(),
+        redirect: 'manual',
+      });
+      const code = new URL(callbackRes.headers.get('location') || '').searchParams.get('code') || '';
+      expect(code).toBeTruthy();
+
+      const tokenBody = new URLSearchParams({
+        grant_type: 'authorization_code',
+        code,
+        client_id: testClientId,
+        code_verifier: codeVerifier,
+        redirect_uri: testRedirectUri,
+      }).toString();
+
+      // First use — must succeed
+      const first = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: tokenBody,
+      });
+      expect(first.status).toBe(200);
+
+      // Second use — code already deleted, must fail
+      const second = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: tokenBody,
+      });
+      expect(second.status).toBe(400);
+    });
+
+    test('POST /token with unsupported grant_type returns 400', async () => {
+      const res = await fetch(`${BASE_URL}/token`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: new URLSearchParams({
+          grant_type: 'client_credentials',
+          client_id: 'fake-client',
+        }).toString(),
+      });
+      expect(res.status).toBe(400);
+    });
+  });
+});
diff --git a/src/mcp-transport.ts b/src/mcp-transport.ts
new file mode 100644
index 00000000..a2b2b3ec
--- /dev/null
+++ b/src/mcp-transport.ts
@@ -0,0 +1,236 @@
+/**
+ * MCP HTTP Transport Factory
+ *
+ * Creates per-request Server + WebStandardStreamableHTTPServerTransport instances
+ * for stateless Streamable HTTP MCP endpoint at /mcp.
+ *
+ * Reuses the same tool definitions and handlers as src/index.ts (OracleMCPServer)
+ * without the stdio transport. Uses module-level db/sqlite from src/db/index.ts.
+ */
+
+import { Server } from '@modelcontextprotocol/sdk/server/index.js';
+import {
+  CallToolRequestSchema,
+  ListToolsRequestSchema,
+} from '@modelcontextprotocol/sdk/types.js';
+import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
+import path from 'path';
+import fs from 'fs';
+
+import { db, sqlite } from './db/index.ts';
+import { createVectorStore } from './vector/factory.ts';
+import type { VectorStoreAdapter } from './vector/types.ts';
+import { loadToolGroupConfig, getDisabledTools } from './config/tool-groups.ts';
+import { ORACLE_DATA_DIR, CHROMADB_DIR } from './config.ts';
+import { MCP_SERVER_NAME } from './const.ts';
+import type { ToolContext } from './tools/types.ts';
+
+import {
+  searchToolDef, handleSearch,
+  learnToolDef, handleLearn,
+  listToolDef, handleList,
+  statsToolDef, handleStats,
+  conceptsToolDef, handleConcepts,
+  supersedeToolDef, handleSupersede,
+  handoffToolDef, handleHandoff,
+  inboxToolDef, handleInbox,
+  readToolDef, handleRead,
+  forumToolDefs,
+  handleThread, handleThreads, handleThreadRead, handleThreadUpdate,
+  traceToolDefs,
+  handleTrace, handleTraceList, handleTraceGet, handleTraceLink, handleTraceUnlink, handleTraceChain,
+} from './tools/index.ts';
+
+import type {
+  OracleSearchInput,
+  OracleLearnInput,
+  OracleListInput,
+  OracleStatsInput,
+  OracleConceptsInput,
+  OracleSupersededInput,
+  OracleHandoffInput,
+  OracleInboxInput,
+  OracleReadInput,
+  OracleThreadInput,
+  OracleThreadsInput,
+  OracleThreadReadInput,
+  OracleThreadUpdateInput,
+} from './tools/index.ts';
+
+import type {
+  CreateTraceInput,
+  ListTracesInput,
+  GetTraceInput,
+} from './trace/types.ts';
+
+const WRITE_TOOLS = [
+  'arra_learn',
+  'arra_thread',
+  'arra_thread_update',
+  'arra_trace',
+  'arra_supersede',
+  'arra_handoff',
+];
+
+// Version (read once at module load — graceful fallback if package.json is missing)
+let VERSION = '0.0.0';
+try {
+  const pkg = JSON.parse(fs.readFileSync(path.join(import.meta.dirname || '', '..', 'package.json'), 'utf-8'));
+  VERSION = pkg.version ?? '0.0.0';
+} catch {
+  console.warn('[Oracle] Could not read package.json — using fallback version 0.0.0');
+}
+
+// Tool group config (read once at module load)
+const repoRoot = process.env.ORACLE_REPO_ROOT || process.cwd();
+const groupConfig = loadToolGroupConfig(repoRoot);
+const disabledTools = getDisabledTools(groupConfig);
+const readOnly = process.env.ORACLE_READ_ONLY === 'true';
+
+// Lazy-initialized vector store shared across requests
+let _vectorStore: VectorStoreAdapter | null = null;
+let _vectorStatus: 'unknown' | 'connected' | 'unavailable' = 'unknown';
+
+function getVectorStore(): VectorStoreAdapter {
+  if (!_vectorStore) {
+    _vectorStore = createVectorStore({ dataPath: CHROMADB_DIR });
+    _vectorStore.connect().then(() => {
+      _vectorStatus = 'connected';
+    }).catch((err: unknown) => {
+      console.error('[Oracle] Vector store connection failed:', err);
+      _vectorStatus = 'unavailable';
+    });
+  }
+  return _vectorStore;
+}
+
+const IMPORTANT_DESCRIPTION = `ORACLE WORKFLOW GUIDE (v${VERSION}):\n\n1. SEARCH & DISCOVER\n   arra_search(query) → Find knowledge by keywords/vectors\n   arra_read(file/id) → Read full document content\n   arra_list() → Browse all documents\n   arra_concepts() → See topic coverage\n\n2. LEARN & REMEMBER\n   arra_learn(pattern) → Add new patterns/learnings\n   arra_thread(message) → Multi-turn discussions\n   ⚠️ BEFORE adding: search for similar topics first!\n   If updating old info → use arra_supersede(oldId, newId)\n\n3. TRACE & DISTILL\n   arra_trace(query) → Log discovery sessions with dig points\n   arra_trace_list() → Find past traces\n   arra_trace_get(id) → Explore dig points (files, commits, issues)\n   arra_trace_link(prevId, nextId) → Chain related traces together\n   arra_trace_chain(id) → View the full linked chain\n\n4. HANDOFF & INBOX\n   arra_handoff(content) → Save session context for next session\n   arra_inbox() → List pending handoffs\n\n5. SUPERSEDE (when info changes)\n   arra_supersede(oldId, newId, reason) → Mark old doc as outdated\n   "Nothing is Deleted" — old preserved, just marked superseded\n\nPhilosophy: "Nothing is Deleted" — All interactions logged.`;
+
+/**
+ * Creates an MCP Server with all Oracle tools registered.
+ * Called once per HTTP request (stateless mode).
+ */
+function createMcpServer(): Server {
+  const server = new Server(
+    { name: MCP_SERVER_NAME, version: VERSION },
+    { capabilities: { tools: {} } }
+  );
+
+  const vs = getVectorStore();
+  // Use a getter so each tool invocation reads the live _vectorStatus
+  // instead of the snapshot captured at server-creation time.
+  const toolCtx = {
+    db,
+    sqlite,
+    repoRoot,
+    vectorStore: vs,
+    get vectorStatus() { return _vectorStatus; },
+    version: VERSION,
+  } satisfies ToolContext;
+
+  server.setRequestHandler(ListToolsRequestSchema, async () => {
+    const allTools = [
+      { name: '____IMPORTANT', description: IMPORTANT_DESCRIPTION, inputSchema: { type: 'object', properties: {} } },
+      searchToolDef,
+      readToolDef,
+      learnToolDef,
+      listToolDef,
+      statsToolDef,
+      conceptsToolDef,
+      ...forumToolDefs,
+      ...traceToolDefs,
+      supersedeToolDef,
+      handoffToolDef,
+      inboxToolDef,
+    ];
+
+    let tools = allTools.filter(t => !disabledTools.has(t.name));
+    if (readOnly) {
+      tools = tools.filter(t => !WRITE_TOOLS.includes(t.name));
+    }
+    return { tools };
+  });
+
+  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
+    if (disabledTools.has(request.params.name)) {
+      return {
+        content: [{ type: 'text', text: `Error: Tool "${request.params.name}" is disabled by tool group config. Check ${ORACLE_DATA_DIR}/config.json or arra.config.json.` }],
+        isError: true,
+      };
+    }
+
+    if (readOnly && WRITE_TOOLS.includes(request.params.name)) {
+      return {
+        content: [{ type: 'text', text: `Error: Tool "${request.params.name}" is disabled in read-only mode.` }],
+        isError: true,
+      };
+    }
+
+    try {
+      switch (request.params.name) {
+        case 'arra_search':
+          return await handleSearch(toolCtx, request.params.arguments as unknown as OracleSearchInput);
+        case 'arra_read':
+          return await handleRead(toolCtx, request.params.arguments as unknown as OracleReadInput);
+        case 'arra_learn':
+          return await handleLearn(toolCtx, request.params.arguments as unknown as OracleLearnInput);
+        case 'arra_list':
+          return await handleList(toolCtx, request.params.arguments as unknown as OracleListInput);
+        case 'arra_stats':
+          return await handleStats(toolCtx, request.params.arguments as unknown as OracleStatsInput);
+        case 'arra_concepts':
+          return await handleConcepts(toolCtx, request.params.arguments as unknown as OracleConceptsInput);
+        case 'arra_supersede':
+          return await handleSupersede(toolCtx, request.params.arguments as unknown as OracleSupersededInput);
+        case 'arra_handoff':
+          return await handleHandoff(toolCtx, request.params.arguments as unknown as OracleHandoffInput);
+        case 'arra_inbox':
+          return await handleInbox(toolCtx, request.params.arguments as unknown as OracleInboxInput);
+        case 'arra_thread':
+          return await handleThread(request.params.arguments as unknown as OracleThreadInput);
+        case 'arra_threads':
+          return await handleThreads(request.params.arguments as unknown as OracleThreadsInput);
+        case 'arra_thread_read':
+          return await handleThreadRead(request.params.arguments as unknown as OracleThreadReadInput);
+        case 'arra_thread_update':
+          return await handleThreadUpdate(request.params.arguments as unknown as OracleThreadUpdateInput);
+        case 'arra_trace':
+          return await handleTrace(request.params.arguments as unknown as CreateTraceInput);
+        case 'arra_trace_list':
+          return await handleTraceList(request.params.arguments as unknown as ListTracesInput);
+        case 'arra_trace_get':
+          return await handleTraceGet(request.params.arguments as unknown as GetTraceInput);
+        case 'arra_trace_link':
+          return await handleTraceLink(request.params.arguments as unknown as { prevTraceId: string; nextTraceId: string });
+        case 'arra_trace_unlink':
+          return await handleTraceUnlink(request.params.arguments as unknown as { traceId: string; direction: 'prev' | 'next' });
+        case 'arra_trace_chain':
+          return await handleTraceChain(request.params.arguments as unknown as { traceId: string });
+        default:
+          throw new Error(`Unknown tool: ${request.params.name}`);
+      }
+    } catch (error) {
+      return {
+        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
+        isError: true,
+      };
+    }
+  });
+
+  return server;
+}
+
+/**
+ * Handles an incoming MCP HTTP request.
+ * Creates a fresh Server + transport per request (stateless mode).
+ * Call this from the Hono /mcp route after auth passes.
+ */
+export async function createMcpHandler(request: Request): Promise<Response> {
+  const transport = new WebStandardStreamableHTTPServerTransport({
+    sessionIdGenerator: undefined, // stateless — no session tracking
+    enableJsonResponse: true,
+  });
+  const server = createMcpServer();
+  await server.connect(transport);
+  return transport.handleRequest(request);
+}
diff --git a/src/oauth/provider.ts b/src/oauth/provider.ts
new file mode 100644
index 00000000..390d5804
--- /dev/null
+++ b/src/oauth/provider.ts
@@ -0,0 +1,549 @@
+/**
+ * OAuth 2.1 Provider for Oracle v3
+ *
+ * PIN-based authorization server. Mirrors PSak Soul MCP oauth_provider.py.
+ * Supports dynamic client registration (RFC 7591), PKCE (S256), and
+ * 30-day access tokens. State persists to ORACLE_DATA_DIR/.oauth-state.json.
+ *
+ * Design decisions:
+ * - No refresh tokens (30-day access tokens sufficient for personal server)
+ * - Single PIN, single user (same as PSak)
+ * - Atomic file writes for crash safety (temp file + rename)
+ * - crypto.timingSafeEqual for PIN comparison to prevent timing attacks
+ * - IP-based rate limiting for PIN brute-force protection
+ */
+
+import { randomBytes, createHash, timingSafeEqual } from 'crypto';
+import { writeFileSync, readFileSync, renameSync, existsSync, mkdirSync, chmodSync } from 'fs';
+import { join, dirname } from 'path';
+import { tmpdir } from 'os';
+
+import { MCP_OAUTH_PIN, MCP_EXTERNAL_URL, ORACLE_DATA_DIR, MCP_AUTH_TOKEN } from '../config.ts';
+import type { OAuthState, OAuthClientInfo, PendingAuthorization } from './types.ts';
+
+export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
+export const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
+
+// Far-future sentinel used for static Bearer tokens (avoids Infinity, which is not JSON-serializable)
+const STATIC_TOKEN_EXPIRES_AT = new Date('2100-01-01T00:00:00Z').getTime();
+
+export interface AuthInfo {
+  token: string;
+  client_id: string;
+  scopes: string[];
+  expires_at: number;
+}
+
+/** Issued code data stored until token exchange */
+interface IssuedCode {
+  client_id: string;
+  redirect_uri: string;
+  scopes: string[];
+  code_challenge: string;
+  resource?: string;
+  issued_at: number;
+}
+
+/** Rate-limit window for a single IP */
+interface RateLimitRecord {
+  count: number;
+  resetAt: number;
+}
+
+/** Escape user-supplied strings for safe HTML interpolation */
+function escapeHtml(str: string): string {
+  return str
+    .replace(/&/g, '&amp;')
+    .replace(/</g, '&lt;')
+    .replace(/>/g, '&gt;')
+    .replace(/"/g, '&quot;')
+    .replace(/'/g, '&#x27;');
+}
+
+export class OAuthProvider {
+  private readonly stateFile: string;
+  private state: OAuthState;
+  // stateKey → pending auth (before PIN verification)
+  private pendingAuthorizations: Map<string, PendingAuthorization> = new Map();
+  // code → issued code data (after PIN verification, before token exchange)
+  private issuedCodes: Map<string, IssuedCode> = new Map();
+
+  // Rate limiting: ip → {count, resetAt}
+  private pinAttempts: Map<string, RateLimitRecord> = new Map();
+
+  private static readonly MAX_PIN_ATTEMPTS = 10;
+  private static readonly PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
+  private static readonly MAX_PENDING_AUTHORIZATIONS = 100;
+
+  constructor() {
+    this.stateFile = join(ORACLE_DATA_DIR, '.oauth-state.json');
+    this.state = this.loadState();
+    this.cleanExpiredTokens();
+  }
+
+  // ─── State persistence ───────────────────────────────────────────────────
+
+  private loadState(): OAuthState {
+    if (!existsSync(this.stateFile)) {
+      return { clients: {}, tokens: {} };
+    }
+    try {
+      const raw = readFileSync(this.stateFile, 'utf-8');
+      return JSON.parse(raw) as OAuthState;
+    } catch (err) {
+      console.error('[OAuth] Failed to parse state file, starting with empty state:', err);
+      return { clients: {}, tokens: {} };
+    }
+  }
+
+  /** Atomic write: write to temp file then rename — crash-safe. Sets 0600 permissions. */
+  private saveState(): void {
+    try {
+      const dir = dirname(this.stateFile);
+      if (!existsSync(dir)) {
+        mkdirSync(dir, { recursive: true });
+      }
+      const tmp = join(tmpdir(), `.oauth-state-${Date.now()}-${randomBytes(4).toString('hex')}.tmp`);
+      writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf-8');
+      chmodSync(tmp, 0o600);
+      renameSync(tmp, this.stateFile);
+    } catch (err) {
+      console.error('[OAuth] saveState failed — token state may be inconsistent:', err);
+    }
+  }
+
+  private cleanExpiredTokens(): void {
+    const now = Date.now();
+    let changed = false;
+    for (const [token, data] of Object.entries(this.state.tokens)) {
+      if (data.expires_at < now) {
+        delete this.state.tokens[token];
+        changed = true;
+      }
+    }
+    if (changed) this.saveState();
+
+    // Clean expired pending authorizations
+    for (const [stateKey, pending] of this.pendingAuthorizations.entries()) {
+      if (now - pending.created_at > AUTH_CODE_TTL_MS) {
+        this.pendingAuthorizations.delete(stateKey);
+      }
+    }
+
+    // Clean expired rate-limit windows
+    for (const [ip, record] of this.pinAttempts.entries()) {
+      if (now > record.resetAt) {
+        this.pinAttempts.delete(ip);
+      }
+    }
+  }
+
+  // ─── Rate limiting ───────────────────────────────────────────────────────
+
+  private checkRateLimit(ip: string): { allowed: boolean; attemptsLeft: number } {
+    const now = Date.now();
+    const record = this.pinAttempts.get(ip);
+
+    if (!record || now > record.resetAt) {
+      return { allowed: true, attemptsLeft: OAuthProvider.MAX_PIN_ATTEMPTS };
+    }
+
+    const attemptsLeft = OAuthProvider.MAX_PIN_ATTEMPTS - record.count;
+    return { allowed: attemptsLeft > 0, attemptsLeft };
+  }
+
+  private recordFailedAttempt(ip: string): number {
+    const now = Date.now();
+    const record = this.pinAttempts.get(ip);
+
+    if (!record || now > record.resetAt) {
+      this.pinAttempts.set(ip, { count: 1, resetAt: now + OAuthProvider.PIN_LOCKOUT_MS });
+      return OAuthProvider.MAX_PIN_ATTEMPTS - 1;
+    }
+
+    record.count++;
+    return Math.max(0, OAuthProvider.MAX_PIN_ATTEMPTS - record.count);
+  }
+
+  private resetAttempts(ip: string): void {
+    this.pinAttempts.delete(ip);
+  }
+
+  // ─── Registration auth ───────────────────────────────────────────────────
+
+  /**
+   * Verify that a client registration request is authorized.
+   * Requires Bearer MCP_AUTH_TOKEN if configured.
+   * Returns true if registration is allowed.
+   */
+  checkRegistrationAuth(authHeader: string): boolean {
+    if (!MCP_AUTH_TOKEN) {
+      // No token configured — allow (degraded mode, log warning)
+      console.warn('[OAuth] /register: MCP_AUTH_TOKEN not set — registration is unprotected');
+      return true;
+    }
+    const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
+    const expected = Buffer.from(MCP_AUTH_TOKEN, 'utf-8');
+    const provided = Buffer.from(providedToken, 'utf-8');
+    const maxLen = Math.max(expected.length, provided.length);
+    return (
+      expected.length === provided.length &&
+      timingSafeEqual(
+        Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]),
+        Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]),
+      )
+    );
+  }
+
+  // ─── Client registration (RFC 7591) ─────────────────────────────────────
+
+  registerClient(metadata: Partial<OAuthClientInfo>): OAuthClientInfo {
+    const client_id = `oracle-${randomBytes(12).toString('hex')}`;
+    const client_secret = randomBytes(24).toString('hex');
+
+    const client: OAuthClientInfo = {
+      client_id,
+      client_secret,
+      redirect_uris: metadata.redirect_uris || [],
+      client_name: metadata.client_name,
+      grant_types: metadata.grant_types || ['authorization_code'],
+      response_types: metadata.response_types || ['code'],
+      scope: metadata.scope || 'read write',
+      token_endpoint_auth_method: metadata.token_endpoint_auth_method || 'client_secret_post',
+    };
+
+    this.state.clients[client_id] = client;
+    this.saveState();
+
+    console.log(`[OAuth] Client registered: ${client_id} (${metadata.client_name ?? 'unnamed'})`);
+    return client;
+  }
+
+  getClient(client_id: string): OAuthClientInfo | null {
+    return this.state.clients[client_id] ?? null;
+  }
+
+  // ─── Authorization ───────────────────────────────────────────────────────
+
+  /**
+   * Validate authorization request and store pending auth.
+   * Returns the login page URL with state key, or an error.
+   */
+  authorize(params: {
+    client_id: string;
+    redirect_uri: string;
+    scope?: string;
+    state?: string;
+    code_challenge: string;
+    code_challenge_method: string;
+    resource?: string;
+  }): { loginUrl: string } | { error: string } {
+    const client = this.getClient(params.client_id);
+    if (!client) {
+      return { error: `Unknown client_id: ${params.client_id}` };
+    }
+
+    if (!client.redirect_uris.includes(params.redirect_uri)) {
+      return { error: 'redirect_uri not registered for client' };
+    }
+
+    if (params.code_challenge_method !== 'S256') {
+      return { error: 'Only S256 code_challenge_method is supported' };
+    }
+
+    if (!params.code_challenge) {
+      return { error: 'code_challenge is required' };
+    }
+
+    // Clean stale entries before enforcing the cap
+    this.cleanExpiredTokens();
+
+    if (this.pendingAuthorizations.size >= OAuthProvider.MAX_PENDING_AUTHORIZATIONS) {
+      console.warn('[OAuth] /authorize rejected: too many pending authorizations');
+      return { error: 'Too many pending authorizations — try again later' };
+    }
+
+    const stateKey = randomBytes(16).toString('hex');
+    const scopes = (params.scope || 'read write').split(' ').filter(Boolean);
+
+    this.pendingAuthorizations.set(stateKey, {
+      client_id: params.client_id,
+      state: params.state,
+      scopes,
+      code_challenge: params.code_challenge,
+      redirect_uri: params.redirect_uri,
+      resource: params.resource,
+      created_at: Date.now(),
+    });
+
+    console.log(`[OAuth] Authorization started for client: ${params.client_id}`);
+    const loginUrl = `${MCP_EXTERNAL_URL}/oauth/login?state=${stateKey}`;
+    return { loginUrl };
+  }
+
+  // ─── PIN login page ──────────────────────────────────────────────────────
+
+  getLoginPage(stateKey: string, errorMessage?: string): string {
+    const pending = this.pendingAuthorizations.get(stateKey);
+    if (!pending) {
+      return `<!DOCTYPE html><html><body><h1>Error</h1><p>Invalid or expired state. Please restart the authorization flow.</p></body></html>`;
+    }
+
+    const errorHtml = errorMessage
+      ? `<p class="error">${escapeHtml(errorMessage)}</p>`
+      : '';
+
+    return `<!DOCTYPE html>
+<html lang="en">
+<head>
+  <meta charset="UTF-8">
+  <meta name="viewport" content="width=device-width, initial-scale=1.0">
+  <title>Oracle v3 — Authorize</title>
+  <style>
+    * { box-sizing: border-box; margin: 0; padding: 0; }
+    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
+    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; }
+    h1 { font-size: 1.4rem; color: #a78bfa; margin-bottom: 0.5rem; }
+    p { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }
+    label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 0.4rem; }
+    input[type="password"] { width: 100%; padding: 0.6rem 0.8rem; background: #0f0f0f; border: 1px solid #444; border-radius: 6px; color: #e0e0e0; font-size: 1rem; margin-bottom: 1rem; outline: none; }
+    input[type="password"]:focus { border-color: #a78bfa; }
+    button { width: 100%; padding: 0.7rem; background: #7c3aed; border: none; border-radius: 6px; color: white; font-size: 1rem; cursor: pointer; }
+    button:hover { background: #6d28d9; }
+    .error { color: #f87171; font-size: 0.85rem; margin-bottom: 1rem; }
+  </style>
+</head>
+<body>
+  <div class="card">
+    <h1>🔮 Oracle v3</h1>
+    <p>Enter your PIN to authorize access</p>
+    ${errorHtml}
+    <form method="POST" action="/oauth/callback">
+      <input type="hidden" name="state" value="${escapeHtml(stateKey)}">
+      <label for="pin">PIN</label>
+      <input type="password" id="pin" name="pin" placeholder="Enter PIN" autofocus autocomplete="current-password">
+      <button type="submit">Authorize</button>
+    </form>
+  </div>
+</body>
+</html>`;
+  }
+
+  /**
+   * Verify PIN and issue authorization code.
+   * Returns redirect URI with code param, or error info.
+   * @param ip - Client IP address for rate limiting (pass 'unknown' if unavailable)
+   */
+  handleLoginCallback(
+    stateKey: string,
+    pin: string,
+    ip: string = 'unknown',
+  ): { redirectUri: string } | { error: string; status: number; showLoginPage?: boolean } {
+    // Rate limit check
+    const rateCheck = this.checkRateLimit(ip);
+    if (!rateCheck.allowed) {
+      console.warn(`[OAuth] PIN rate limit exceeded for IP: ${ip}`);
+      return { error: 'Too many failed attempts. Please try again in 15 minutes.', status: 429, showLoginPage: true };
+    }
+
+    const pending = this.pendingAuthorizations.get(stateKey);
+    if (!pending) {
+      return { error: 'Invalid or expired state', status: 400 };
+    }
+
+    if (Date.now() - pending.created_at > AUTH_CODE_TTL_MS) {
+      this.pendingAuthorizations.delete(stateKey);
+      return { error: 'Authorization request expired', status: 400 };
+    }
+
+    if (!MCP_OAUTH_PIN) {
+      return { error: 'OAuth not configured', status: 503 };
+    }
+
+    // Timing-safe PIN comparison — pad to same length to satisfy timingSafeEqual requirement
+    const expected = Buffer.from(MCP_OAUTH_PIN, 'utf-8');
+    const provided = Buffer.from(pin || '', 'utf-8');
+    const maxLen = Math.max(expected.length, provided.length);
+    const expectedPadded = Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]);
+    const providedPadded = Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]);
+
+    const lengthMatch = expected.length === provided.length;
+    const bytesMatch = timingSafeEqual(expectedPadded, providedPadded);
+    const pinMatch = lengthMatch && bytesMatch;
+
+    if (!pinMatch) {
+      const attemptsLeft = this.recordFailedAttempt(ip);
+      console.warn(`[OAuth] Failed PIN attempt from IP: ${ip}, attempts remaining: ${attemptsLeft}`);
+      const msg = attemptsLeft > 0
+        ? `Incorrect PIN (${attemptsLeft} attempts remaining)`
+        : 'Incorrect PIN — account locked for 15 minutes';
+      return { error: msg, status: 403, showLoginPage: true };
+    }
+
+    this.resetAttempts(ip);
+
+    // Issue authorization code — one-time use
+    const code = randomBytes(24).toString('hex');
+
+    // Store code data for later token exchange
+    this.issuedCodes.set(code, {
+      client_id: pending.client_id,
+      redirect_uri: pending.redirect_uri,
+      scopes: pending.scopes,
+      code_challenge: pending.code_challenge,
+      resource: pending.resource,
+      issued_at: Date.now(),
+    });
+
+    // Remove pending auth — it's consumed
+    this.pendingAuthorizations.delete(stateKey);
+
+    console.log(`[OAuth] PIN verified, auth code issued for client: ${pending.client_id}`);
+
+    // Build redirect URI with code and original state
+    const redirectUrl = new URL(pending.redirect_uri);
+    redirectUrl.searchParams.set('code', code);
+    if (pending.state) redirectUrl.searchParams.set('state', pending.state);
+
+    return { redirectUri: redirectUrl.toString() };
+  }
+
+  // ─── Token exchange ──────────────────────────────────────────────────────
+
+  exchangeAuthorizationCode(params: {
+    client_id: string;
+    code: string;
+    code_verifier: string;
+    redirect_uri: string;
+  }): { access_token: string; token_type: 'bearer'; expires_in: number } | { error: string; status: number } {
+    const codeData = this.issuedCodes.get(params.code);
+    if (!codeData) {
+      return { error: 'invalid_grant', status: 400 };
+    }
+
+    // Auth codes are one-time use — delete immediately (even on failure)
+    this.issuedCodes.delete(params.code);
+
+    // Check code expiry (5 minutes)
+    if (Date.now() - codeData.issued_at > AUTH_CODE_TTL_MS) {
+      return { error: 'invalid_grant: authorization code expired', status: 400 };
+    }
+
+    if (codeData.client_id !== params.client_id) {
+      return { error: 'invalid_grant: client_id mismatch', status: 400 };
+    }
+
+    if (codeData.redirect_uri !== params.redirect_uri) {
+      return { error: 'invalid_grant: redirect_uri mismatch', status: 400 };
+    }
+
+    // PKCE: SHA-256(code_verifier) base64url must equal stored code_challenge
+    const verifierHash = createHash('sha256')
+      .update(params.code_verifier)
+      .digest('base64url');
+
+    if (verifierHash !== codeData.code_challenge) {
+      console.warn(`[OAuth] PKCE verification failed for client: ${params.client_id}`);
+      return { error: 'invalid_grant: PKCE verification failed', status: 400 };
+    }
+
+    const access_token = randomBytes(32).toString('hex');
+    const expires_at = Date.now() + TOKEN_TTL_MS;
+
+    this.state.tokens[access_token] = {
+      client_id: codeData.client_id,
+      scopes: codeData.scopes,
+      expires_at,
+      resource: codeData.resource,
+    };
+    this.saveState();
+
+    console.log(`[OAuth] Access token issued for client: ${codeData.client_id}`);
+
+    return {
+      access_token,
+      token_type: 'bearer',
+      expires_in: Math.floor(TOKEN_TTL_MS / 1000),
+    };
+  }
+
+  // ─── Token verification ──────────────────────────────────────────────────
+
+  /**
+   * Verify an access token.
+   * Checks OAuth-issued tokens first, then falls back to static MCP_AUTH_TOKEN.
+   */
+  verifyAccessToken(token: string): AuthInfo | null {
+    if (!token) return null;
+
+    // 1. OAuth-issued tokens
+    const data = this.state.tokens[token];
+    if (data) {
+      if (data.expires_at < Date.now()) {
+        delete this.state.tokens[token];
+        this.saveState();
+        return null;
+      }
+      return {
+        token,
+        client_id: data.client_id,
+        scopes: data.scopes,
+        expires_at: data.expires_at,
+      };
+    }
+
+    // 2. Static Bearer token fallback
+    if (!MCP_AUTH_TOKEN) return null;
+
+    const expected = Buffer.from(MCP_AUTH_TOKEN, 'utf-8');
+    const provided = Buffer.from(token, 'utf-8');
+    const maxLen = Math.max(expected.length, provided.length);
+    const expectedPadded = Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]);
+    const providedPadded = Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]);
+
+    const match = timingSafeEqual(expectedPadded, providedPadded) && expected.length === provided.length;
+    if (!match) return null;
+
+    return {
+      token: '[redacted]',
+      client_id: 'static-bearer',
+      scopes: ['read', 'write'],
+      expires_at: STATIC_TOKEN_EXPIRES_AT,
+    };
+  }
+
+  // ─── Token revocation ────────────────────────────────────────────────────
+
+  revokeToken(token: string): void {
+    if (this.state.tokens[token]) {
+      delete this.state.tokens[token];
+      this.saveState();
+      console.log('[OAuth] Token revoked');
+    }
+  }
+
+  // ─── Accessors for testing ───────────────────────────────────────────────
+
+  getTokenCount(): number {
+    return Object.keys(this.state.tokens).length;
+  }
+
+  getClientCount(): number {
+    return Object.keys(this.state.clients).length;
+  }
+}
+
+// Singleton instance
+let _provider: OAuthProvider | null = null;
+
+export function getOAuthProvider(): OAuthProvider {
+  if (!_provider) {
+    _provider = new OAuthProvider();
+  }
+  return _provider;
+}
+
+/** Reset singleton (for testing) */
+export function resetOAuthProvider(): void {
+  _provider = null;
+}
diff --git a/src/oauth/routes.ts b/src/oauth/routes.ts
new file mode 100644
index 00000000..3457daea
--- /dev/null
+++ b/src/oauth/routes.ts
@@ -0,0 +1,247 @@
+/**
+ * OAuth 2.1 Hono routes for Oracle v3
+ *
+ * Registers all OAuth endpoints on the Hono app.
+ * Only mounted when MCP_OAUTH_PIN is set.
+ *
+ * Endpoints:
+ *   GET  /.well-known/oauth-authorization-server  — AS metadata
+ *   GET  /.well-known/oauth-protected-resource    — Resource metadata
+ *   POST /register                                — Dynamic client registration (RFC 7591, Bearer-protected)
+ *   GET  /authorize                               — Authorization endpoint
+ *   POST /token                                   — Token endpoint
+ *   POST /revoke                                  — Revocation endpoint
+ *   GET  /oauth/login                             — PIN entry page
+ *   POST /oauth/callback                          — PIN verification + redirect (rate-limited)
+ */
+
+import type { Context, Hono } from 'hono';
+import { MCP_EXTERNAL_URL } from '../config.ts';
+import { getOAuthProvider } from './provider.ts';
+
+/** Extract best-effort client IP from request headers */
+function getClientIp(c: Context): string {
+  const forwarded = c.req.header('x-forwarded-for');
+  if (forwarded) return forwarded.split(',')[0].trim();
+  return c.req.header('x-real-ip') ?? 'unknown';
+}
+
+export function registerOAuthRoutes(app: Hono): void {
+  // ─── Discovery metadata ────────────────────────────────────────────────
+
+  app.get('/.well-known/oauth-authorization-server', (c) => {
+    return c.json({
+      issuer: MCP_EXTERNAL_URL,
+      authorization_endpoint: `${MCP_EXTERNAL_URL}/authorize`,
+      token_endpoint: `${MCP_EXTERNAL_URL}/token`,
+      registration_endpoint: `${MCP_EXTERNAL_URL}/register`,
+      revocation_endpoint: `${MCP_EXTERNAL_URL}/revoke`,
+      response_types_supported: ['code'],
+      grant_types_supported: ['authorization_code'],
+      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
+      code_challenge_methods_supported: ['S256'],
+      scopes_supported: ['read', 'write'],
+    });
+  });
+
+  app.get('/.well-known/oauth-protected-resource', (c) => {
+    return c.json({
+      resource: MCP_EXTERNAL_URL,
+      authorization_servers: [MCP_EXTERNAL_URL],
+      scopes_supported: ['read', 'write'],
+      bearer_methods_supported: ['header'],
+    });
+  });
+
+  // ─── Dynamic client registration (RFC 7591) ───────────────────────────
+  // Protected: requires Bearer MCP_AUTH_TOKEN to prevent open registration abuse.
+
+  app.post('/register', async (c) => {
+    const provider = getOAuthProvider();
+
+    // Require Bearer auth for registration
+    const authHeader = c.req.header('Authorization') ?? '';
+    if (!provider.checkRegistrationAuth(authHeader)) {
+      return c.json(
+        { error: 'unauthorized', error_description: 'Client registration requires a valid Bearer token' },
+        401,
+      );
+    }
+
+    let body: Record<string, unknown>;
+    try {
+      body = await c.req.json();
+    } catch {
+      return c.json({ error: 'invalid_request: body must be JSON' }, 400);
+    }
+
+    const redirect_uris = body.redirect_uris;
+    if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
+      return c.json({ error: 'invalid_client_metadata: redirect_uris required' }, 400);
+    }
+
+    const client = provider.registerClient({
+      redirect_uris: redirect_uris as string[],
+      client_name: body.client_name as string | undefined,
+      grant_types: body.grant_types as string[] | undefined,
+      response_types: body.response_types as string[] | undefined,
+      scope: body.scope as string | undefined,
+      token_endpoint_auth_method: body.token_endpoint_auth_method as string | undefined,
+    });
+
+    return c.json(client, 201);
+  });
+
+  // ─── Authorization endpoint ───────────────────────────────────────────
+
+  app.get('/authorize', (c) => {
+    const client_id = c.req.query('client_id') || '';
+    const redirect_uri = c.req.query('redirect_uri') || '';
+    const scope = c.req.query('scope');
+    const state = c.req.query('state');
+    const code_challenge = c.req.query('code_challenge') || '';
+    const code_challenge_method = c.req.query('code_challenge_method') || '';
+    const resource = c.req.query('resource');
+    const response_type = c.req.query('response_type');
+
+    if (response_type !== 'code') {
+      return c.json({ error: 'unsupported_response_type' }, 400);
+    }
+
+    const provider = getOAuthProvider();
+    const result = provider.authorize({
+      client_id,
+      redirect_uri,
+      scope,
+      state,
+      code_challenge,
+      code_challenge_method,
+      resource,
+    });
+
+    if ('error' in result) {
+      return c.json({ error: result.error }, 400);
+    }
+
+    return c.redirect(result.loginUrl, 302);
+  });
+
+  // ─── Token endpoint ───────────────────────────────────────────────────
+
+  app.post('/token', async (c) => {
+    let params: Record<string, string>;
+
+    const contentType = c.req.header('Content-Type') || '';
+    if (contentType.includes('application/x-www-form-urlencoded')) {
+      const text = await c.req.text();
+      params = Object.fromEntries(new URLSearchParams(text));
+    } else {
+      // Try JSON fallback
+      try {
+        params = await c.req.json() as Record<string, string>;
+      } catch {
+        return c.json({ error: 'invalid_request: unsupported content type' }, 400);
+      }
+    }
+
+    const grant_type = params.grant_type;
+    if (grant_type !== 'authorization_code') {
+      return c.json({ error: 'unsupported_grant_type' }, 400);
+    }
+
+    const code = params.code;
+    const client_id = params.client_id;
+    const code_verifier = params.code_verifier;
+    const redirect_uri = params.redirect_uri;
+
+    if (!code || !client_id || !code_verifier || !redirect_uri) {
+      return c.json({ error: 'invalid_request: missing required parameters' }, 400);
+    }
+
+    const provider = getOAuthProvider();
+    const result = provider.exchangeAuthorizationCode({
+      client_id,
+      code,
+      code_verifier,
+      redirect_uri,
+    });
+
+    if ('error' in result) {
+      return c.json({ error: result.error }, result.status as 400 | 503);
+    }
+
+    return c.json(result);
+  });
+
+  // ─── Token revocation ─────────────────────────────────────────────────
+
+  app.post('/revoke', async (c) => {
+    let token: string | undefined;
+
+    const contentType = c.req.header('Content-Type') || '';
+    if (contentType.includes('application/x-www-form-urlencoded')) {
+      const text = await c.req.text();
+      const params = new URLSearchParams(text);
+      token = params.get('token') ?? undefined;
+    } else {
+      try {
+        const body = await c.req.json() as Record<string, string>;
+        token = body.token;
+      } catch {
+        // ignore
+      }
+    }
+
+    if (token) {
+      getOAuthProvider().revokeToken(token);
+    }
+
+    // RFC 7009: always return 200 even if token unknown
+    return c.json({}, 200);
+  });
+
+  // ─── PIN login page ───────────────────────────────────────────────────
+
+  app.get('/oauth/login', (c) => {
+    const stateKey = c.req.query('state') || '';
+    const provider = getOAuthProvider();
+    const html = provider.getLoginPage(stateKey);
+    return c.html(html);
+  });
+
+  app.post('/oauth/callback', async (c) => {
+    let stateKey: string;
+    let pin: string;
+
+    const contentType = c.req.header('Content-Type') || '';
+    if (contentType.includes('application/x-www-form-urlencoded')) {
+      const text = await c.req.text();
+      const params = new URLSearchParams(text);
+      stateKey = params.get('state') || '';
+      pin = params.get('pin') || '';
+    } else {
+      try {
+        const body = await c.req.json() as Record<string, string>;
+        stateKey = body.state || '';
+        pin = body.pin || '';
+      } catch {
+        return c.json({ error: 'invalid_request' }, 400);
+      }
+    }
+
+    const ip = getClientIp(c);
+    const provider = getOAuthProvider();
+    const result = provider.handleLoginCallback(stateKey, pin, ip);
+
+    if ('error' in result) {
+      if (result.showLoginPage) {
+        // Re-render login page with error message
+        const html = provider.getLoginPage(stateKey, result.error);
+        return c.html(html, result.status as 200 | 400 | 403 | 429 | 503);
+      }
+      return c.json({ error: result.error }, result.status as 400 | 403 | 429 | 503);
+    }
+
+    return c.redirect(result.redirectUri, 302);
+  });
+}
diff --git a/src/oauth/types.ts b/src/oauth/types.ts
new file mode 100644
index 00000000..bf10453e
--- /dev/null
+++ b/src/oauth/types.ts
@@ -0,0 +1,39 @@
+/**
+ * OAuth 2.1 types for Oracle v3
+ *
+ * Used by the OAuthProvider and Hono route handlers.
+ * Persisted to ORACLE_DATA_DIR/.oauth-state.json
+ */
+
+export interface OAuthTokenData {
+  client_id: string;
+  scopes: string[];
+  expires_at: number;
+  resource?: string;
+}
+
+export interface OAuthState {
+  clients: Record<string, OAuthClientInfo>;
+  tokens: Record<string, OAuthTokenData>;
+}
+
+export interface OAuthClientInfo {
+  client_id: string;
+  client_secret?: string;
+  redirect_uris: string[];
+  client_name?: string;
+  grant_types?: string[];
+  response_types?: string[];
+  scope?: string;
+  token_endpoint_auth_method?: string;
+}
+
+export interface PendingAuthorization {
+  client_id: string;
+  state?: string;
+  scopes: string[];
+  code_challenge: string;
+  redirect_uri: string;
+  resource?: string;
+  created_at: number;
+}
diff --git a/src/routes/knowledge.ts b/src/routes/knowledge.ts
index 5dd23e49..4cbaeee1 100644
--- a/src/routes/knowledge.ts
+++ b/src/routes/knowledge.ts
@@ -6,23 +6,27 @@ import type { Hono } from 'hono';
 import fs from 'fs';
 import path from 'path';
 import { REPO_ROOT } from '../config.ts';
-import { handleLearn } from '../server/handlers.ts';
+import { createLearning } from '../tools/learn.ts';
+import { db, sqlite } from '../db/index.ts';
 
 export function registerKnowledgeRoutes(app: Hono) {
-  // Learn
+  // Learn — uses shared createLearning() from tools/learn.ts
   app.post('/api/learn', async (c) => {
     try {
       const data = await c.req.json();
       if (!data.pattern) {
         return c.json({ error: 'Missing required field: pattern' }, 400);
       }
-      const result = handleLearn(
-        data.pattern,
-        data.source,
-        data.concepts,
-        data.origin,   // 'mother' | 'arthur' | 'volt' | 'human' (null = universal)
-        data.project,  // ghq-style project path (null = universal)
-        data.cwd       // Auto-detect project from cwd
+      const result = createLearning(
+        { db, sqlite, repoRoot: REPO_ROOT },
+        {
+          pattern: data.pattern,
+          source: data.source,
+          concepts: data.concepts,
+          project: data.project,
+          ttl: data.ttl,
+          origin: data.origin,
+        },
       );
       return c.json(result);
     } catch (error) {
diff --git a/src/scripts/backfill-ttl.ts b/src/scripts/backfill-ttl.ts
new file mode 100644
index 00000000..51a3bc22
--- /dev/null
+++ b/src/scripts/backfill-ttl.ts
@@ -0,0 +1,81 @@
+/**
+ * Backfill TTL for existing oracle_documents rows
+ *
+ * Sets ttl_days and expires_at on rows whose IDs match known TTL patterns
+ * but currently have NULL values (created before TTL feature was added).
+ *
+ * Usage: bun src/scripts/backfill-ttl.ts [--dry-run]
+ */
+
+import { createDatabase } from '../db/index.ts';
+import { defaultTtlDays } from '../tools/learn.ts';
+
+const dryRun = process.argv.includes('--dry-run');
+const { sqlite } = createDatabase();
+
+// Fetch all rows missing TTL
+const rows = sqlite.prepare(`
+  SELECT id, source_file, created_at
+  FROM oracle_documents
+  WHERE ttl_days IS NULL AND expires_at IS NULL AND superseded_by IS NULL
+`).all() as { id: string; source_file: string; created_at: number }[];
+
+console.log(`Found ${rows.length} rows without TTL`);
+
+let updated = 0;
+let skipped = 0;
+
+const updateStmt = sqlite.prepare(`
+  UPDATE oracle_documents
+  SET ttl_days = ?, expires_at = ?
+  WHERE id = ?
+`);
+
+sqlite.exec('BEGIN');
+try {
+  for (const row of rows) {
+    // Extract title-like text from ID (learning_YYYY-MM-DD_slug)
+    const slugPart = row.id.replace(/^learning_\d{4}-\d{2}-\d{2}_/, '');
+    // Reconstruct approximate title from slug for pattern matching
+    const approxTitle = slugPart.replace(/-/g, ' ');
+
+    // Also check source_file path for pattern hints
+    const combined = `${approxTitle} ${row.source_file}`;
+
+    // Try matching against TTL patterns using the title
+    // The patterns check for [score-output], [infra-health], etc. prefixes
+    // We need to check the slug which doesn't have brackets, so do manual matching
+    let ttlDays: number | null = null;
+
+    if (/^score-output/i.test(slugPart)) ttlDays = 7;
+    else if (/^infra-health/i.test(slugPart)) ttlDays = 7;
+    else if (/^remediation-audit/i.test(slugPart)) ttlDays = 14;
+    else if (/^daily-goal/i.test(slugPart)) ttlDays = 7;
+    else if (/^goal-carryover/i.test(slugPart)) ttlDays = 7;
+    else if (/^retro/i.test(slugPart)) ttlDays = 30;
+    // Also match patterns in the middle of the slug (e.g., "infrastructure-health-check")
+    else if (/infrastructure-health/i.test(slugPart)) ttlDays = 7;
+
+    if (ttlDays) {
+      const expiresAt = row.created_at + (ttlDays * 86400000);
+      if (dryRun) {
+        console.log(`  [DRY-RUN] ${row.id} → ttl=${ttlDays}d, expires=${new Date(expiresAt).toISOString().split('T')[0]}`);
+      } else {
+        updateStmt.run(ttlDays, expiresAt, row.id);
+      }
+      updated++;
+    } else {
+      skipped++;
+    }
+  }
+  sqlite.exec('COMMIT');
+} catch (e) {
+  sqlite.exec('ROLLBACK');
+  throw e;
+}
+
+console.log(`\nDone${dryRun ? ' (dry-run)' : ''}:`);
+console.log(`  Updated: ${updated}`);
+console.log(`  Skipped (permanent): ${skipped}`);
+
+sqlite.close();
diff --git a/src/scripts/index-model.ts b/src/scripts/index-model.ts
index faeb19c9..4ef27da2 100644
--- a/src/scripts/index-model.ts
+++ b/src/scripts/index-model.ts
@@ -39,12 +39,18 @@ async function main() {
   const [{ total: docCount }] = db.select({ total: count() }).from(oracleDocuments).all();
   console.log(`Documents: ${docCount}`);
 
+  const dbType = (process.env.ORACLE_VECTOR_DB || 'lancedb') as any;
+  const embedProvider = (process.env.ORACLE_EMBEDDING_PROVIDER || 'ollama') as any;
+  const embedModel = embedProvider === 'openai'
+    ? (process.env.ORACLE_EMBEDDING_MODEL || 'text-embedding-3-small')
+    : preset.model;
+
   const store = createVectorStore({
-    type: 'lancedb',
+    type: dbType,
     collectionName: preset.collection,
-    embeddingProvider: 'ollama',
-    embeddingModel: preset.model,
-    ...(preset.dataPath && { dataPath: preset.dataPath }),
+    embeddingProvider: embedProvider,
+    embeddingModel: embedModel,
+    ...(dbType === 'lancedb' && preset.dataPath && { dataPath: preset.dataPath }),
   });
 
   await store.connect();
diff --git a/src/server.ts b/src/server.ts
index 3692ccd8..5b433b06 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -6,6 +6,7 @@
  */
 
 import { Hono } from 'hono';
+import { timingSafeEqual, createHmac } from 'crypto';
 import { cors } from 'hono/cors';
 import { eq } from 'drizzle-orm';
 
@@ -17,7 +18,7 @@ import {
   performGracefulShutdown,
 } from './process-manager/index.ts';
 
-import { PORT, ORACLE_DATA_DIR } from './config.ts';
+import { PORT, ORACLE_DATA_DIR, MCP_AUTH_TOKEN, MCP_OAUTH_PIN, MCP_EXTERNAL_URL } from './config.ts';
 import { db, closeDb, indexingStatus } from './db/index.ts';
 
 // Route modules
@@ -33,6 +34,9 @@ import { registerTraceRoutes } from './routes/traces.ts';
 import { registerKnowledgeRoutes } from './routes/knowledge.ts';
 import { registerSupersedeRoutes } from './routes/supersede.ts';
 import { registerFileRoutes } from './routes/files.ts';
+import { createMcpHandler } from './mcp-transport.ts';
+import { registerOAuthRoutes } from './oauth/routes.ts';
+import { getOAuthProvider } from './oauth/provider.ts';
 
 // Reset stale indexing status on startup using Drizzle
 try {
@@ -105,6 +109,70 @@ registerKnowledgeRoutes(app);
 registerSupersedeRoutes(app);
 registerFileRoutes(app);
 
+// OAuth 2.1 routes — mount before /mcp so discovery endpoints are available
+if (MCP_OAUTH_PIN) {
+  registerOAuthRoutes(app);
+}
+
+// MCP CORS — allow any origin for /mcp (auth is via Bearer token or OAuth, not CORS)
+app.use('/mcp', cors({
+  origin: '*',
+  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
+  allowHeaders: ['Authorization', 'Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'Last-Event-ID'],
+  exposeHeaders: ['mcp-session-id', 'mcp-protocol-version'],
+}));
+
+// MCP Streamable HTTP endpoint — Bearer token auth (OAuth or static), stateless per-request
+app.all('/mcp', async (c) => {
+  // Require at least one auth method to be configured
+  if (!MCP_AUTH_TOKEN && !MCP_OAUTH_PIN) {
+    return c.json({ error: 'MCP endpoint not configured (MCP_AUTH_TOKEN not set)' }, 401);
+  }
+
+  const authHeader = c.req.header('Authorization') || '';
+  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
+
+  let authorized = false;
+
+  if (MCP_OAUTH_PIN) {
+    // OAuth mode: delegate verification to provider (checks OAuth tokens + static Bearer fallback)
+    const provider = getOAuthProvider();
+    const authInfo = provider.verifyAccessToken(token);
+    authorized = authInfo !== null;
+  } else {
+    // Bearer-only mode: constant-time HMAC comparison
+    if (MCP_AUTH_TOKEN) {
+      const _hmacKey = Buffer.alloc(32);
+      const expectedHash = createHmac('sha256', _hmacKey).update(MCP_AUTH_TOKEN).digest();
+      const providedHash = createHmac('sha256', _hmacKey).update(token).digest();
+      authorized = timingSafeEqual(expectedHash, providedHash);
+    }
+  }
+
+  if (!authorized) {
+    // Include WWW-Authenticate header so MCP clients can discover OAuth
+    if (MCP_OAUTH_PIN) {
+      c.header('WWW-Authenticate', `Bearer resource_metadata="${MCP_EXTERNAL_URL}/.well-known/oauth-protected-resource"`);
+    }
+    return c.json({ error: 'Unauthorized' }, 401);
+  }
+
+  // Add MCP-specific CORS headers
+  c.header('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');
+  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, mcp-session-id, mcp-protocol-version, Last-Event-ID');
+
+  try {
+    const response = await createMcpHandler(c.req.raw);
+    return response;
+  } catch (err) {
+    console.error('[MCP] Handler error:', err);
+    return c.json(
+      { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null },
+      500,
+    );
+  }
+});
+
 // Startup banner
 console.log(`
 🔮 Arra Oracle HTTP Server running! (Hono.js)
@@ -132,7 +200,17 @@ console.log(`
    - GET  /api/supersede       List supersessions
    - GET  /api/supersede/chain/:path  Document lineage
    - POST /api/supersede       Log supersession
+
+   MCP (Remote):
+   - ALL /mcp                  Streamable HTTP MCP endpoint
 `);
+console.log(MCP_AUTH_TOKEN ? '   🔑 MCP auth: Bearer token configured' : '   ⚠️  MCP auth: Bearer token NOT configured');
+if (MCP_OAUTH_PIN) {
+  console.log(`   🔐 OAuth 2.1: enabled (${MCP_EXTERNAL_URL})`);
+  console.log('      Endpoints: /.well-known/oauth-authorization-server, /authorize, /token, /register');
+} else {
+  console.log('   ℹ️  OAuth 2.1: disabled (set MCP_OAUTH_PIN to enable)');
+}
 
 export default {
   port: Number(PORT),
diff --git a/src/server/handlers.ts b/src/server/handlers.ts
index 5fca7072..e16dddff 100644
--- a/src/server/handlers.ts
+++ b/src/server/handlers.ts
@@ -42,7 +42,7 @@ export async function handleSearch(
   // Remove FTS5 special characters and HTML: ? * + - ( ) ^ ~ " ' : < > { } [ ] ; / \
   const safeQuery = query
     .replace(/<[^>]*>/g, ' ')           // Strip HTML tags
-    .replace(/[?*+\-()^~"':;<>{}[\]\\\/]/g, ' ')  // Strip FTS5 + SQL special chars
+    .replace(/[?*+\-()^~"':;<>{}[\]\\\/%]/g, ' ')  // Strip FTS5 + SQL special chars (incl. %)
     .replace(/\s+/g, ' ')
     .trim();
   if (!safeQuery) {
@@ -62,6 +62,9 @@ export async function handleSearch(
     : '1=1';
   const projectParams = resolvedProject ? [resolvedProject] : [];
 
+  // Supersede filter: exclude superseded documents by default (Issue #5/#8)
+  const supersedeFilter = 'AND d.superseded_by IS NULL';
+
   // FTS5 search must use raw SQL (Drizzle doesn't support virtual tables)
   if (mode !== 'vector') {
     if (type === 'all') {
@@ -69,7 +72,7 @@ export async function handleSearch(
         SELECT COUNT(*) as total
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND ${projectFilter}
+        WHERE oracle_fts MATCH ? AND ${projectFilter} ${supersedeFilter}
       `);
       ftsTotal = (countStmt.get(safeQuery, ...projectParams) as { total: number }).total;
 
@@ -77,7 +80,7 @@ export async function handleSearch(
         SELECT f.id, f.content, d.type, d.source_file, d.concepts, d.project, rank as score
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND ${projectFilter}
+        WHERE oracle_fts MATCH ? AND ${projectFilter} ${supersedeFilter}
         ORDER BY rank
         LIMIT ?
       `);
@@ -96,7 +99,7 @@ export async function handleSearch(
         SELECT COUNT(*) as total
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND d.type = ? AND ${projectFilter}
+        WHERE oracle_fts MATCH ? AND d.type = ? AND ${projectFilter} ${supersedeFilter}
       `);
       ftsTotal = (countStmt.get(safeQuery, type, ...projectParams) as { total: number }).total;
 
@@ -104,7 +107,7 @@ export async function handleSearch(
         SELECT f.id, f.content, d.type, d.source_file, d.concepts, d.project, rank as score
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND d.type = ? AND ${projectFilter}
+        WHERE oracle_fts MATCH ? AND d.type = ? AND ${projectFilter} ${supersedeFilter}
         ORDER BY rank
         LIMIT ?
       `);
@@ -225,8 +228,22 @@ export async function handleSearch(
     }
   }
 
+  // Post-filter: remove superseded docs from vector results (FTS already filtered via SQL)
+  const supersededIds = new Set<string>();
+  const vectorIds = combined.filter(r => r.source === 'vector' || r.source === 'hybrid').map(r => r.id);
+  if (vectorIds.length > 0) {
+    const placeholders = vectorIds.map(() => '?').join(',');
+    const excludeRows = sqlite.prepare(
+      `SELECT id FROM oracle_documents WHERE id IN (${placeholders}) AND superseded_by IS NOT NULL`
+    ).all(...vectorIds) as { id: string }[];
+    for (const row of excludeRows) supersededIds.add(row.id);
+  }
+  const filtered = supersededIds.size > 0
+    ? combined.filter(r => !supersededIds.has(r.id))
+    : combined;
+
   // Apply pagination
-  const results = combined.slice(offset, offset + limit);
+  const results = filtered.slice(offset, offset + limit);
 
   // Log search
   const searchTime = Date.now() - startTime;
diff --git a/src/tools/__tests__/search.test.ts b/src/tools/__tests__/search.test.ts
index 9b793661..bd3d6a4a 100644
--- a/src/tools/__tests__/search.test.ts
+++ b/src/tools/__tests__/search.test.ts
@@ -21,6 +21,8 @@ describe('sanitizeFtsQuery', () => {
     expect(sanitizeFtsQuery('test*')).toBe('test');
     expect(sanitizeFtsQuery('a + b')).toBe('a b');
     expect(sanitizeFtsQuery('NOT this')).toBe('NOT this');
+    expect(sanitizeFtsQuery('disk 64%')).toBe('disk 64');
+    expect(sanitizeFtsQuery('80% usage')).toBe('80 usage');
   });
 
   it('should handle quotes', () => {
diff --git a/src/tools/__tests__/ttl.test.ts b/src/tools/__tests__/ttl.test.ts
new file mode 100644
index 00000000..715caf7b
--- /dev/null
+++ b/src/tools/__tests__/ttl.test.ts
@@ -0,0 +1,79 @@
+/**
+ * Unit tests for TTL helpers (pure functions).
+ */
+
+import { describe, it, expect } from 'bun:test';
+import { parseTtl, defaultTtlDays } from '../learn.ts';
+
+// ============================================================================
+// parseTtl
+// ============================================================================
+
+describe('parseTtl', () => {
+  it('should parse valid day strings', () => {
+    expect(parseTtl('7d')).toBe(7);
+    expect(parseTtl('14d')).toBe(14);
+    expect(parseTtl('30d')).toBe(30);
+    expect(parseTtl('365d')).toBe(365);
+  });
+
+  it('should return null for zero days', () => {
+    expect(parseTtl('0d')).toBeNull();
+  });
+
+  it('should return null for invalid input', () => {
+    expect(parseTtl('abc')).toBeNull();
+    expect(parseTtl('')).toBeNull();
+    expect(parseTtl(undefined)).toBeNull();
+    expect(parseTtl('7')).toBeNull();
+    expect(parseTtl('d')).toBeNull();
+    expect(parseTtl('-5d')).toBeNull();
+  });
+
+  it('should enforce max TTL of 365 days', () => {
+    expect(parseTtl('365d')).toBe(365);
+    expect(parseTtl('366d')).toBeNull();
+    expect(parseTtl('999999d')).toBeNull();
+  });
+});
+
+// ============================================================================
+// defaultTtlDays
+// ============================================================================
+
+describe('defaultTtlDays', () => {
+  it('should return 7 for score-output prefix', () => {
+    expect(defaultTtlDays('[score-output] infra-health: disk 64%, all green')).toBe(7);
+  });
+
+  it('should return 7 for infra-health prefix', () => {
+    expect(defaultTtlDays('[infra-health] disk usage at 79%')).toBe(7);
+  });
+
+  it('should return 14 for remediation-audit prefix', () => {
+    expect(defaultTtlDays('[remediation-audit] stale reports cleaned')).toBe(14);
+  });
+
+  it('should return 7 for daily-goal prefix', () => {
+    expect(defaultTtlDays('[daily-goal] P2: Add vector alerting')).toBe(7);
+  });
+
+  it('should return 7 for goal-carryover prefix', () => {
+    expect(defaultTtlDays('[goal-carryover] P0: Fix ChromaDB vector search')).toBe(7);
+  });
+
+  it('should return 30 for retro prefix', () => {
+    expect(defaultTtlDays('[retro] session 2026-04-07 retrospective')).toBe(30);
+  });
+
+  it('should return null for patterns without TTL prefix', () => {
+    expect(defaultTtlDays('Oracle v3 ChromaDB connectivity issue')).toBeNull();
+    expect(defaultTtlDays('Some regular learning')).toBeNull();
+  });
+
+  it('should be case insensitive', () => {
+    expect(defaultTtlDays('[SCORE-OUTPUT] test')).toBe(7);
+    expect(defaultTtlDays('[Score-Output] test')).toBe(7);
+    expect(defaultTtlDays('[INFRA-HEALTH] test')).toBe(7);
+  });
+});
diff --git a/src/tools/learn.ts b/src/tools/learn.ts
index cc37c076..4bc18f93 100644
--- a/src/tools/learn.ts
+++ b/src/tools/learn.ts
@@ -7,11 +7,43 @@
 
 import path from 'path';
 import fs from 'fs';
-import { oracleDocuments } from '../db/schema.ts';
+import { oracleDocuments, learnLog } from '../db/schema.ts';
 import { detectProject } from '../server/project-detect.ts';
 import { getVaultPsiRoot } from '../vault/handler.ts';
 import type { ToolContext, ToolResponse, OracleLearnInput } from './types.ts';
 
+// ============================================================================
+// TTL Helpers (Issue #4)
+// ============================================================================
+
+/** Default TTL by title pattern prefix */
+const TTL_PATTERNS: [RegExp, number][] = [
+  [/^\[score-output\]/i, 7],
+  [/^\[infra-health\]/i, 7],
+  [/^\[remediation-audit\]/i, 14],
+  [/^\[daily-goal\]/i, 7],
+  [/^\[goal-carryover\]/i, 7],
+  [/^\[retro\]/i, 30],
+];
+
+/** Parse TTL string like "7d" → number of days, or null if invalid */
+export function parseTtl(ttl: string | undefined | null): number | null {
+  if (!ttl) return null;
+  const match = ttl.match(/^(\d+)d$/);
+  if (!match) return null;
+  const days = parseInt(match[1], 10);
+  if (days <= 0 || days > 365) return null;
+  return days;
+}
+
+/** Get default TTL in days based on title pattern prefix, or null for permanent */
+export function defaultTtlDays(title: string): number | null {
+  for (const [pattern, days] of TTL_PATTERNS) {
+    if (pattern.test(title)) return days;
+  }
+  return null;
+}
+
 /** Coerce concepts to string[] — handles string, array, or undefined from MCP input */
 export function coerceConcepts(concepts: unknown): string[] {
   if (Array.isArray(concepts)) return concepts.map(String);
@@ -41,6 +73,10 @@ export const learnToolDef = {
       project: {
         type: 'string',
         description: 'Source project. Accepts: "github.com/owner/repo", "owner/repo", local path with ghq/Code prefix, or GitHub URL. Auto-normalized to "github.com/owner/repo" format.'
+      },
+      ttl: {
+        type: 'string',
+        description: 'Optional TTL for auto-expiry (e.g. "7d", "14d", "30d"). Auto-assigned by title pattern if omitted: [score-output]=7d, [infra-health]=7d, [remediation-audit]=14d, [daily-goal]=7d, [goal-carryover]=7d, [retro]=30d. No TTL = permanent.'
       }
     },
     required: ['pattern']
@@ -98,11 +134,35 @@ export function extractProjectFromSource(source?: string): string | null {
 }
 
 // ============================================================================
-// Handler
+// Shared Core Logic — used by both MCP handler and HTTP route
 // ============================================================================
 
-export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Promise<ToolResponse> {
-  const { pattern, source, concepts, project: projectInput } = input;
+export interface LearnDeps {
+  db: ToolContext['db'];
+  sqlite: ToolContext['sqlite'];
+  repoRoot: string;
+}
+
+export interface LearnInput {
+  pattern: string;
+  source?: string;
+  concepts?: string[] | string;
+  project?: string;
+  ttl?: string;
+  origin?: string;
+}
+
+export interface LearnResult {
+  success: true;
+  file: string;
+  id: string;
+  ttl?: string;
+  expires_at?: string;
+  message: string;
+}
+
+export function createLearning(deps: LearnDeps, input: LearnInput): LearnResult {
+  const { pattern, source, ttl, origin } = input;
   const now = new Date();
   const dateStr = now.toISOString().split('T')[0];
 
@@ -121,9 +181,9 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
   if ('needsInit' in vault) console.error(`[Vault] ${vault.hint}`);
   const vaultRoot = 'path' in vault ? vault.path : null;
 
-  const project = normalizeProject(projectInput)
+  const project = normalizeProject(input.project)
     || extractProjectFromSource(source)
-    || detectProject(ctx.repoRoot);
+    || detectProject(deps.repoRoot);
   const projectDir = (project || '_universal').toLowerCase();
 
   let filePath: string;
@@ -134,7 +194,7 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
     filePath = path.join(dir, filename);
     sourceFileRel = `${projectDir}/ψ/memory/learnings/${filename}`;
   } else {
-    const dir = path.join(ctx.repoRoot, 'ψ/memory/learnings');
+    const dir = path.join(deps.repoRoot, 'ψ/memory/learnings');
     fs.mkdirSync(dir, { recursive: true });
     filePath = path.join(dir, filename);
     sourceFileRel = `ψ/memory/learnings/${filename}`;
@@ -145,7 +205,9 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
   }
 
   const title = pattern.split('\n')[0].substring(0, 80);
-  const conceptsList = coerceConcepts(concepts);
+  const conceptsList = coerceConcepts(input.concepts);
+  const ttlDays = parseTtl(ttl) ?? defaultTtlDays(title);
+  const expiresAt = ttlDays ? now.getTime() + (ttlDays * 86400000) : null;
   const frontmatter = [
     '---',
     `title: ${title}`,
@@ -153,6 +215,8 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
     `created: ${dateStr}`,
     `source: ${source || 'Oracle Learn'}`,
     ...(project ? [`project: ${project}`] : []),
+    ...(ttlDays ? [`ttl: ${ttlDays}d`] : []),
+    ...(expiresAt ? [`expires: ${new Date(expiresAt).toISOString().split('T')[0]}`] : []),
     '---',
     '',
     `# ${title}`,
@@ -168,7 +232,7 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
 
   const id = `learning_${dateStr}_${slug}`;
 
-  ctx.db.insert(oracleDocuments).values({
+  deps.db.insert(oracleDocuments).values({
     id,
     type: 'learning',
     sourceFile: sourceFileRel,
@@ -176,25 +240,55 @@ export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Pr
     createdAt: now.getTime(),
     updatedAt: now.getTime(),
     indexedAt: now.getTime(),
-    origin: null,
+    origin: origin || null,
     project,
     createdBy: 'arra_learn',
+    expiresAt,
+    ttlDays,
   }).run();
 
-  ctx.sqlite.prepare(`
+  deps.sqlite.prepare(`
     INSERT INTO oracle_fts (id, content, concepts)
     VALUES (?, ?, ?)
   `).run(id, frontmatter, conceptsList.join(' '));
 
+  // Log the learning (was lost during createLearning refactor)
+  try {
+    deps.db.insert(learnLog).values({
+      documentId: id,
+      patternPreview: pattern.substring(0, 100),
+      source: source || 'Oracle Learn',
+      concepts: JSON.stringify(conceptsList),
+      createdAt: now.getTime(),
+      project: project || null,
+    }).run();
+  } catch (e) {
+    console.error('Failed to log learning:', e);
+  }
+
+  return {
+    success: true,
+    file: sourceFileRel,
+    id,
+    ...(ttlDays ? { ttl: `${ttlDays}d`, expires_at: new Date(expiresAt!).toISOString() } : {}),
+    message: `Pattern added to Oracle knowledge base${vaultRoot ? ' (vault)' : ''}${ttlDays ? ` (expires in ${ttlDays} days)` : ''}`,
+  };
+}
+
+// ============================================================================
+// MCP Handler — wraps createLearning in ToolResponse
+// ============================================================================
+
+export async function handleLearn(ctx: ToolContext, input: OracleLearnInput): Promise<ToolResponse> {
+  const result = createLearning(
+    { db: ctx.db, sqlite: ctx.sqlite, repoRoot: ctx.repoRoot },
+    input,
+  );
+
   return {
     content: [{
       type: 'text',
-      text: JSON.stringify({
-        success: true,
-        file: sourceFileRel,
-        id,
-        message: `Pattern added to Oracle knowledge base${vaultRoot ? ' (vault)' : ''}`
-      }, null, 2)
+      text: JSON.stringify(result, null, 2)
     }]
   };
 }
diff --git a/src/tools/list.ts b/src/tools/list.ts
index c6a50966..436628cd 100644
--- a/src/tools/list.ts
+++ b/src/tools/list.ts
@@ -50,16 +50,27 @@ export async function handleList(ctx: ToolContext, input: OracleListInput): Prom
     throw new Error(`Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`);
   }
 
+  // TTL + supersede filters (Issue #4, #7)
+  const nowMs = Date.now();
+  const activeFilter = '(expires_at IS NULL OR expires_at > ?) AND superseded_by IS NULL';
+
   const countResult = type === 'all'
-    ? ctx.db.select({ total: sql<number>`count(*)` }).from(oracleDocuments).get()
-    : ctx.db.select({ total: sql<number>`count(*)` }).from(oracleDocuments).where(eq(oracleDocuments.type, type)).get();
+    ? ctx.sqlite.prepare(`SELECT count(*) as total FROM oracle_documents WHERE ${activeFilter}`).get(nowMs) as { total: number }
+    : ctx.sqlite.prepare(`SELECT count(*) as total FROM oracle_documents WHERE type = ? AND ${activeFilter}`).get(type, nowMs) as { total: number };
   const total = countResult?.total ?? 0;
 
+  const expiredResult = ctx.sqlite.prepare('SELECT count(*) as cnt FROM oracle_documents WHERE expires_at IS NOT NULL AND expires_at <= ?').get(nowMs) as { cnt: number };
+  const expiredCount = expiredResult?.cnt ?? 0;
+
+  const supersededResult = ctx.sqlite.prepare('SELECT count(*) as cnt FROM oracle_documents WHERE superseded_by IS NOT NULL').get() as { cnt: number };
+  const supersededCount = supersededResult?.cnt ?? 0;
+
   const listStmt = type === 'all'
     ? ctx.sqlite.prepare(`
         SELECT d.id, d.type, d.source_file, d.concepts, d.indexed_at, f.content
         FROM oracle_documents d
         JOIN oracle_fts f ON d.id = f.id
+        WHERE (d.expires_at IS NULL OR d.expires_at > ?) AND d.superseded_by IS NULL
         ORDER BY d.indexed_at DESC
         LIMIT ? OFFSET ?
       `)
@@ -67,14 +78,14 @@ export async function handleList(ctx: ToolContext, input: OracleListInput): Prom
         SELECT d.id, d.type, d.source_file, d.concepts, d.indexed_at, f.content
         FROM oracle_documents d
         JOIN oracle_fts f ON d.id = f.id
-        WHERE d.type = ?
+        WHERE d.type = ? AND (d.expires_at IS NULL OR d.expires_at > ?) AND d.superseded_by IS NULL
         ORDER BY d.indexed_at DESC
         LIMIT ? OFFSET ?
       `);
 
   const rows = type === 'all'
-    ? listStmt.all(limit, offset)
-    : listStmt.all(type, limit, offset);
+    ? listStmt.all(nowMs, limit, offset)
+    : listStmt.all(type, nowMs, limit, offset);
 
   const documents = (rows as any[]).map((row) => ({
     id: row.id,
@@ -89,7 +100,7 @@ export async function handleList(ctx: ToolContext, input: OracleListInput): Prom
   return {
     content: [{
       type: 'text',
-      text: JSON.stringify({ documents, total, limit, offset, type }, null, 2)
+      text: JSON.stringify({ documents, total, limit, offset, type, expired: expiredCount, superseded: supersededCount }, null, 2)
     }]
   };
 }
diff --git a/src/tools/search.ts b/src/tools/search.ts
index f1da37bf..ab4cdf77 100644
--- a/src/tools/search.ts
+++ b/src/tools/search.ts
@@ -55,6 +55,11 @@ export const searchToolDef = {
         type: 'string',
         enum: ['nomic', 'qwen3', 'bge-m3'],
         description: 'Embedding model: bge-m3 (default, multilingual Thai↔EN, 1024-dim), nomic (fast, 768-dim), or qwen3 (cross-language, 4096-dim)',
+      },
+      include_superseded: {
+        type: 'boolean',
+        description: 'Include superseded documents in results (default: false). Set true for audit trail or history review.',
+        default: false
       }
     },
     required: ['query']
@@ -71,7 +76,7 @@ export const searchToolDef = {
  */
 export function sanitizeFtsQuery(query: string): string {
   let sanitized = query
-    .replace(/[?*+\-()^~"':.\/]/g, ' ')
+    .replace(/[?*+\-()^~"':.\/%]/g, ' ')
     .replace(/\s+/g, ' ')
     .trim();
 
@@ -309,7 +314,7 @@ export function combineResults(
 
 export async function handleSearch(ctx: ToolContext, input: OracleSearchInput): Promise<ToolResponse> {
   const startTime = Date.now();
-  const { query, type = 'all', limit = 5, offset = 0, mode = 'hybrid', project, cwd, model } = input;
+  const { query, type = 'all', limit = 5, offset = 0, mode = 'hybrid', project, cwd, model, include_superseded = false } = input;
 
   if (!query || query.trim().length === 0) {
     throw new Error('Query cannot be empty');
@@ -327,6 +332,15 @@ export async function handleSearch(ctx: ToolContext, input: OracleSearchInput):
     : '';
   const projectParams = resolvedProject ? [resolvedProject] : [];
 
+  // TTL filter: exclude expired documents (Issue #4)
+  const nowMs = Date.now();
+  const ttlFilter = 'AND (d.expires_at IS NULL OR d.expires_at > ?)';
+  const ttlParams = [nowMs];
+
+  // Supersede filter: exclude superseded documents by default (Issue #7)
+  const supersedeFilter = include_superseded ? '' : 'AND d.superseded_by IS NULL';
+
+
   let warning: string | undefined;
   let vectorSearchError = false;
 
@@ -338,21 +352,21 @@ export async function handleSearch(ctx: ToolContext, input: OracleSearchInput):
         SELECT f.id, f.content, d.type, d.source_file, d.concepts, rank
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? ${projectFilter}
+        WHERE oracle_fts MATCH ? ${projectFilter} ${ttlFilter} ${supersedeFilter}
         ORDER BY rank
         LIMIT ?
       `);
-      ftsRawResults = stmt.all(safeQuery, ...projectParams, limit * 2);
+      ftsRawResults = stmt.all(safeQuery, ...projectParams, ...ttlParams, limit * 2);
     } else {
       const stmt = ctx.sqlite.prepare(`
         SELECT f.id, f.content, d.type, d.source_file, d.concepts, rank
         FROM oracle_fts f
         JOIN oracle_documents d ON f.id = d.id
-        WHERE oracle_fts MATCH ? AND d.type = ? ${projectFilter}
+        WHERE oracle_fts MATCH ? AND d.type = ? ${projectFilter} ${ttlFilter} ${supersedeFilter}
         ORDER BY rank
         LIMIT ?
       `);
-      ftsRawResults = stmt.all(safeQuery, type, ...projectParams, limit * 2);
+      ftsRawResults = stmt.all(safeQuery, type, ...projectParams, ...ttlParams, limit * 2);
     }
   }
 
@@ -391,8 +405,30 @@ export async function handleSearch(ctx: ToolContext, input: OracleSearchInput):
   }));
 
   const combinedResults = combineResults(ftsResults, normalizedVectorResults);
-  const totalMatches = combinedResults.length;
-  const results = combinedResults.slice(offset, offset + limit);
+
+  // Post-filter: remove expired + superseded docs from vector results (FTS already filtered via SQL)
+  const excludeIds = new Set<string>();
+  if (normalizedVectorResults.length > 0) {
+    const ids = combinedResults.map(r => r.id);
+    if (ids.length > 0) {
+      const placeholders = ids.map(() => '?').join(',');
+      const conditions = ['(expires_at IS NOT NULL AND expires_at <= ?)'];
+      const params: any[] = [...ids, nowMs];
+      if (!include_superseded) {
+        conditions.push('(superseded_by IS NOT NULL)');
+      }
+      const excludeRows = ctx.sqlite.prepare(
+        `SELECT id FROM oracle_documents WHERE id IN (${placeholders}) AND (${conditions.join(' OR ')})`
+      ).all(...params) as { id: string }[];
+      for (const row of excludeRows) excludeIds.add(row.id);
+    }
+  }
+  const filteredResults = excludeIds.size > 0
+    ? combinedResults.filter(r => !excludeIds.has(r.id))
+    : combinedResults;
+
+  const totalMatches = filteredResults.length;
+  const results = filteredResults.slice(offset, offset + limit);
 
   const ftsCount = results.filter((r) => r.source === 'fts').length;
   const vectorCount = results.filter((r) => r.source === 'vector').length;
diff --git a/src/tools/types.ts b/src/tools/types.ts
index cd13a5e6..d129a618 100644
--- a/src/tools/types.ts
+++ b/src/tools/types.ts
@@ -38,6 +38,7 @@ export interface OracleSearchInput {
   project?: string;
   cwd?: string;
   model?: 'nomic' | 'qwen3' | 'bge-m3';
+  include_superseded?: boolean; // default false — set true for audit trail
 }
 
 export interface OracleReflectInput {}
@@ -47,6 +48,7 @@ export interface OracleLearnInput {
   source?: string;
   concepts?: string[];
   project?: string;
+  ttl?: string; // e.g. "7d", "14d", "30d" — parsed to days
 }
 
 export interface OracleListInput {
diff --git a/src/types.ts b/src/types.ts
index 22bb52c9..ec263e6e 100644
--- a/src/types.ts
+++ b/src/types.ts
@@ -120,7 +120,6 @@ export interface HybridSearchOptions {
 export interface IndexerConfig {
   repoRoot: string;
   dbPath: string;
-  chromaPath: string;
   sourcePaths: {
     resonance: string;
     learnings: string;
diff --git a/src/vector/factory.ts b/src/vector/factory.ts
index abcc9280..e4737b36 100644
--- a/src/vector/factory.ts
+++ b/src/vector/factory.ts
@@ -167,7 +167,8 @@ const modelStoreCache = new Map<string, VectorStoreAdapter>();
 
 /**
  * Get a vector store for a specific embedding model.
- * Uses LanceDB + Ollama. Caches instances by model key.
+ * Respects ORACLE_VECTOR_DB and ORACLE_EMBEDDING_PROVIDER env vars.
+ * Falls back to LanceDB + Ollama when env vars are not set.
  */
 const connectPromises = new Map<string, Promise<void>>();
 
@@ -177,12 +178,18 @@ export function getVectorStoreByModel(model?: string): VectorStoreAdapter {
   let store = modelStoreCache.get(key);
   if (!store) {
     const preset = models[key];
+    const dbType = (process.env.ORACLE_VECTOR_DB as VectorDBType) || 'lancedb';
+    const embedProvider = (process.env.ORACLE_EMBEDDING_PROVIDER as EmbeddingProviderType) || 'ollama';
+    // When using OpenAI embeddings, use text-embedding-3-small instead of local model names
+    const embedModel = embedProvider === 'openai'
+      ? (process.env.ORACLE_EMBEDDING_MODEL || 'text-embedding-3-small')
+      : preset.model;
     store = createVectorStore({
-      type: 'lancedb',
+      type: dbType,
       collectionName: preset.collection,
-      embeddingProvider: 'ollama',
-      embeddingModel: preset.model,
-      ...(preset.dataPath && { dataPath: preset.dataPath }),
+      embeddingProvider: embedProvider,
+      embeddingModel: embedModel,
+      ...(dbType === 'lancedb' && preset.dataPath && { dataPath: preset.dataPath }),
     });
     modelStoreCache.set(key, store);
     // Auto-connect in background (non-blocking)
```
