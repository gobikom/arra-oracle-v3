---
pr: 82
branch: "fix/1010-supersede-twin-rows"
extracted: 2026-08-07T12:00:00Z
files_changed: 1
---

# PR Review Context: #82 — fix: propagate supersede to indexer twin rows

## PR Metadata
- **Author**: gobikom
- **Branch**: fix/1010-supersede-twin-rows → main
- **State**: OPEN
- **Size**: +25/-4 across 1 file

## Project Guidelines
- Oracle v3 knowledge base — Drizzle ORM + SQLite (better-sqlite3)
- "Nothing is Deleted" philosophy — documents are marked superseded, never removed
- MCP tool handlers in src/tools/, HTTP routes in src/routes/

## Changed Files
src/tools/supersede.ts

## PR Diff
```diff
--- a/src/tools/supersede.ts
+++ b/src/tools/supersede.ts
@@ -5,7 +5,7 @@
-import { eq } from 'drizzle-orm';
+import { eq, and, ne, isNull } from 'drizzle-orm';
 import { oracleDocuments } from '../db/schema.ts';
 import type { ToolContext, ToolResponse, OracleSupersededInput } from './types.ts';

@@ -36,7 +36,11 @@ export async function handleSupersede(ctx: ToolContext, input: OracleSupersededI
-  const oldDoc = ctx.db.select({ id: oracleDocuments.id, type: oracleDocuments.type })
+  const oldDoc = ctx.db.select({
+      id: oracleDocuments.id,
+      type: oracleDocuments.type,
+      sourceFile: oracleDocuments.sourceFile,
+    })
     .from(oracleDocuments)
     .where(eq(oracleDocuments.id, oldId))
     .get();
@@ -48,6 +52,7 @@ export async function handleSupersede(ctx: ToolContext, input: OracleSupersededI
+  // Mark the canonical row
   ctx.db.update(oracleDocuments)
     .set({
       supersededBy: newId,
@@ -57,7 +62,22 @@ export async function handleSupersede(ctx: ToolContext, input: OracleSupersededI
-  console.error(`[MCP:SUPERSEDE] ${oldId} → superseded by → ${newId}`);
+  // Propagate to all twin rows sharing the same source_file (indexer chunks)
+  const twinResult = ctx.db.update(oracleDocuments)
+    .set({
+      supersededBy: newId,
+      supersededAt: now,
+      supersededReason: reason || null,
+    })
+    .where(and(
+      eq(oracleDocuments.sourceFile, oldDoc.sourceFile),
+      ne(oracleDocuments.id, oldId),
+      isNull(oracleDocuments.supersededBy),
+    ))
+    .run();
+
+  const twinCount = twinResult.changes;
+  console.error(`[MCP:SUPERSEDE] ${oldId} → superseded by → ${newId} (${twinCount} twin rows propagated)`);

   return {
     content: [{
@@ -70,7 +90,8 @@ export async function handleSupersede(ctx: ToolContext, input: OracleSupersededI
-        message: `"${oldId}" is now marked as superseded by "${newId}". It will still appear in searches with a warning.`
+        twin_rows_propagated: twinCount,
+        message: `"${oldId}" is now marked as superseded by "${newId}". ${twinCount} twin rows also marked. It will still appear in searches with a warning.`
       }, null, 2)
     }]
   };
```

## Schema Context (oracle_documents table)
```typescript
export const oracleDocuments = sqliteTable('oracle_documents', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  sourceFile: text('source_file').notNull(),
  concepts: text('concepts').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  indexedAt: integer('indexed_at').notNull(),
  supersededBy: text('superseded_by'),
  supersededAt: integer('superseded_at'),
  supersededReason: text('superseded_reason'),
  expiresAt: integer('expires_at'),
  ttlDays: integer('ttl_days'),
  origin: text('origin'),
  project: text('project'),
  createdBy: text('created_by'),  // 'indexer' | 'arra_learn' | 'manual'
});
```

## Implementation Context
Bug: When arra_supersede marks a canonical entry (created_by='arra_learn'), the indexer twin rows (created_by='indexer') sharing the same source_file are not marked. 737 live rows serve superseded knowledge.
Fix: After marking the canonical row by id, also UPDATE all rows with the same source_file that haven't been superseded yet.
