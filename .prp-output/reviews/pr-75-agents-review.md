# Review — PR #75 wiki: oracle-v3 TTL known issue

**Reviewed**: 2026-07-26 · **Rounds**: 3 · **Agent**: code-reviewer (docs-only, single-agent per protocol)
**Verdict**: READY TO MERGE

### Critical Issues (0 unresolved)

Round 1 rejected the entry outright: it claimed "TTL never enforced on read", but
`src/tools/list.ts:55,73,81` and `src/tools/search.ts:338` already apply
`(expires_at IS NULL OR expires_at > ?)`, shipped `6d5adcc` 2026-04-07 and live.
Acting on that text would have meant re-adding a filter that exists. **Rewritten** —
root cause is now duplicate indexing: `storeDocuments()` omits `expiresAt`/`ttlDays`
from both its `.values()` and `.onConflictDoUpdate()` payloads, so indexer rows are
`NULL` and never expire. Re-verified round 3 by reading the function.

### Important Issues (0 unresolved)

Round 2 found four, all reproduced by the reviewer's own queries and all fixed:

1. **"9,057 arra_learn rows"** — was `13,198 − 4,141`, arithmetic assuming two buckets.
   There are **three**: `arra_learn` 6,587, `indexer`/`learning_ψ/…` 4,141,
   `indexer`/`retro_HH.MM_…` 2,471. Overcounted by ~38%. Round 3 confirmed all three
   exact and that no fourth bucket exists (`idxOther`=0).
2. **`arra_stats expired=3756`** — `grep expired src/tools/stats.ts` = 0. It comes from
   `arra_list` (`list.ts:62-63,103`). Attribution corrected; line numbers re-verified.
3. **"3,001 files with 2 rows"** — range is **2–15**, and **442** of the 3,001 have no
   `arra_learn` row at all (legitimate multi-chunk retro indexing, a different thing).
   Affected subset is **~2,559**. Corrected on the page *and* in `wiki/log.md`.
4. **"one-off `backfill-ttl.ts` run"** — the script cannot touch these rows. Line 38's
   `/^learning_\d{4}-\d{2}-\d{2}_/` never matches `learning_ψ/…`, so slugPart stays a
   full path and no anchored pattern fires. Reviewer simulated it against 5 real rows,
   including one whose slug starts `score-output-` — zero matches. Now written as a
   prerequisite to extend, not an action to take.

Round 3 raised one more — the table's three buckets sum to 13,199 against a printed
total of 13,198, because the figures were captured across queries seconds apart on a
continuously-written DB. **Fixed**: the caveat now states the table is a snapshot, not
an identity, shows the arithmetic explicitly, and says how to re-derive a self-consistent
set (total + `GROUP BY created_by` in one query on one connection).

### Suggestions (0)

### Independently verified in round 3

Every figure re-derived by the reviewer against `~/.arra-oracle-v2/oracle.db`, not
accepted from the text: 6,587 / 4,141 / 2,471 exact; 4,141-of-4,141 `expires_at IS NULL`
with zero exceptions; multi-row files 3,001 with range 2–15; 442 zero-arra_learn; the
worked duplicate pair queried directly rather than taken as illustration; `list.ts` and
`search.ts` filter line numbers matched by grep; `expire-learnings.ts` confirmed to
process only non-NULL `expires_at`; no expire job in `cron-registry.yaml` or `crontab -l`.

The two sentences that restate the old wrong claims were checked to read unambiguously
as corrections — both are negated within the same sentence.

### Process note

Wrong figures were published twice on this page before landing, both caught by review
and neither by the author. The generating error in round 2 was deriving a population by
subtracting a known bucket from a total instead of grouping and counting. Recorded as a
lesson rather than left implicit.

**Summary: 0 critical / 0 important / 0 suggestion.**
