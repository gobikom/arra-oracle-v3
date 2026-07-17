---
title: Clienta.ai
type: wiki
status: active
updated: 2026-07-17
oracle_entries: 74
sources:
  - https://github.com/gobikom/clienta.ai
project: github.com/gobikom/clienta.ai
tags: [wiki, clienta-ai]
---



# Clienta.ai

## Code Structure (auto — CK, refreshed 2026-06-30)

- packages/api: 118 classes, 854 functions, 127 interfaces, 104 types
- packages/web: 9 classes, 789 functions, 125 interfaces, 57 types, 3 variables
- packages/contracts: 7 functions, 88 interfaces, 38 types
- packages/widget: 1 class, 86 functions, 23 interfaces, 7 types
- packages/docs: 39 functions, 8 interfaces, 29 types
- packages/landing: 2 classes, 33 functions, 13 interfaces, 6 types
- .claude/PRPs: 34 functions
- scripts: 10 functions
- old-prp-commands/scripts: 5 functions

## Entry Points (auto — CK)

- emailLayout `function emailLayout(content: string, options?: { preheader?: string }): string` — packages/api/src/lib/email-layout.ts (27 connections)
- widgetFrame `function widgetFrame(page: Page)` — packages/web/e2e/menu-coverage/_widget-helpers.ts (24 connections)
- emailButton `function emailButton(text: string, url: string): string` — packages/api/src/lib/email-layout.ts (22 connections)
- escapeHtml `function escapeHtml(unsafe: string): string` — packages/api/src/lib/email-layout.ts (21 connections)
- emailNote `function emailNote(text: string): string` — packages/api/src/lib/email-layout.ts (20 connections)
- logPartnerEvent `async function logPartnerEvent(params: { partnerId?: string; organizationId?: string; action: PartnerAuditAction; actor: string; actorType: string; details: Record<string, unknown>; request?: FastifyRequest; }): Promise<void` — packages/api/src/modules/partner/audit-logger.ts (20 connections)
- logBillingEvent `async function logBillingEvent(params: { organizationId: string; action: BillingAction; actor: string; actorType: BillingActorType; details: Record<string, unknown>; request?: FastifyRequest; }): Promise<void` — packages/api/src/modules/billing/audit-logger.ts (16 connections)
- BillingTab `function BillingTab()` — packages/web/src/components/organization/billing-tab.tsx (15 connections)
- main `def main() -> None` — .claude/PRPs/scripts/prp_workflow_enhanced.py (14 connections)
- emailGreeting `function emailGreeting(name: string): string` — packages/api/src/lib/email-layout.ts (13 connections)

## Hotspots (auto — CK)

- `dependencies` — 256 connections, change_freq=0
- `packages/api/src/modules/shared/repository-logger.ts` — 232 connections, change_freq=0
- `dependencies` — 149 connections, change_freq=0
- `dependencies` — 117 connections, change_freq=0
- `packages/api/src/config/database.ts` — 103 connections, change_freq=0

## Overview

AI chatbot and voicebot SaaS platform targeting Thai SMBs. Features multi-channel customer service (web widget, LINE, Facebook), RAG-powered knowledge base, and real-time admin dashboard. Built as a pnpm monorepo with Fastify API, Next.js 14 web app, and Astro 5 landing page. Deployed across Railway (API), Vercel (web/landing), Supabase (PostgreSQL + pgvector), and Cloudflare R2 (file storage).

## Architecture

```
clienta.ai (pnpm monorepo)
├── packages/api/        # Fastify backend (Railway, Dockerfile multi-stage)
│   ├── services/       # RAG, chat, embedding, rerank, query-rewrite
│   ├── routes/         # REST + WebSocket (widget + admin)
│   └── prisma/         # Schema + migrations (Supabase PostgreSQL)
├── packages/web/        # Next.js 14 admin dashboard (Vercel)
├── packages/landing/    # Astro 5 marketing site (Vercel)
├── packages/contracts/  # Shared types (TypeScript)
└── packages/widget/     # Embeddable chat widget
```

**RAG Pipeline (5-stage, all fail-open):**
```
User message → queryRewrite (OpenAI, 2 calls)
  → embed (text-embedding-3-small, 1536d, Redis-cached 1hr)
  → hybrid search (pgvector cosine + Postgres FTS tsvector, RRF k=60)
  → multi-query fan-out (parallel variant searches, deduplicate)
  → rerank (Cohere rerank-multilingual-v3.0, 2s timeout)
  → model selection (dual threshold: 0.9 cosine / 0.7 rerank)
  → streaming response (OpenAI)
```

**Feature flags** (all default true): RAG_QUERY_REWRITE, RAG_HYBRID_SEARCH, RAG_MULTI_QUERY, RAG_RERANK, RAG_CONTEXTUAL_HEADERS. Each is fail-open — degrades gracefully if the upstream service fails.

**Hosting:**

| Component | Platform | Deploy |
|-----------|----------|--------|
| API | Railway (Dockerfile) | Auto on push to main (packages/api/**) |
| Web | Vercel | Auto on push to main |
| Landing | Vercel | Manual workflow_dispatch |
| UAT | Railway (ghcr.io/gobikom/clienta-base) | Manual workflow_dispatch only (2026-05-16) |
| Database | Supabase PostgreSQL + pgvector | Direct URL for migrations (port 5432) |
| Redis | Railway private network | Embedding cache + BullMQ |
| Files | Cloudflare R2 | Knowledge base documents |

## Key Decisions

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Embedding model | OpenAI text-embedding-3-small (1536d) | Local models | Thai language quality, managed infra |
| Reranker | Cohere rerank-multilingual-v3.0 | Cross-encoder local | Thai support, 2s timeout fail-open |
| Search strategy | Hybrid (pgvector + Postgres FTS tsvector via RRF) | Vector-only | Better Thai keyword matching |
| Database | Supabase PostgreSQL + pgvector | Pinecone / Weaviate | Cost, Thai locale, integrated with auth |
| Monorepo | pnpm workspaces | Multi-repo | Shared types via packages/contracts |

## Known Issues

- Supabase pooler (port 6543, transaction mode) doesn't support Prisma advisory locks — migrations MUST use direct URL (port 5432)
- When adding new workspace packages that API depends on, MUST update Dockerfile to COPY both package.json (stage 1) and source files (stage 2)
- Railway API write access requires elevated permissions beyond what CLI login provides on non-interactive servers
- meeting-memory scope pivoted from clienta.ai batch worker to standalone tool (2026-04-07 decision)
- UAT auto-deploy removed (2026-05-16) — build-uat-images.yml is workflow_dispatch only. Runner queue congestion caused the change. Must trigger manually after merge for UAT verification.
- Stripe Checkout UI changed (2026-05-23) — iframe removed, card inputs now in direct DOM. Test selectors: getByPlaceholder for card number/expiry, getByLabel for CVC.
- Channel routing URL mismatch (2026-05-19) — /channels/web and /channels/line redirect to ?tab=web/?tab=line. Pages render correctly but URL routing is inconsistent.
- v1.3.5 Billing Cleanup shipped (2026-06-07) — currency persist, Omise removal, plan cancellation. 15 PRs, UAT 100%, staging 99.3%, prod 100%.
- v1.3.6 Pricing Consistency shipped (2026-06-07) — all pricing surfaces aligned with billing.ts. 7 plans, 17% discount, correct overage rates across landing, docs, billing tab, partner portal.
- v1.3.7 Stability & Partner Fixes shipped (2026-06-08) — invoice multi-plan (DB migration + 5-plan pipeline), dashboard stat cards, wholesalePlan fallback, Sonner toast fix, channels delete fix, flaky tests umbrella. 7 sub-PRs + 6 gate fix PRs. UAT 99.7%, staging 99.3%, prod 100%.
- [RESOLVED 2026-07-01] UAT web container OOM (384MB) — bumped to 1024MB (PR#1640). Widget specs excluded from blocking UAT gate via testIgnore (PR#1727).
- [RESOLVED 2026-07-01] E2E runner phantom-busy + shard timeout — unified concurrency groups, added shard concurrency, bumped setup timeouts (PR#1728).
- [RESOLVED 2026-07-01] agent_typing WS handler missing error feedback — added socket.send + fixed pino err key (PR#1727).
- **Production billing is WEBHOOK-ONLY** (verified 2026-07-08 audit) — subscription state written to app DB solely by Stripe webhook handler (`billing/webhook-handler.ts`); access gating reads that DB (`subscription-guard`/`feature-gate`), NOT live Stripe. No reconcile/poll fallback. Webhook URL: `https://api.clienta.ai/api/billing/webhook/stripe` (note `/stripe` suffix — route `POST /webhook/stripe` under `/api/billing` prefix). `STRIPE_WEBHOOK_SECRET` = whsec_ ASCII string used raw as HMAC key (do NOT decode).
- [RESOLVED 2026-07-08] Prod Stripe live webhook was UNREGISTERED for months (0 endpoints) despite `STRIPE_WEBHOOK_SECRET` set — customers could pay but subscriptions never activate. Caught by prod infra audit (#1860), registered + end-to-end verified. Lesson: always include "live webhook registered + signed-event test" in go-live.
- Migration cruft: 2 records recur as failed (`init_with_pgvector`, `fix_subscription_defaults`) but `migrate-database.yml` auto-resolves (`migrate resolve --rolled-back`) before `migrate deploy` — deploys succeed regardless. Not a blocker; hygiene cleanup pending.
- DB backups run via GH Action `backup-database.yml` (daily cron 2AM UTC → pg_dump pg17 → R2 `s3://clienta-backups/database/` + retention), NOT Supabase automated backups. `SUPABASE_ACCESS_TOKEN` expired (#1868) but does not affect backups.

- **v1.12.0 Prepaid Credits SHIPPED** (2026-07-13, PROD-GATE-ACK) — overage-only prepaid credit system. BigInt micro-unit balances, Stripe webhook top-up, reconciliation engine, kill switch (enforcement=true on prod). 17/17 ACs independently verified across 10 Vera QA passes. 13 PRs merged (#1995-#2017). Key components: `billing/usage-meter.ts` (admission routing), `billing/credit-repository.ts` (FOR-UPDATE ledger), `billing/reconciliation-service.ts` (4 invariant checks, hourly cron), `billing/webhook-handler.ts` (charge.refunded with explicit `stripe.refunds.list`), `billing/reconciliation-inspector.ts` (SELECT-only dashboard query), admin dashboard wallet tab. QA infrastructure: seed-qa-prepaid-states.ts (5 orgs with full entity graph), Playwright E2E prepaid tests, qa_readonly DB access.
- **Stripe webhook sub-object expansion** (v1.12.0 lesson): webhook payloads do NOT auto-expand sub-objects (refunds, line_items). MUST use explicit `stripe.refunds.list({ charge: id })`. Bug caught after 10 QA passes — `charge.refunds.data` was always `[]` in webhook despite refunds existing.
- **Widget bundle staleness** (v1.12.0 lesson): `packages/api/public/widget.js` was stale since v1.6.11 (Jun 27). Widget source changes don't auto-rebuild the bundle. CI gate added (#2009/#2012) to prevent recurrence.

- [RESOLVED 2026-07-17] **publicAuth empty-scopes 500** (#2043/#2052): default-deny guard treated `requiredScopes: []` same as `undefined` → 500 on all unmatched `/api/v1/*` paths. Fix: `!Array.isArray()` for misconfigured, `length === 0` for no-auth (PR #2053).
- [RESOLVED 2026-07-17] **ci-web e2e-smoke broken 33 days** (since Jun 14): `e2e-smoke` job missing `pnpm --filter contracts build` → Next.js can't resolve `@clienta/contracts` → Playwright timeout. Fix: add build step (PR #2054).
- [RESOLVED 2026-07-17] **idempotency lease-lost silent** (#2035): `.catch(() => false)` conflated DB errors with CAS lease-lost. Fix: try/catch to keep paths distinct (PR #2056).

- **Login response field name**: `/api/auth/login` response uses `token` field, NOT `accessToken`. Agents using `response.accessToken` get undefined (learned v1.14.0: staging curl misdiagnosed as "endpoint broken").
- **Staging test account mapping**: UAT/staging use `admin@qa-test.test` / `QaTest1234!` (from `packages/web/e2e/global-setup.ts`). `qa-test@clienta.ai` does NOT exist on staging DB — only on production (smoke test). Agent account: `agent@qa-test.test` / `QaTest1234!` (learned v1.14.0: wrong credentials caused 4h misdiagnosis).

- **v1.14.0 Trust Center Phase 2 SHIPPED** (2026-07-17) — in-app `/settings/security` dashboard. DPA management (status/sign/download/countersign), sub-processor list (9 items, `DPA_SUB_PROCESSORS` from contracts) + notification toggle, DSAR per-contact export (PDPA §31), account deletion UI (PDPA §33), security audit log, compliance documents. Admin-only (`requireAdmin` on all new routes). 14 ACs, 6 PRs (#2057 feature + #2058 bump + #2062 toggle fix + #2065 gate audit + #2066 plan-walk + #2068 smoke tests). Migration: `sub_processor_change_notify` Boolean on Organization. New API: `GET /api/settings/security`, `PATCH /api/settings/notifications`, `POST /api/settings/security/dpa/countersign`, `GET /api/legal/dpa/download`. Vera QA: UAT 9/9 + staging 9/9. E2E: staging 7/7. Follow-ups: #2067 (docs), #2069 (countersign toast UX), #2070 (DPA sign E2E).

## Patterns

- **Production Infra Health Audit** (2026-07-08): recurring, release-independent 9-section audit (`Docs/PRODUCTION_INFRA_HEALTH_AUDIT.md`, PR#1858) — health/SSL/env-parity/migrations/Stripe-live/monitoring/backup/OAuth. Catches drift between releases that one-time go-live checklists miss. Split by access: public/Vercel (any agent) vs Railway/Stripe/Supabase (devops). Monitoring verified via Grafana API (16 dashboards, 13 alert rules) + Sentry API.

- **Multi-stage Dockerfile**: 3 stages (deps → build → runtime). Critical to copy both package.json AND source for workspace packages.
- **Docker base image caching**: Pre-built base image `ghcr.io/gobikom/clienta-base` (node:20-alpine + pnpm@10 + all workspace node_modules, 1694 packages). Speeds up CI builds by caching dependency layer.
- **Fail-open RAG**: Every pipeline stage has a feature flag and graceful degradation path. No single upstream failure blocks chat.
- **Score mixing**: RAGContext tracks `rerankUsed: boolean` to apply correct threshold (0.7 rerank vs 0.9 cosine) for model routing.
- **Autonomous batch orchestration** (2026-05-23): delegate batch → verify diff → QA → next batch. 4 PRs in one session. Always verify issue claims against current code before closing.
- **WCAG 2.1 AA accessibility**: aria-live assertive for errors, aria-live polite for loading states, heading hierarchy h1/h2, aria-busy on action buttons, prose/link split pattern for secondary CTAs.
- **Reseller multi-plan wholesale pricing** (v1.3.6-v1.3.7): RESELLER_PLANS defines 5 tiers (growth/plus/pro/scale/enterprise). WHOLESALE_PRICING per plan. Dynamic volume discount via getVolumeDiscount(). Invoice service calculates per-plan amounts.
- **Gate-keeper orchestration** (v1.3.4+): PSak single-touch verify at phase boundaries, DevLead-Claude orchestrates full cycle. Validated 3 times (v1.3.4/v1.3.5/v1.3.6). Saves ~60% PSak cost vs full orchestration.

## See Also

- [oracle-v3](oracle-v3.md) — semantic search patterns inspired clienta.ai's hybrid search approach
