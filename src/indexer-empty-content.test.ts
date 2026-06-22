/**
 * Empty-content skip tests — agent-devops task at-90a5c857bff4
 *
 * Regression: 0-byte learning files produced docs with empty content that
 * the OpenAI embedding API rejects ("input cannot be an empty string"),
 * aborting the whole 100-doc vector batch and causing sqlite<->vector drift.
 * Fix: parser skips empty files; storage skips empty content from vector batch.
 */

import { describe, it, expect } from 'bun:test';
import { parseLearningFile } from './indexer/parser.ts';

describe('parseLearningFile — empty content handling', () => {
  it('returns no documents for an empty file (0 bytes)', () => {
    const docs = parseLearningFile('2026-05-15_empty.md', '', undefined);
    expect(docs).toHaveLength(0);
  });

  it('returns no documents for a whitespace-only file', () => {
    const docs = parseLearningFile('ws.md', '   \n\n  \t  \n', undefined);
    expect(docs).toHaveLength(0);
  });

  it('still parses a normal file with content', () => {
    const content = `---
title: Real Learning
---
## Lesson
This is a meaningful body that exceeds the empty-content guard.`;
    const docs = parseLearningFile('real.md', content, undefined);
    expect(docs.length).toBeGreaterThan(0);
    for (const d of docs) {
      expect(d.content.trim().length).toBeGreaterThan(0);
    }
  });

  it('never emits a document with empty/whitespace content', () => {
    // Mixed input: empty + valid. The empty fallback path must be skipped.
    const docs = parseLearningFile('mixed.md', '   ', undefined);
    for (const d of docs) {
      expect(d.content.trim().length).toBeGreaterThan(0);
    }
  });
});
