/**
 * Arra Oracle Configuration
 *
 * Resolves paths from const.ts + environment variables.
 * No DB connections, no table creation.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as C from './const.ts';

// ES Module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root (parent of src/)
const PROJECT_ROOT = path.resolve(__dirname, '..');

// HOME — fail fast if not set
const home = process.env.HOME || process.env.USERPROFILE;
if (!home) throw new Error('HOME environment variable not set — cannot resolve paths');
export const HOME_DIR = home;

// Core paths
export const PORT = parseInt(String(process.env.ORACLE_PORT || C.ORACLE_DEFAULT_PORT), 10);
export const ORACLE_DATA_DIR = process.env.ORACLE_DATA_DIR || path.join(HOME_DIR, C.ORACLE_DATA_DIR_NAME);
export const DB_PATH = process.env.ORACLE_DB_PATH || path.join(ORACLE_DATA_DIR, C.ORACLE_DB_FILE);

// REPO_ROOT: where ψ/ lives
// From source: project root. Via bunx: set ORACLE_REPO_ROOT. Fallback: data dir.
export const REPO_ROOT = process.env.ORACLE_REPO_ROOT ||
  (fs.existsSync(path.join(PROJECT_ROOT, 'ψ')) ? PROJECT_ROOT : ORACLE_DATA_DIR);

// Derived paths — import these, don't compute inline
export const FEED_LOG = path.join(ORACLE_DATA_DIR, C.FEED_LOG_FILE);
export const PLUGINS_DIR = path.join(ORACLE_DATA_DIR, C.PLUGINS_DIR_NAME);
export const SCHEDULE_PATH = path.join(ORACLE_DATA_DIR, C.SCHEDULE_FILE);
export const VECTORS_DB_PATH = path.join(ORACLE_DATA_DIR, C.VECTORS_DB_FILE);
export const LANCEDB_DIR = path.join(ORACLE_DATA_DIR, C.LANCEDB_DIR_NAME);
export const CHROMADB_DIR = path.join(HOME_DIR, C.CHROMADB_DIR_NAME);

// MCP Remote Transport auth token — required for /mcp endpoint
// If empty, /mcp will reject all requests with 401 (fail-safe)
export const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || '';

// /api/* Bearer token (issue #12 Stage 2 — required-enforce). Every /api/*
// request except /api/health must carry `Authorization: Bearer <token>`
// matching exactly. The api-auth middleware throws at startup if this is
// empty — Oracle will fail to boot on misconfigured environments rather
// than silently allowing unauthenticated traffic.
//
// Provisioned via ~/.secrets/oracle-api.env (mode 600), loaded by systemd
// EnvironmentFile. The same secrets file is shared with all clients
// (psak-soul-mcp, auto-ops watchdog, arra-oracle-skills) so rotations
// happen in one place.
export const ORACLE_API_TOKEN = (process.env.ORACLE_API_TOKEN || '').trim();

// HTTP bind host. Defaults to 127.0.0.1 so the server is reachable only via
// localhost / a reverse proxy.
//
// /api/* now has a Bearer auth middleware (issue #12 Stage 2A, optional-enforce
// until ORACLE_API_TOKEN is provisioned and clients are coordinated). Even so,
// binding non-loopback while the middleware is still in compat mode would
// re-expose the service to any LAN peer. Keep this on loopback unless you
// have explicitly provisioned ORACLE_API_TOKEN AND verified all clients send
// the Bearer header.
export const ORACLE_BIND_HOST = (process.env.ORACLE_BIND_HOST || '').trim() || '127.0.0.1';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1']);
if (!LOOPBACK_HOSTS.has(ORACLE_BIND_HOST)) {
  console.warn(
    `⚠️  ORACLE_BIND_HOST=${ORACLE_BIND_HOST} binds non-loopback. `
    + `/api/* is gated by Bearer token (issue #12 Stage 2 complete), but exposing the port `
    + `widens the attack surface for credential theft / brute-force attempts. Keep loopback `
    + `unless you have a specific reason and have audited the additional risk.`,
  );
}

// OAuth 2.1 — PIN-based auth for Claude Desktop / claude.ai Custom Connectors
// If MCP_OAUTH_PIN is empty, OAuth routes are not mounted (Bearer-only mode)
export const MCP_OAUTH_PIN = process.env.MCP_OAUTH_PIN || '';
function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '::1'
    || hostname.endsWith('.localhost')
  );
}

function resolveMcpExternalUrl(rawValue: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawValue);
  } catch (error) {
    throw new Error(`MCP_EXTERNAL_URL must be an absolute URL (received: ${rawValue})`, { cause: error });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`MCP_EXTERNAL_URL must use http or https (received: ${parsed.protocol})`);
  }

  if (MCP_OAUTH_PIN && parsed.protocol === 'http:' && !isLoopbackHostname(parsed.hostname)) {
    throw new Error(
      'FATAL: MCP_EXTERNAL_URL must use HTTPS when OAuth is enabled unless the host is loopback/local-only.',
    );
  }

  return parsed.toString().replace(/\/$/, '');
}

export const MCP_EXTERNAL_URL = resolveMcpExternalUrl(
  process.env.MCP_EXTERNAL_URL || `http://localhost:${PORT}`,
);

// Ensure data directory exists (for fresh installs via bunx)
if (!fs.existsSync(ORACLE_DATA_DIR)) {
  fs.mkdirSync(ORACLE_DATA_DIR, { recursive: true });
}
