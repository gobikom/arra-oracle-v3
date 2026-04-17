---
pr: 27
branch: "fix/qdrant-retry-resilience"
extracted: 2026-04-15T20:00:00+07:00
files_changed: 2
---

# PR Review Context: #27 — fix: Qdrant search retry on transient errors + improved error logging

## PR Metadata
- **Author**: gobikom
- **Branch**: fix/qdrant-retry-resilience → main
- **State**: OPEN
- **Size**: +30/-4 across 2 files

## Changed Files
- src/server/handlers.ts
- src/vector/adapters/qdrant.ts

## PR Description
- Add retry-once (500ms delay) in QdrantAdapter.query() for transient Qdrant Cloud errors
- Improve Vector Search Error logging with partial stack trace for easier debugging
- Part of W17 MCP resilience effort. Oracle v3 had 0.3% vector search error rate (2/598 searches)

## PR Diff

```diff
diff --git a/src/server/handlers.ts b/src/server/handlers.ts
index e16dddff..a511d5ee 100644
--- a/src/server/handlers.ts
+++ b/src/server/handlers.ts
@@ -183,8 +183,10 @@ export async function handleSearch(
       if (result.status === 'fulfilled') {
         vectorResults.push(...result.value);
       } else {
-        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
-        console.error('[Vector Search Error]', msg);
+        const err = result.reason;
+        const msg = err instanceof Error ? err.message : String(err);
+        const stack = err instanceof Error && err.stack ? `\n  ${err.stack.split('\n').slice(1, 3).join('\n  ')}` : '';
+        console.error(`[Vector Search Error] ${msg}${stack}`);
         if (!warning) warning = `Vector search error: ${msg}`;
       }
     }
diff --git a/src/vector/adapters/qdrant.ts b/src/vector/adapters/qdrant.ts
index b807f3d6..fce54b36 100644
--- a/src/vector/adapters/qdrant.ts
+++ b/src/vector/adapters/qdrant.ts
@@ -92,6 +92,30 @@ export class QdrantAdapter implements VectorStoreAdapter {
     console.log(`[Qdrant] Added ${docs.length} documents`);
   }
 
+  private static readonly RETRY_DELAY_MS = 500;
+
+  /**
+   * Search with a single retry on transient errors (network blips, Qdrant Cloud 400/5xx).
+   * Used by both query() and queryById() to ensure consistent resilience.
+   */
+  private async searchWithRetry(params: Record<string, any>): Promise<any[]> {
+    try {
+      return await this.client.search(this.collectionName, params);
+    } catch (err: unknown) {
+      const msg = err instanceof Error ? err.message : String(err);
+      console.warn(`[Qdrant] Search failed (attempt 1/2): ${msg} — retrying in ${QdrantAdapter.RETRY_DELAY_MS}ms`);
+      await new Promise(r => setTimeout(r, QdrantAdapter.RETRY_DELAY_MS));
+      try {
+        const results = await this.client.search(this.collectionName, params);
+        console.log('[Qdrant] Search retry succeeded');
+        return results;
+      } catch (retryErr: unknown) {
+        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
+        throw new Error(`Qdrant search failed after retry: ${retryMsg}`, { cause: retryErr });
+      }
+    }
+  }
+
   async query(text: string, limit: number = 10, where?: Record<string, any>): Promise<VectorQueryResult> {
     if (!this.client) throw new Error('Qdrant not connected');
 
@@ -104,7 +128,7 @@ export class QdrantAdapter implements VectorStoreAdapter {
       })),
     } : undefined;
 
-    const results = await this.client.search(this.collectionName, {
+    const results = await this.searchWithRetry({
       vector: queryEmbedding,
       limit,
       with_payload: true,
@@ -138,7 +162,7 @@ export class QdrantAdapter implements VectorStoreAdapter {
     }
 
     const vector = points[0].vector;
-    const results = await this.client.search(this.collectionName, {
+    const results = await this.searchWithRetry({
       vector,
       limit: nResults + 1,
       with_payload: true,
```

## Project Guidelines
- TypeScript with Bun runtime
- Oracle v3 knowledge base with Qdrant vector DB
- Surgical modifications only — targeted, not wholesale
