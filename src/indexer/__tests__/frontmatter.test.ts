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

describe('parseFrontmatterTags — merger-bot review findings (#126)', () => {
  test('unclosed flow list degrades to single-line; later "]" in a title is not swallowed', () => {
    const content = '---\ntitle: t\ntags: [a, b\ntitle2: "[x]"\n---\nb';
    // flow match must FAIL (newline followed by key-like line), then the
    // single-line fallback captures "[a, b" -> strip bracket -> [a, b]
    expect(parseFrontmatterTags(content)).toEqual(['a', 'b']);
  });

  test('block-style list yields no tags (pinned behavior change)', () => {
    // Historical parser emitted junk concept "- a" here; now: no tags.
    // Documented in PR #126; proper block-style support is follow-up scope.
    const content = '---\ntitle: t\ntags:\n  - a\n  - b\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual([]);
  });

  test('multi-line flow list still parses when items are key-like on their own lines', () => {
    const content = '---\ntitle: t\ntags: [\n  score-output,\n  identity-drift\n]\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual(['score-output', 'identity-drift']);
  });
});

describe('parseFrontmatterTags — multi-agent review round 2 (#126)', () => {
  test('next-line flow style "tags:\\n  [a, b]" parses (round-2 finding 1)', () => {
    const content = '---\ntitle: t\ntags:\n  [a, b]\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual(['a', 'b']);
  });

  test('single-line flow with colon-bearing tags still parses (pinned)', () => {
    // e.g. real vault style: tags: [infra-health, agent:devops]
    const content = '---\ntitle: t\ntags: [infra-health, agent:devops]\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual(['infra-health', 'agent:devops']);
  });
});

describe('parseFrontmatterTags — vera-claude silent-failure round (#126)', () => {
  test('unclosed flow + prose + later "]" never swallows prose (finding 3)', () => {
    const content = '---\ntitle: t\ntags: [a, b\nsome prose here\n]\n---\nb';
    expect(parseFrontmatterTags(content)).toEqual(['a', 'b']);
  });

  test('multi-line flow with bracket inside item degrades to line 1, no bare bracket (finding 1)', () => {
    const content = '---\ntitle: t\ntags: [\n  "[a]",\n  b\n]\n---\nb';
    // flow capture contains a bracket char -> flowMatch fails -> line fallback
    // captures "[" -> stripped/filtered -> []; must never emit bare brackets.
    const tags = parseFrontmatterTags(content);
    expect(tags.every((t) => !t.includes('[') && !t.includes(']'))).toBe(true);
  });
});
