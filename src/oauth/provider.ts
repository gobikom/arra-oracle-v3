/**
 * OAuth 2.1 Provider for Oracle v3
 *
 * PIN-based authorization server. Mirrors PSak Soul MCP oauth_provider.py.
 * Supports dynamic client registration (RFC 7591), PKCE (S256), and
 * 30-day access tokens. State persists to ORACLE_DATA_DIR/.oauth-state.json.
 *
 * Design decisions:
 * - No refresh tokens (30-day access tokens sufficient for personal server)
 * - Single PIN, single user (same as PSak)
 * - Atomic file writes for crash safety (temp file + rename)
 * - crypto.timingSafeEqual for PIN comparison to prevent timing attacks
 * - Server-side lockout for PIN brute-force protection (no trust in forwarded IP headers)
 */

import { randomBytes, createHash, createHmac, timingSafeEqual } from 'crypto';
import { writeFileSync, readFileSync, renameSync, existsSync, mkdirSync, chmodSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

import { MCP_OAUTH_PIN, MCP_EXTERNAL_URL, ORACLE_DATA_DIR, MCP_AUTH_TOKEN } from '../config.ts';
import type { OAuthState, OAuthClientInfo, OAuthTokenData, PendingAuthorization } from './types.ts';

export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Far-future sentinel used for static Bearer tokens (avoids Infinity, which is not JSON-serializable)
const STATIC_TOKEN_EXPIRES_AT = new Date('2100-01-01T00:00:00Z').getTime();

export interface AuthInfo {
  token: string;
  client_id: string;
  scopes: string[];
  expires_at: number;
}

/** Issued code data stored until token exchange */
interface IssuedCode {
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  code_challenge: string;
  resource?: string;
  issued_at: number;
}

/** Rate-limit window for the single-user PIN flow */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Thrown when a redirect_uri fails the allowlist check.
 * Caught by /register and mapped to HTTP 400 invalid_redirect_uri per RFC 6749.
 */
export class RedirectUriValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedirectUriValidationError';
  }
}

/**
 * RFC 8252-compliant redirect_uri allowlist. Rejects:
 *   - Non-HTTPS HTTP (except loopback: localhost, 127.0.0.1, ::1)
 *   - Non-HTTP(S) schemes (javascript:, data:, ftp:, file:, custom-scheme:, ...)
 *   - Malformed URIs (anything the URL constructor rejects)
 *
 * Allows:
 *   - https:// (any host)
 *   - http://localhost[:port][/path]
 *   - http://127.0.0.1[:port][/path]
 *   - http://[::1][:port][/path]
 *
 * Called at TWO enforcement points (defense in depth):
 *   1. OAuthProvider.registerClient — before persisting the client
 *   2. OAuthProvider.authorize — before redirecting (catches tampered/grandfathered state)
 */
export function validateRedirectUri(uri: string): void {
  if (typeof uri !== 'string' || uri.length === 0) {
    throw new RedirectUriValidationError('redirect_uri must be a non-empty string');
  }
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new RedirectUriValidationError(`redirect_uri is not a valid URL: ${uri}`);
  }
  if (parsed.protocol === 'https:') return;
  if (parsed.protocol === 'http:') {
    // WHATWG URL returns IPv6 hostnames WITH brackets (e.g. "[::1]"). Node
    // strips them in some versions, Bun preserves them — accept both shapes.
    const host = parsed.hostname;
    if (
      host === 'localhost'
      || host === '127.0.0.1'
      || host === '::1'
      || host === '[::1]'
    ) return;
    throw new RedirectUriValidationError(
      `redirect_uri scheme http:// only allowed for loopback (got host=${host})`,
    );
  }
  throw new RedirectUriValidationError(
    `redirect_uri scheme not allowed: ${parsed.protocol}`,
  );
}

/** Escape user-supplied strings for safe HTML interpolation */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export class OAuthProvider {
  private readonly stateFile: string;
  private state: OAuthState;
  // stateKey → pending auth (before PIN verification)
  private pendingAuthorizations: Map<string, PendingAuthorization> = new Map();
  // code → issued code data (after PIN verification, before token exchange)
  private issuedCodes: Map<string, IssuedCode> = new Map();

  // Single-user OAuth flow: shared lockout window cannot be bypassed with spoofed headers.
  private pinAttemptWindow: RateLimitRecord | null = null;

  // Per-process HMAC key for constant-time comparisons that must tolerate
  // varying input lengths. Secrecy is not required — its only job is to
  // give timingSafeEqual two equal-length digests so the compare runs
  // without leaking length via short-circuit behaviour. Matches the pattern
  // used in src/middleware/api-auth.ts (issue #12 Stage 2A).
  private readonly hmacKey: Buffer = randomBytes(32);

  // Consecutive-failure counter for the periodic sweep — lets us escalate
  // the log level on sustained failures (e.g., disk full) so operators
  // notice a real problem instead of dismissing a single repeated warning
  // as transient noise. Reset to 0 on any successful sweep.
  private sweepFailureCount = 0;

  // Set by loadState() when token-key migration runs. The constructor checks
  // this AFTER loadState returns and calls saveState() once to persist the
  // migrated shape. We cannot saveState() from inside loadState() because
  // this.state is not yet assigned — doing so would serialize `undefined`.
  private needsPostLoadSave = false;

  private static readonly MAX_PIN_ATTEMPTS = 10;
  private static readonly PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_PENDING_AUTHORIZATIONS = 100;

  constructor() {
    this.stateFile = join(ORACLE_DATA_DIR, '.oauth-state.json');
    this.state = this.loadState();
    // Persist migrated state immediately so a crash between now and the next
    // organic write does not re-trigger migration on restart. saveState()
    // throws on failure → eager-init pattern in server.ts catches it and
    // exits non-zero, giving the operator a loud signal instead of silent
    // "half-migrated" state (PR-B1 lesson).
    if (this.needsPostLoadSave) {
      this.saveState();
      this.needsPostLoadSave = false;
    }
    this.cleanExpiredTokens();

    // Periodic expiry sweep — the eviction logic in cleanExpiredTokens()
    // only runs on construction and on /authorize traffic. A server that
    // receives only token-verification traffic (common steady-state) would
    // never sweep abandoned issuedCodes, pending authorizations, or expired
    // tokens, defeating the memory-leak fix. Run every AUTH_CODE_TTL_MS
    // (5 min) so the worst-case memory footprint is bounded by that window
    // even under a long-running idle server.
    //
    // .unref() so the timer does NOT keep the Node event loop alive — the
    // process can still exit cleanly on SIGINT/SIGTERM. Test code that
    // wants to tick the sweep manually still has runExpirySweep().
    const sweepTimer = setInterval(() => {
      try {
        this.cleanExpiredTokens();
        this.sweepFailureCount = 0;
      } catch (err) {
        // Escalate after 3 consecutive failures — a single transient error
        // (e.g., a brief fs hiccup) logs as a warning, but a sustained
        // problem (disk full, permissions drift) escalates to error so an
        // operator watching logs can distinguish "noise" from "real".
        this.sweepFailureCount += 1;
        const level = this.sweepFailureCount >= 3 ? 'error' : 'warn';
        console[level](
          `[OAuth] Periodic expiry sweep failed (consecutive=${this.sweepFailureCount}):`,
          err,
        );
      }
    }, AUTH_CODE_TTL_MS);
    sweepTimer.unref();
  }

  // ─── State persistence ───────────────────────────────────────────────────

  private loadState(): OAuthState {
    if (!existsSync(this.stateFile)) {
      return { clients: {}, tokens: {}, tokenKeyVersion: 'sha256' };
    }
    try {
      const raw = readFileSync(this.stateFile, 'utf-8');
      const parsed = JSON.parse(raw) as OAuthState;

      // Defensive normalisation — an older state file or hand-edited file may
      // omit fields. We never THROW on missing shape here (operator may be
      // recovering from a backup); we just fill in defaults.
      if (!parsed.clients || typeof parsed.clients !== 'object') parsed.clients = {};
      if (!parsed.tokens || typeof parsed.tokens !== 'object') parsed.tokens = {};

      // Finding #17.4: warn on grandfathered invalid redirect_uris. Do NOT
      // delete or auto-migrate — operator must re-register. ("Nothing
      // deleted, only superseded.") Warnings are logged once at startup so
      // they surface in the usual log-scanning workflow.
      for (const [clientId, client] of Object.entries(parsed.clients)) {
        const uris = Array.isArray(client.redirect_uris) ? client.redirect_uris : [];
        for (const uri of uris) {
          try {
            validateRedirectUri(uri);
          } catch (vErr) {
            console.warn(
              `[OAuth] Grandfathered invalid redirect_uri for client=${clientId}: ${uri} — ${
                vErr instanceof Error ? vErr.message : String(vErr)
              } — operator must re-register`,
            );
          }
        }
      }

      // Finding #17.7: migrate token key scheme from raw-token to
      // sha256(token). Idempotent — if already 'sha256' this is a no-op.
      // If migration throws (e.g., OOM on a huge token map), the exception
      // propagates out of loadState and eager-init catches it at startup.
      const migratedCount = this.migrateTokenKeys(parsed);
      if (migratedCount > 0) {
        console.log(
          `[OAuth] Migrated ${migratedCount} token(s) from raw-key to sha256-key storage`,
        );
        this.needsPostLoadSave = true;
      }

      return parsed;
    } catch (err) {
      // FAIL SAFE: preserve the corrupt file for forensics, then throw.
      // The previous behaviour — swallowing the parse error and returning
      // { clients: {}, tokens: {} } — would silently wipe every registered
      // client and every outstanding access token on a transient parse
      // failure. That is strictly worse than loud startup failure: it turns
      // a recoverable problem (restore from backup, fix the file) into
      // unrecoverable data loss that operators would not notice until users
      // started getting invalid_token errors hours later.
      const corrupt = `${this.stateFile}.corrupt.${Date.now()}`;
      let preservedAt: string | null = null;
      try {
        renameSync(this.stateFile, corrupt);
        preservedAt = corrupt;
        console.error(`[OAuth] State file corrupt — preserved at ${corrupt}`);
      } catch (renameErr) {
        // Rename failed (cross-device, permissions, disk full). Delete the
        // corrupt file so the next startup attempt has a clean slate — an
        // infinite boot-fail loop (same corrupt file trips the same error
        // forever) is strictly worse than losing the already-unreadable
        // state file. We still throw so the operator notices, and we log
        // exactly which fallback path was taken so they can investigate.
        console.error('[OAuth] State file corrupt AND rename failed:', renameErr);
        try {
          rmSync(this.stateFile, { force: true });
          console.error('[OAuth] Corrupt state file deleted after rename failure — next start will use empty state');
        } catch (rmErr) {
          console.error('[OAuth] State file corrupt AND rename failed AND delete failed:', rmErr);
        }
      }
      throw new Error(
        '[OAuth] Failed to parse OAuth state file. '
        + (preservedAt
          ? `Corrupt state preserved at ${preservedAt} for forensics. `
          : 'Rename failed — corrupt file was deleted as last-resort recovery. ')
        + 'Refusing to start silently with empty state — this would wipe all registered '
        + 'clients and tokens without operator awareness.',
        { cause: err },
      );
    }
  }

  /** Atomic write: write to temp file then rename — crash-safe. Sets 0600 permissions. */
  private saveState(): void {
    let tmp: string | null = null;
    try {
      const dir = dirname(this.stateFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      tmp = join(tmpdir(), `.oauth-state-${Date.now()}-${randomBytes(4).toString('hex')}.tmp`);
      writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf-8');
      chmodSync(tmp, 0o600);
      renameSync(tmp, this.stateFile);
    } catch (err) {
      if (tmp && existsSync(tmp)) {
        rmSync(tmp, { force: true });
      }
      throw new Error('[OAuth] Failed to persist OAuth state to disk', { cause: err });
    }
  }

  private cleanExpiredTokens(): void {
    const now = Date.now();
    let changed = false;
    for (const [token, data] of Object.entries(this.state.tokens)) {
      if (data.expires_at < now) {
        delete this.state.tokens[token];
        changed = true;
      }
    }
    if (changed) this.saveState();

    // Clean expired pending authorizations
    for (const [stateKey, pending] of this.pendingAuthorizations.entries()) {
      if (now - pending.created_at > AUTH_CODE_TTL_MS) {
        this.pendingAuthorizations.delete(stateKey);
      }
    }

    // Clean expired issued auth codes. Happy path: exchangeAuthorizationCode
    // removes the code on token exchange. Sad path: client abandons flow
    // after PIN verification (exchanges nothing). Without eviction, abandoned
    // codes accumulate in the Map for the lifetime of the server process —
    // unbounded memory growth from any unauthenticated /authorize + login flood.
    for (const [code, data] of this.issuedCodes.entries()) {
      if (now - data.issued_at > AUTH_CODE_TTL_MS) {
        this.issuedCodes.delete(code);
      }
    }

    // Clean expired global rate-limit window
    if (this.pinAttemptWindow && now > this.pinAttemptWindow.resetAt) {
      this.pinAttemptWindow = null;
    }
  }

  // ─── Token key hashing (finding #17.7) ──────────────────────────────────

  /**
   * SHA-256 hex digest of a raw access token. Used as the key into
   * state.tokens so that JS object property lookups no longer leak timing
   * information tied to the raw token value. The digest is deterministic
   * and constant-time to compute; subsequent object lookup leaks only on
   * the digest value, which is indistinguishable from random for an
   * attacker who does not already know the token.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Re-key state.tokens from raw-token-as-key to sha256(rawToken)-as-key.
   * Idempotent: if state.tokenKeyVersion === 'sha256' this returns 0 without
   * touching the map. Otherwise every entry is re-hashed and the version
   * marker is set. Returns the number of entries migrated (0 = already
   * migrated or empty map).
   *
   * NOTE: This mutates the passed state object in place. The caller
   * (loadState) is responsible for triggering a subsequent saveState() so
   * the migration is durable — see constructor's `needsPostLoadSave` flag.
   */
  private migrateTokenKeys(state: OAuthState): number {
    if (state.tokenKeyVersion === 'sha256') return 0;
    const entries = Object.entries(state.tokens ?? {});
    if (entries.length === 0) {
      state.tokenKeyVersion = 'sha256';
      return 0;
    }
    const migrated: Record<string, OAuthTokenData> = {};
    for (const [rawToken, value] of entries) {
      const hashed = createHash('sha256').update(rawToken).digest('hex');
      migrated[hashed] = value;
    }
    state.tokens = migrated;
    state.tokenKeyVersion = 'sha256';
    return entries.length;
  }

  // ─── Rate limiting ───────────────────────────────────────────────────────

  private checkRateLimit(): { allowed: boolean; attemptsLeft: number } {
    const now = Date.now();
    const record = this.pinAttemptWindow;

    if (!record || now > record.resetAt) {
      return { allowed: true, attemptsLeft: OAuthProvider.MAX_PIN_ATTEMPTS };
    }

    const attemptsLeft = OAuthProvider.MAX_PIN_ATTEMPTS - record.count;
    return { allowed: attemptsLeft > 0, attemptsLeft };
  }

  private recordFailedAttempt(stateKey: string): number {
    const now = Date.now();
    const record = this.pinAttemptWindow;
    const pending = this.pendingAuthorizations.get(stateKey);

    if (!pending) {
      return 0;
    }

    pending.failed_attempts += 1;

    if (!record || now > record.resetAt) {
      this.pinAttemptWindow = { count: 1, resetAt: now + OAuthProvider.PIN_LOCKOUT_MS };
      return OAuthProvider.MAX_PIN_ATTEMPTS - 1;
    }

    record.count++;
    return Math.max(0, OAuthProvider.MAX_PIN_ATTEMPTS - record.count);
  }

  private resetAttempts(stateKey: string): void {
    this.pinAttemptWindow = null;
    const pending = this.pendingAuthorizations.get(stateKey);
    if (pending) {
      pending.failed_attempts = 0;
    }
  }

  // ─── Registration auth ───────────────────────────────────────────────────

  /**
   * Verify that a client registration request is authorized.
   * Requires Bearer MCP_AUTH_TOKEN if configured.
   * Returns true if registration is allowed.
   */
  checkRegistrationAuth(authHeader: string): boolean {
    if (!MCP_AUTH_TOKEN) {
      // No token configured — allow (degraded mode, log warning)
      console.warn('[OAuth] /register: MCP_AUTH_TOKEN not set — registration is unprotected');
      return true;
    }
    // Match src/middleware/api-auth.ts behaviour exactly: extract the token,
    // .trim() whitespace, and short-circuit on empty before running HMAC.
    // The empty-token early-out is safe (it is not a secret-dependent branch —
    // it depends only on the attacker-controlled header) and saves work.
    const providedToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!providedToken) return false;
    // HMAC normalisation: both sides get hashed to a fixed 32-byte digest
    // before timingSafeEqual sees them. The previous implementation short-
    // circuited on `expected.length === provided.length &&` BEFORE calling
    // timingSafeEqual, leaking the secret's length via timing (same bug
    // class as the api-auth middleware fix from issue #12 Stage 2A).
    const expectedDigest = createHmac('sha256', this.hmacKey).update(MCP_AUTH_TOKEN).digest();
    const providedDigest = createHmac('sha256', this.hmacKey).update(providedToken).digest();
    return timingSafeEqual(expectedDigest, providedDigest);
  }

  // ─── Client registration (RFC 7591) ─────────────────────────────────────

  registerClient(metadata: Partial<OAuthClientInfo>): OAuthClientInfo {
    // Finding #17.4: validate every redirect_uri against the allowlist
    // BEFORE persisting. Throws RedirectUriValidationError on any invalid
    // entry; caller in routes.ts maps that to HTTP 400.
    const redirect_uris = metadata.redirect_uris || [];
    if (redirect_uris.length === 0) {
      throw new RedirectUriValidationError('at least one redirect_uri is required');
    }
    for (const uri of redirect_uris) {
      validateRedirectUri(uri);
    }

    const client_id = `oracle-${randomBytes(12).toString('hex')}`;
    const client_secret = randomBytes(24).toString('hex');

    const client: OAuthClientInfo = {
      client_id,
      client_secret,
      redirect_uris,
      client_name: metadata.client_name,
      grant_types: metadata.grant_types || ['authorization_code'],
      response_types: metadata.response_types || ['code'],
      scope: metadata.scope || 'read write',
      token_endpoint_auth_method: metadata.token_endpoint_auth_method || 'client_secret_post',
    };

    this.state.clients[client_id] = client;
    try {
      this.saveState();
    } catch (error) {
      delete this.state.clients[client_id];
      console.error('[OAuth] Client registration aborted: failed to persist state', error);
      throw error;
    }

    console.log(`[OAuth] Client registered: ${client_id} (${metadata.client_name ?? 'unnamed'})`);
    return client;
  }

  getClient(client_id: string): OAuthClientInfo | null {
    return this.state.clients[client_id] ?? null;
  }

  // ─── Authorization ───────────────────────────────────────────────────────

  /**
   * Validate authorization request and store pending auth.
   * Returns the login page URL with state key, or an error.
   */
  authorize(params: {
    client_id: string;
    redirect_uri: string;
    scope?: string;
    state?: string;
    code_challenge: string;
    code_challenge_method: string;
    resource?: string;
  }): { loginUrl: string } | { error: string } {
    const client = this.getClient(params.client_id);
    if (!client) {
      return { error: `Unknown client_id: ${params.client_id}` };
    }

    if (!client.redirect_uris.includes(params.redirect_uri)) {
      return { error: 'redirect_uri not registered for client' };
    }

    // Finding #17.4: second enforcement point (defense in depth). The
    // inclusion check above guards against unregistered URIs, but the
    // URI itself could still be invalid if it was persisted before this
    // fix (grandfathered) or if state.clients was tampered with directly
    // on disk. Re-validate the scheme here so /authorize never issues a
    // 302 redirect to a javascript:, data:, or custom-scheme URI.
    try {
      validateRedirectUri(params.redirect_uri);
    } catch (vErr) {
      const msg = vErr instanceof Error ? vErr.message : 'invalid redirect_uri';
      return { error: `invalid redirect_uri: ${msg}` };
    }

    if (params.code_challenge_method !== 'S256') {
      return { error: 'Only S256 code_challenge_method is supported' };
    }

    if (!params.code_challenge) {
      return { error: 'code_challenge is required' };
    }

    // Clean stale entries before enforcing the cap
    this.cleanExpiredTokens();

    if (this.pendingAuthorizations.size >= OAuthProvider.MAX_PENDING_AUTHORIZATIONS) {
      console.warn('[OAuth] /authorize rejected: too many pending authorizations');
      return { error: 'Too many pending authorizations — try again later' };
    }

    const stateKey = randomBytes(16).toString('hex');
    const scopes = (params.scope || 'read write').split(' ').filter(Boolean);

    this.pendingAuthorizations.set(stateKey, {
      client_id: params.client_id,
      state: params.state,
      scopes,
      code_challenge: params.code_challenge,
      redirect_uri: params.redirect_uri,
      resource: params.resource,
      created_at: Date.now(),
      failed_attempts: 0,
    });

    console.log(`[OAuth] Authorization started for client: ${params.client_id}`);
    const loginUrl = `${MCP_EXTERNAL_URL}/oauth/login?state=${stateKey}`;
    return { loginUrl };
  }

  // ─── PIN login page ──────────────────────────────────────────────────────

  getLoginPage(stateKey: string, errorMessage?: string): string {
    const pending = this.pendingAuthorizations.get(stateKey);
    if (!pending) {
      return `<!DOCTYPE html><html><body><h1>Error</h1><p>Invalid or expired state. Please restart the authorization flow.</p></body></html>`;
    }

    const errorHtml = errorMessage
      ? `<p class="error">${escapeHtml(errorMessage)}</p>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oracle v3 — Authorize</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 2rem; width: 100%; max-width: 400px; }
    h1 { font-size: 1.4rem; color: #a78bfa; margin-bottom: 0.5rem; }
    p { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.85rem; color: #aaa; margin-bottom: 0.4rem; }
    input[type="password"] { width: 100%; padding: 0.6rem 0.8rem; background: #0f0f0f; border: 1px solid #444; border-radius: 6px; color: #e0e0e0; font-size: 1rem; margin-bottom: 1rem; outline: none; }
    input[type="password"]:focus { border-color: #a78bfa; }
    button { width: 100%; padding: 0.7rem; background: #7c3aed; border: none; border-radius: 6px; color: white; font-size: 1rem; cursor: pointer; }
    button:hover { background: #6d28d9; }
    .error { color: #f87171; font-size: 0.85rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔮 Oracle v3</h1>
    <p>Enter your PIN to authorize access</p>
    ${errorHtml}
    <form method="POST" action="/oauth/callback">
      <input type="hidden" name="state" value="${escapeHtml(stateKey)}">
      <label for="pin">PIN</label>
      <input type="password" id="pin" name="pin" placeholder="Enter PIN" autofocus autocomplete="current-password">
      <button type="submit">Authorize</button>
    </form>
  </div>
</body>
</html>`;
  }

  /**
   * Verify PIN and issue authorization code.
   * Returns redirect URI with code param, or error info.
   */
  handleLoginCallback(
    stateKey: string,
    pin: string,
  ): { redirectUri: string } | { error: string; status: number; showLoginPage?: boolean } {
    // Rate limit check
    const rateCheck = this.checkRateLimit();
    if (!rateCheck.allowed) {
      console.warn('[OAuth] PIN rate limit exceeded');
      return { error: 'Too many failed attempts. Please try again in 15 minutes.', status: 429, showLoginPage: true };
    }

    const pending = this.pendingAuthorizations.get(stateKey);
    if (!pending) {
      return { error: 'Invalid or expired state', status: 400 };
    }

    if (Date.now() - pending.created_at > AUTH_CODE_TTL_MS) {
      this.pendingAuthorizations.delete(stateKey);
      return { error: 'Authorization request expired', status: 400 };
    }

    if (!MCP_OAUTH_PIN) {
      return { error: 'OAuth not configured', status: 503 };
    }

    // Timing-safe PIN comparison — pad to same length to satisfy timingSafeEqual requirement
    const expected = Buffer.from(MCP_OAUTH_PIN, 'utf-8');
    const provided = Buffer.from(pin || '', 'utf-8');
    const maxLen = Math.max(expected.length, provided.length);
    const expectedPadded = Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]);
    const providedPadded = Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]);

    const lengthMatch = expected.length === provided.length;
    const bytesMatch = timingSafeEqual(expectedPadded, providedPadded);
    const pinMatch = lengthMatch && bytesMatch;

    if (!pinMatch) {
      const attemptsLeft = this.recordFailedAttempt(stateKey);
      console.warn(`[OAuth] Failed PIN attempt for state ${stateKey}, attempts remaining: ${attemptsLeft}`);
      const msg = attemptsLeft > 0
        ? `Incorrect PIN (${attemptsLeft} attempts remaining)`
        : 'Incorrect PIN — account locked for 15 minutes';
      return { error: msg, status: 403, showLoginPage: true };
    }

    this.resetAttempts(stateKey);

    // Issue authorization code — one-time use
    const code = randomBytes(24).toString('hex');

    // Store code data for later token exchange
    this.issuedCodes.set(code, {
      client_id: pending.client_id,
      redirect_uri: pending.redirect_uri,
      scopes: pending.scopes,
      code_challenge: pending.code_challenge,
      resource: pending.resource,
      issued_at: Date.now(),
    });

    // Remove pending auth — it's consumed
    this.pendingAuthorizations.delete(stateKey);

    console.log(`[OAuth] PIN verified, auth code issued for client: ${pending.client_id}`);

    // Build redirect URI with code and original state
    const redirectUrl = new URL(pending.redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (pending.state) redirectUrl.searchParams.set('state', pending.state);

    return { redirectUri: redirectUrl.toString() };
  }

  // ─── Token exchange ──────────────────────────────────────────────────────

  exchangeAuthorizationCode(params: {
    client_id: string;
    code: string;
    code_verifier: string;
    redirect_uri: string;
  }): { access_token: string; token_type: 'bearer'; expires_in: number } | { error: string; status: number } {
    const codeData = this.issuedCodes.get(params.code);
    if (!codeData) {
      return { error: 'invalid_grant', status: 400 };
    }

    // Auth codes are one-time use — delete immediately (even on failure)
    this.issuedCodes.delete(params.code);

    // Check code expiry (5 minutes)
    if (Date.now() - codeData.issued_at > AUTH_CODE_TTL_MS) {
      return { error: 'invalid_grant: authorization code expired', status: 400 };
    }

    if (codeData.client_id !== params.client_id) {
      return { error: 'invalid_grant: client_id mismatch', status: 400 };
    }

    if (codeData.redirect_uri !== params.redirect_uri) {
      return { error: 'invalid_grant: redirect_uri mismatch', status: 400 };
    }

    // PKCE: SHA-256(code_verifier) base64url must equal stored code_challenge
    const verifierHash = createHash('sha256')
      .update(params.code_verifier)
      .digest('base64url');

    if (verifierHash !== codeData.code_challenge) {
      console.warn(`[OAuth] PKCE verification failed for client: ${params.client_id}`);
      return { error: 'invalid_grant: PKCE verification failed', status: 400 };
    }

    const access_token = randomBytes(32).toString('hex');
    const expires_at = Date.now() + TOKEN_TTL_MS;
    // Finding #17.7: store under sha256(token), not raw token, so the
    // JS dict-key timing side-channel is closed at issue time too (otherwise
    // migration would only help legacy tokens).
    const tokenKey = this.hashToken(access_token);

    this.state.tokens[tokenKey] = {
      client_id: codeData.client_id,
      scopes: codeData.scopes,
      expires_at,
      resource: codeData.resource,
    };
    try {
      this.saveState();
    } catch (error) {
      delete this.state.tokens[tokenKey];
      console.error('[OAuth] Access token issuance aborted: failed to persist state', error);
      return { error: 'temporarily_unavailable: failed to persist token state', status: 503 };
    }

    console.log(`[OAuth] Access token issued for client: ${codeData.client_id}`);

    return {
      access_token,
      token_type: 'bearer',
      expires_in: Math.floor(TOKEN_TTL_MS / 1000),
    };
  }

  // ─── Token verification ──────────────────────────────────────────────────

  /**
   * Verify an access token.
   * Checks OAuth-issued tokens first, then falls back to static MCP_AUTH_TOKEN.
   */
  verifyAccessToken(token: string): AuthInfo | null {
    if (!token) return null;

    // 1. OAuth-issued tokens — hash-before-lookup (finding #17.7).
    // The SHA-256 computation is the constant-time component; the object
    // property access that follows leaks only on the digest value, which
    // is indistinguishable from random for an attacker who does not
    // already know the token.
    const tokenKey = this.hashToken(token);
    const data = this.state.tokens[tokenKey];
    if (data) {
      if (data.expires_at < Date.now()) {
        delete this.state.tokens[tokenKey];
        try {
          this.saveState();
        } catch (error) {
          console.error('[OAuth] Failed to persist expired-token cleanup', error);
        }
        return null;
      }
      return {
        token,
        client_id: data.client_id,
        scopes: data.scopes,
        expires_at: data.expires_at,
      };
    }

    // 2. Static Bearer token fallback
    if (!MCP_AUTH_TOKEN) return null;

    const expected = Buffer.from(MCP_AUTH_TOKEN, 'utf-8');
    const provided = Buffer.from(token, 'utf-8');
    const maxLen = Math.max(expected.length, provided.length);
    const expectedPadded = Buffer.concat([expected, Buffer.alloc(maxLen - expected.length)]);
    const providedPadded = Buffer.concat([provided, Buffer.alloc(maxLen - provided.length)]);

    const match = timingSafeEqual(expectedPadded, providedPadded) && expected.length === provided.length;
    if (!match) return null;

    return {
      token: '[redacted]',
      client_id: 'static-bearer',
      scopes: ['read', 'write'],
      expires_at: STATIC_TOKEN_EXPIRES_AT,
    };
  }

  // ─── Token revocation ────────────────────────────────────────────────────

  /**
   * Revoke an access token.
   *
   * @param token                  raw access token to revoke
   * @param authenticatedClientId  if supplied, enforces RFC 7009 §2.1
   *                               token-client binding: the token MUST have
   *                               been issued to this client or the call is
   *                               silently ignored (return 200 to caller,
   *                               token remains active) — this is the
   *                               spec-compliant way to not leak token
   *                               existence across clients.
   *
   * Hash-before-lookup (finding #17.7): the map is keyed by sha256(token),
   * so the dict-access timing side-channel is closed here as it is in
   * verifyAccessToken and exchangeAuthorizationCode.
   */
  revokeToken(token: string, authenticatedClientId?: string): void {
    const tokenKey = this.hashToken(token);
    const current = this.state.tokens[tokenKey];
    if (!current) return;

    // Finding #17.5: token-client binding. If the caller authenticated as
    // client X but the token belongs to client Y, we MUST NOT reveal that
    // the token exists (RFC 7009 §2.1 — "the authorization server responds
    // with HTTP status code 200 if the token has been revoked successfully
    // or if the client submitted an invalid token"). Returning silently
    // here means the HTTP handler will return 200, and the attacker sees
    // the same response whether or not the token existed.
    if (authenticatedClientId !== undefined && current.client_id !== authenticatedClientId) {
      console.warn(
        `[OAuth] /revoke: client ${authenticatedClientId} attempted to revoke token belonging to ${current.client_id} — ignored (not leaked)`,
      );
      return;
    }

    // Snapshot rather than capturing the reference — if any future code path
    // mutates the token record in-flight (e.g., sliding-window expiry update,
    // scope narrowing), the rollback must restore the ORIGINAL value, not
    // whatever happens to be sitting at that reference at catch time. Object
    // spread is shallow, so explicitly deep-copy the `scopes` array — the
    // only mutable nested field in the token record shape. Keeping this
    // explicit (not reaching for structuredClone) documents the invariant
    // at the rollback boundary where it matters.
    const snapshot = { ...current, scopes: [...current.scopes] };

    delete this.state.tokens[tokenKey];
    try {
      this.saveState();
      console.log(`[OAuth] Token revoked (client=${current.client_id})`);
    } catch (error) {
      // Roll back in-memory deletion so memory + disk stay consistent.
      // The previous behaviour logged "Token revoked" even on persistence
      // failure — operators had no signal, and the token would reappear
      // on next restart (disk state is authoritative at startup). Worse,
      // an attacker whose token was "revoked" but not persisted could
      // keep using it for the current process lifetime with no audit
      // trail. Re-throw so /revoke returns 500 and the client knows.
      this.state.tokens[tokenKey] = snapshot;
      console.error('[OAuth] Token revocation failed to persist — state restored', error);
      throw new Error('Failed to persist token revocation', { cause: error });
    }
  }

  // ─── /revoke client authentication (finding #17.5) ──────────────────────

  /**
   * Authenticate a /revoke request per RFC 7009 §2.1.
   *
   * Accepts client credentials via either:
   *   - HTTP Basic: `Authorization: Basic base64(client_id:client_secret)` (preferred)
   *   - Form body:  `client_id=X&client_secret=Y` (fallback)
   *
   * Rejects with HTTP 400 if BOTH are present (RFC 6749 §2.3.1:
   * "the client MUST NOT use more than one authentication method in each
   * request").
   *
   * client_secret is compared via HMAC-normalised timingSafeEqual using
   * this.hmacKey — the same pattern as checkRegistrationAuth (see that
   * method's comment for the full rationale on why the HMAC key does not
   * need to be secret; its only job is to give timingSafeEqual two equal-
   * length digests so the compare runs without leaking length via
   * short-circuit behaviour).
   *
   * On unknown client_id we still run a dummy constant-time compare so that
   * attackers cannot distinguish "client does not exist" from "wrong
   * secret" by timing the response.
   */
  authenticateRevokeRequest(
    authHeader: string,
    formBody: { client_id?: string; client_secret?: string },
  ):
    | { ok: true; clientId: string }
    | { ok: false; status: 400 | 401; error: string; errorDescription: string } {
    const hasBasic = authHeader.toLowerCase().startsWith('basic ');
    const hasForm = !!(formBody.client_id || formBody.client_secret);

    if (hasBasic && hasForm) {
      return {
        ok: false,
        status: 400,
        error: 'invalid_request',
        errorDescription:
          'use only one client authentication method (RFC 6749 §2.3.1)',
      };
    }

    let clientId: string;
    let clientSecret: string;

    if (hasBasic) {
      // Strip the "Basic " / "basic " prefix. Both variants are 6 bytes
      // so a fixed slice(6) works without re-lowercasing — the case check
      // was already done above via toLowerCase().startsWith('basic ').
      const encoded = authHeader.slice(6).trim();
      let decoded: string;
      try {
        decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      } catch {
        return {
          ok: false,
          status: 401,
          error: 'invalid_client',
          errorDescription: 'malformed Basic auth',
        };
      }
      const colonIdx = decoded.indexOf(':');
      if (colonIdx < 0) {
        return {
          ok: false,
          status: 401,
          error: 'invalid_client',
          errorDescription: 'malformed Basic auth (missing colon)',
        };
      }
      clientId = decoded.slice(0, colonIdx);
      clientSecret = decoded.slice(colonIdx + 1);
    } else if (hasForm) {
      clientId = formBody.client_id ?? '';
      clientSecret = formBody.client_secret ?? '';
    } else {
      return {
        ok: false,
        status: 401,
        error: 'invalid_client',
        errorDescription: 'client authentication required',
      };
    }

    if (!clientId || !clientSecret) {
      return {
        ok: false,
        status: 401,
        error: 'invalid_client',
        errorDescription: 'client_id and client_secret required',
      };
    }

    const client = this.state.clients[clientId];
    if (!client || !client.client_secret) {
      // Dummy compare to equalise timing between "client missing" and
      // "client exists but secret wrong". Without this, an attacker can
      // enumerate valid client_ids by measuring response time.
      const dummy = createHmac('sha256', this.hmacKey)
        .update('dummy-secret-for-timing-parity')
        .digest();
      const providedDigest = createHmac('sha256', this.hmacKey)
        .update(clientSecret)
        .digest();
      // Throwaway — we deliberately discard the result so the compiler
      // cannot optimise it out. timingSafeEqual requires equal-length
      // buffers; both are 32-byte SHA-256 digests, so this is safe.
      timingSafeEqual(dummy, providedDigest);
      return {
        ok: false,
        status: 401,
        error: 'invalid_client',
        errorDescription: 'invalid credentials',
      };
    }

    const expectedDigest = createHmac('sha256', this.hmacKey)
      .update(client.client_secret)
      .digest();
    const providedDigest = createHmac('sha256', this.hmacKey)
      .update(clientSecret)
      .digest();

    if (!timingSafeEqual(expectedDigest, providedDigest)) {
      return {
        ok: false,
        status: 401,
        error: 'invalid_client',
        errorDescription: 'invalid credentials',
      };
    }

    return { ok: true, clientId };
  }

  // ─── Accessors for testing ───────────────────────────────────────────────

  getTokenCount(): number {
    return Object.keys(this.state.tokens).length;
  }

  getClientCount(): number {
    return Object.keys(this.state.clients).length;
  }

  /**
   * @internal — test-only accessor. Do not call from production code.
   * Exposes the current size of the in-memory issuedCodes Map so unit
   * tests can assert TTL eviction behaviour.
   */
  getIssuedCodeCount(): number {
    return this.issuedCodes.size;
  }

  /**
   * @internal — test-only entry point. Do not call from production code.
   * Force-triggers the expiry sweep (normally called from the constructor
   * and from /authorize traffic + the periodic setInterval). Used by unit
   * tests to deterministically exercise eviction after fast-forwarding the
   * clock via Date.now monkey-patch.
   */
  runExpirySweep(): void {
    this.cleanExpiredTokens();
  }
}

// Singleton instance
let _provider: OAuthProvider | null = null;

export function getOAuthProvider(): OAuthProvider {
  if (!_provider) {
    _provider = new OAuthProvider();
  }
  return _provider;
}

/** Reset singleton (for testing) */
export function resetOAuthProvider(): void {
  _provider = null;
}
