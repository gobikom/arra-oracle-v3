---
title: Clienta.ai
type: wiki
status: active
updated: 2026-05-24
oracle_entries: 54
sources:
  - https://github.com/gobikom/clienta.ai
project: github.com/gobikom/clienta.ai
tags: [wiki, clienta-ai]
---

# Clienta.ai

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

## Patterns

- **Multi-stage Dockerfile**: 3 stages (deps → build → runtime). Critical to copy both package.json AND source for workspace packages.
- **Docker base image caching**: Pre-built base image `ghcr.io/gobikom/clienta-base` (node:20-alpine + pnpm@10 + all workspace node_modules, 1694 packages). Speeds up CI builds by caching dependency layer.
- **Fail-open RAG**: Every pipeline stage has a feature flag and graceful degradation path. No single upstream failure blocks chat.
- **Score mixing**: RAGContext tracks `rerankUsed: boolean` to apply correct threshold (0.7 rerank vs 0.9 cosine) for model routing.
- **Autonomous batch orchestration** (2026-05-23): delegate batch → verify diff → QA → next batch. 4 PRs in one session. Always verify issue claims against current code before closing.
- **WCAG 2.1 AA accessibility**: aria-live assertive for errors, aria-live polite for loading states, heading hierarchy h1/h2, aria-busy on action buttons, prose/link split pattern for secondary CTAs.

## See Also

- [oracle-v3](oracle-v3.md) — semantic search patterns inspired clienta.ai's hybrid search approach
