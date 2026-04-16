import { describe, test, expect } from 'bun:test';
import { randomBytes } from 'node:crypto';

describe('MCP Bearer HMAC key', () => {
  test('randomBytes(32) produces non-zero output', () => {
    const key = randomBytes(32);
    expect(key.every((b) => b === 0)).toBe(false);
  });

  test('two calls produce different keys', () => {
    expect(randomBytes(32).equals(randomBytes(32))).toBe(false);
  });
});
