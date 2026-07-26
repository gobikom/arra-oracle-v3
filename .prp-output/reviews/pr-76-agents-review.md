# Multi-agent review — PR #76 (fix/960-indexer-dedup-superseded)

**Reviewed**: 2026-07-27
**Agents**: code-reviewer, security-reviewer, silent-failure-hunter (3/3 core)
**Verdict**: READY TO MERGE

Scope changed during review. The PR opened with 5 files; two Criticals landed on `src/scripts/dedup-indexer-twins.ts` and the script was cut entirely rather than patched. Final scope is 3 files: `src/indexer/storage.ts`, `src/indexer/index.ts`, `src/indexer-dedup-superseded.test.ts`.

### Critical Issues (0 unresolved)

Three Criticals were raised. All three were on the cleanup script, which is no longer in the PR.

- **security-reviewer — deleting SQLite rows does not remove a document from search; it makes it permanently unfilterable.** Vector hits are built entirely from the Qdrant payload (`search.ts:257-277`) and never join `oracle_documents`. The supersede/expiry filter is an *exclusion* query (`search.ts:412-424`) — a deleted row matches nothing, lands in no exclude set, and is returned. Fail-open by construction. Measured: 1,858 of 3,206 twins are live Qdrant points; 320 of those are superseded and correctly filtered *today*, and would have resurfaced with nothing able to suppress them again. Verified independently before accepting.
- **security-reviewer — the backup was not a backup.** `journal_mode=wal`, live WAL ~19.4 MB; `copyFileSync` takes only the main file and a size-equality check cannot detect the omission, because writes land in the WAL without changing main-file size. Reviewer measured a copy passing the size check while missing 3 committed rows. The documented restore would have dropped a stale main file beside a live WAL for SQLite to replay.
- **silent-failure-hunter — `--apply` crashed before doing anything.** `new Database(path, { readonly: false })` throws `SQLITE_MISUSE` on bun 1.3.10. Reproduced directly: `{readonly:false}`, `{readonly:false,create:false}` and `{create:false}` all throw; only `{readwrite:true, create:false}` works. The dry run took the readonly branch, so the one path that mattered had no coverage at all.

**Resolution**: the script was removed (commit `d76998a`), not patched. Correct cleanup needs Qdrant deletion in the same operation, `VACUUM INTO` for a WAL-consistent backup, counts taken inside the transaction, and the service stopped for the run — a different design, not a fix, and not something that should ride along with a one-line guard fix. Deferred to arra-oracle-v3#77 with every measured constraint recorded, including the finding that superseding rather than deleting is probably the right approach.

Also caught and preserved in #77: the predicate would have deleted 163 legitimately multi-chunked files (810 rows), and in **0 of 163** does the surviving arra_learn content cover what would be removed — one case keeps 6,726 chars and deletes 22,533. With this PR merged those files are excluded from indexing permanently, so the loss would have been unrecoverable.

### Important Issues (0 unresolved)

- **silent-failure-hunter — the skip counter had nowhere to go.** `skippedArraLearn` was incremented and only `console.log`'d — never returned, never persisted, never compared against anything. A refactor quietly reintroducing a lifecycle filter would have shown up only as a smaller number in a log nobody reads: the exact observability gap that let the original bug run six weeks.
  **Fixed** — `storeDocuments` now returns `StoreResult { indexed, skippedArraLearn }` and `index.ts` folds it into `setIndexingStatus`. This also fixed a live misreport: the old line logged `Indexed ${documents.length} documents`, counting skipped docs as indexed, so a guard that *stopped* skipping would have driven that number **up** while silently creating duplicates.

### Suggestions (0 unresolved)

- **code-reviewer (75% confidence, below the reporting bar, filed anyway)** — `_verified_orphan` is a one-way door. 2,317 arra_learn rows carry it and no code path clears it (`grep` returns two SET sites, one description, one log line; 0 rows have ever gone from orphaned back to live). After this PR, a file restored at such a path would never be re-indexed *and* stays excluded from default search — permanently invisible, no recovery. Verified independently; filed as arra-oracle-v3#78. Not a blocker: it needs a delete-then-restore at an identical path, and `arra_learn` never writes in place (`learn.ts` throws if the path exists).

### Independently verified by reviewers, not taken from the PR body

Every quantitative claim re-derived by query against the live DB:

| claim | result |
|---|---|
| 738 post-guard indexer rows | 738 ✓ |
| 730 of those on duplicated files | 730 ✓ |
| 296 with an arra_learn pair — all superseded | 296, 0 live ✓ |
| 442 with no pair | 442 ✓ |
| 3,206 twins / 2,559 files / 3,406 solo | exact ✓ |

- **Sabotage-checked by two reviewers independently.** Restoring `isNull(supersededBy)` fails exactly the 4 tests the docstring names. A third reviewer ran two further sabotages the author had not: returning an empty Set → 6/7 fail; returning every `source_file` regardless of `created_by` → 2/7 fail, caught by the two tests written for exactly that case. The suite is binding, not decorative.
- **Test binds to real source.** `storeDocuments` calls the exported `selectArraLearnOwnedFiles`; grep confirms one call site and no inline ownership query left behind.
- **No vector/SQLite divergence.** The `continue` on skip precedes the `ids`/`contents`/`metadatas` push, so a skipped doc never reaches the vector arrays either.
- **Removing the supersede filter is safe for the real path.** `learn.ts` writes a new date-stamped file per call and throws if it exists — files are never edited in place, so an old file's content genuinely never changes after being superseded.
- **Full suite**: 208 pass on branch vs 201 on `origin/main` — delta is exactly the +7 new tests. The 37 fail / 8 errors are pre-existing and identical on both (environment/service-dependent).
- **tsc**: 4 errors, byte-identical to the `origin/main` baseline, none in touched files.

### Process note

Three wrong artifacts preceded this one on the same investigation: a wrong root cause, wrong supporting figures, and a cleanup script that would have left the knowledge base worse than the bug. Each was caught by review, none by self-check. The generating error each time was the same shape — a check that can only return a plausible value never signals its own incompleteness. The dry run worked, so the script "worked".

**Summary: 0 critical / 0 important / 0 suggestion unresolved.**
Deferred with issues: arra-oracle-v3#77 (cleanup), arra-oracle-v3#78 (orphan one-way door).
