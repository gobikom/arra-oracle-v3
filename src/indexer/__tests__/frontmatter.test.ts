import { describe, expect, test } from 'bun:test';
import { parseFrontmatterTags } from '../frontmatter.ts';

/**
 * Regression tests for the bare-'[' concept artifact (#124).
 *
 * Historical defect: the old regex `^tags:\s*\[?([^\]\n]+)\]?` could not cross
 * newlines, so multi-line flow-style frontmatter backtracked to a capture of a
 * single bare `[`, which then flowed into oracle_documents.concepts and
 * polluted 1,524 rows (603 live) with a junk `[` concept.
 */
describe('parseFrontmatterTags', () => {
  test('multi-line flow style with quoted values (the #124 producer)', () => {
    const content = [
      '---',
      'title: "[score-output] identity drift audit"',
      'tags: [',
      '  "score-output",',
      '  "identity-drift"',
      ']',
      'created: 2026-10-05',
      '---',
      '',
      'body',
    ].join('\n');
    const tags = parseFrontmatterTags(content);
    expect(tags).toEqual(['score-output', 'identity-drift']);
    expect(tags).not.toContain('[');
  });

  test('multi-line flow style with trailing comma', () => {
    const content = '---\ntitle: t\ntags: [\n  "a",\n  "b",\n]\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual(['a', 'b']);
  });

  test('bracket-leading title does not leak into tags', () => {
    // Title contains brackets; tags are unquoted multi-line — neither may
    // produce a bare '[' / ']' concept.
    const content = '---\ntitle: "[RESOLVED] fix the thing"\ntags: [\n  resolved,\n  parser\n]\n---\nb';
    const tags = parseFrontmatterTags(content);
    expect(tags).toEqual(['resolved', 'parser']);
    expect(tags.some((t) => t.includes('[') || t.includes(']'))).toBe(false);
  });

  test('single-line bracket style still parses', () => {
    const content = '---\ntitle: t\ntags: [a, b, c]\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual(['a', 'b', 'c']);
  });

  test('single-line bracket style with quoted values', () => {
    const content = '---\ntitle: t\ntags: ["a", \'b\']\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual(['a', 'b']);
  });

  test('unbracketed style still parses', () => {
    const content = '---\ntitle: t\ntags: a, b\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual(['a', 'b']);
  });

  test('empty flow list yields no tags', () => {
    const content = '---\ntitle: t\ntags: []\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual([]);
  });

  test('no tags key yields no tags', () => {
    const content = '---\ntitle: t\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual([]);
  });

  test('bare "[" or "]" fragments are never emitted', () => {
    // Pathological junk YAML: flow-match consumes "[, a, ]" as one list; the
    // essential property is that no bare bracket fragment ever surfaces.
    const content = '---\ntitle: t\ntags: [, a, ], b\n---\nb';
    const tags = parseFrontmatterTags(content);
    expect(tags).not.toContain('[');
    expect(tags).not.toContain(']');
    expect(tags.every((t) => t.length > 0)).toBe(true);
  });
});
