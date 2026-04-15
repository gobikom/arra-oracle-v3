/**
 * OAuth 2.1 types for Oracle v3
 *
 * Used by the OAuthProvider and Hono route handlers.
 * Persisted to ORACLE_DATA_DIR/.oauth-state.json
 */

export interface OAuthTokenData {
  client_id: string;
  scopes: string[];
  expires_at: number;
  resource?: string;
}

export interface OAuthState {
  clients: Record<string, OAuthClientInfo>;
  /**
   * Keyed by sha256hex(rawAccessToken) when `tokenKeyVersion === 'sha256'`.
   * Legacy state files (tokenKeyVersion absent) are keyed by the raw token
   * and migrated in-place on load — see OAuthProvider.migrateTokenKeys.
   */
  tokens: Record<string, OAuthTokenData>;
  /**
   * Token storage scheme version. Absent = legacy raw-key (migrated on load).
   * 'sha256' = keys are SHA-256(token) hex (hash-before-lookup side-channel fix).
   */
  tokenKeyVersion?: 'sha256';
}

export interface OAuthClientInfo {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  client_name?: string;
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: string;
}

export interface PendingAuthorization {
  client_id: string;
  state?: string;
  scopes: string[];
  code_challenge: string;
  redirect_uri: string;
  resource?: string;
  created_at: number;
  failed_attempts: number;
}
