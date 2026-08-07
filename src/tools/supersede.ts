/**
 * Oracle Supersede Handler
 *
 * Mark old documents as superseded by newer ones.
 * "Nothing is Deleted" — old doc preserved but marked outdated.
 */

import { eq, and, ne, isNull } from 'drizzle-orm';
import { oracleDocuments } from '../db/schema.ts';
import type { ToolContext, ToolResponse, OracleSupersededInput } from './types.ts';

export const supersedeToolDef = {
  name: 'arra_supersede',
  description: 'Mark an old learning/document as superseded by a newer one. Aligns with "Nothing is Deleted" - old doc preserved but marked outdated.',
  inputSchema: {
    type: 'object',
    properties: {
      oldId: {
        type: 'string',
        description: 'ID of the document being superseded (the outdated one)'
      },
      newId: {
        type: 'string',
        description: 'ID of the document that supersedes it (the current one)'
      },
      reason: {
        type: 'string',
        description: 'Why the old document is outdated (optional)'
      }
    },
    required: ['oldId', 'newId']
  }
};

export async function handleSupersede(ctx: ToolContext, input: OracleSupersededInput): Promise<ToolResponse> {
  const { oldId, newId, reason } = input;
  const now = Date.now();

  const oldDoc = ctx.db.select({
      id: oracleDocuments.id,
      type: oracleDocuments.type,
      sourceFile: oracleDocuments.sourceFile,
    })
    .from(oracleDocuments)
    .where(eq(oracleDocuments.id, oldId))
    .get();
  const newDoc = ctx.db.select({ id: oracleDocuments.id, type: oracleDocuments.type })
    .from(oracleDocuments)
    .where(eq(oracleDocuments.id, newId))
    .get();

  if (!oldDoc) throw new Error(`Old document not found: ${oldId}`);
  if (!newDoc) throw new Error(`New document not found: ${newId}`);

  if (!oldDoc.sourceFile) {
    throw new Error(`Old document has empty source_file: ${oldId} — refusing twin propagation`);
  }

  let twinCount = 0;

  // Wrap both UPDATEs in a transaction — partial commit would reproduce the
  // exact bug this fix exists to close (canonical marked, twins untouched).
  ctx.sqlite.exec('BEGIN');
  try {
    ctx.db.update(oracleDocuments)
      .set({
        supersededBy: newId,
        supersededAt: now,
        supersededReason: reason || null,
      })
      .where(eq(oracleDocuments.id, oldId))
      .run();

    const twinResult = ctx.db.update(oracleDocuments)
      .set({
        supersededBy: newId,
        supersededAt: now,
        supersededReason: reason || null,
      })
      .where(and(
        eq(oracleDocuments.sourceFile, oldDoc.sourceFile),
        ne(oracleDocuments.id, oldId),
        isNull(oracleDocuments.supersededBy),
      ))
      .run();

    twinCount = twinResult.changes;
    ctx.sqlite.exec('COMMIT');
  } catch (err) {
    ctx.sqlite.exec('ROLLBACK');
    console.error(`[MCP:SUPERSEDE] FAILED ${oldId} → ${newId}`, err);
    throw err;
  }

  console.error(`[MCP:SUPERSEDE] ${oldId} → superseded by → ${newId} (${twinCount} twin rows propagated)`);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        old_id: oldId,
        old_type: oldDoc.type,
        new_id: newId,
        new_type: newDoc.type,
        reason: reason || null,
        superseded_at: new Date(now).toISOString(),
        twin_rows_propagated: twinCount,
        message: `"${oldId}" is now marked as superseded by "${newId}". ${twinCount} twin rows also marked. It will still appear in searches with a warning.`
      }, null, 2)
    }]
  };
}
