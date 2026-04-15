/**
 * OAuth 2.1 Hono routes for Oracle v3
 *
 * Registers all OAuth endpoints on the Hono app.
 * Only mounted when MCP_OAUTH_PIN is set.
 *
 * Endpoints:
 *   GET  /.well-known/oauth-authorization-server  — AS metadata
 *   GET  /.well-known/oauth-protected-resource    — Resource metadata
 *   POST /register                                — Dynamic client registration (RFC 7591, Bearer-protected)
 *   GET  /authorize                               — Authorization endpoint
 *   POST /token                                   — Token endpoint
 *   POST /revoke                                  — Revocation endpoint
 *   GET  /oauth/login                             — PIN entry page
 *   POST /oauth/callback                          — PIN verification + redirect (rate-limited)
 */

import type { Hono } from 'hono';
import { MCP_EXTERNAL_URL } from '../config.ts';
import { getOAuthProvider, RedirectUriValidationError } from './provider.ts';

export function registerOAuthRoutes(app: Hono): void {
  // ─── Discovery metadata ────────────────────────────────────────────────

  app.get('/.well-known/oauth-authorization-server', (c) => {
    return c.json({
      issuer: MCP_EXTERNAL_URL,
      authorization_endpoint: `${MCP_EXTERNAL_URL}/authorize`,
      token_endpoint: `${MCP_EXTERNAL_URL}/token`,
      registration_endpoint: `${MCP_EXTERNAL_URL}/register`,
      revocation_endpoint: `${MCP_EXTERNAL_URL}/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: ['read', 'write'],
    });
  });

  app.get('/.well-known/oauth-protected-resource', (c) => {
    return c.json({
      resource: MCP_EXTERNAL_URL,
      authorization_servers: [MCP_EXTERNAL_URL],
      scopes_supported: ['read', 'write'],
      bearer_methods_supported: ['header'],
    });
  });

  // ─── Dynamic client registration (RFC 7591) ───────────────────────────
  // Protected: requires Bearer MCP_AUTH_TOKEN to prevent open registration abuse.

  app.post('/register', async (c) => {
    const provider = getOAuthProvider();

    // Require Bearer auth for registration
    const authHeader = c.req.header('Authorization') ?? '';
    if (!provider.checkRegistrationAuth(authHeader)) {
      return c.json(
        { error: 'unauthorized', error_description: 'Client registration requires a valid Bearer token' },
        401,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'invalid_request: body must be JSON' }, 400);
    }

    const redirect_uris = body.redirect_uris;
    if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return c.json({ error: 'invalid_client_metadata: redirect_uris required' }, 400);
    }

    let client;
    try {
      client = provider.registerClient({
        redirect_uris: redirect_uris as string[],
        client_name: body.client_name as string | undefined,
        grant_types: body.grant_types as string[] | undefined,
        response_types: body.response_types as string[] | undefined,
        scope: body.scope as string | undefined,
        token_endpoint_auth_method: body.token_endpoint_auth_method as string | undefined,
      });
    } catch (err) {
      // Finding #17.4: map redirect_uri validation errors to 400
      // invalid_redirect_uri (RFC 6749 §4.1.2.1) instead of the generic
      // 503. Any other error (e.g., saveState failure) stays 503.
      if (err instanceof RedirectUriValidationError) {
        return c.json(
          { error: 'invalid_redirect_uri', error_description: err.message },
          400,
        );
      }
      return c.json(
        { error: 'temporarily_unavailable: failed to persist client registration' },
        503,
      );
    }

    return c.json(client, 201);
  });

  // ─── Authorization endpoint ───────────────────────────────────────────

  app.get('/authorize', (c) => {
    const client_id = c.req.query('client_id') || '';
    const redirect_uri = c.req.query('redirect_uri') || '';
    const scope = c.req.query('scope');
    const state = c.req.query('state');
    const code_challenge = c.req.query('code_challenge') || '';
    const code_challenge_method = c.req.query('code_challenge_method') || '';
    const resource = c.req.query('resource');
    const response_type = c.req.query('response_type');

    if (response_type !== 'code') {
      return c.json({ error: 'unsupported_response_type' }, 400);
    }

    const provider = getOAuthProvider();
    const result = provider.authorize({
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
      resource,
    });

    if ('error' in result) {
      return c.json({ error: result.error }, 400);
    }

    return c.redirect(result.loginUrl, 302);
  });

  // ─── Token endpoint ───────────────────────────────────────────────────

  app.post('/token', async (c) => {
    let params: Record<string, string>;

    const contentType = c.req.header('Content-Type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await c.req.text();
      params = Object.fromEntries(new URLSearchParams(text));
    } else {
      // Try JSON fallback
      try {
        params = await c.req.json() as Record<string, string>;
      } catch {
        return c.json({ error: 'invalid_request: unsupported content type' }, 400);
      }
    }

    const grant_type = params.grant_type;
    if (grant_type !== 'authorization_code') {
      return c.json({ error: 'unsupported_grant_type' }, 400);
    }

    const code = params.code;
    const client_id = params.client_id;
    const code_verifier = params.code_verifier;
    const redirect_uri = params.redirect_uri;

    if (!code || !client_id || !code_verifier || !redirect_uri) {
      return c.json({ error: 'invalid_request: missing required parameters' }, 400);
    }

    const provider = getOAuthProvider();
    const result = provider.exchangeAuthorizationCode({
      client_id,
      code,
      code_verifier,
      redirect_uri,
    });

    if ('error' in result) {
      return c.json({ error: result.error }, result.status as 400 | 503);
    }

    return c.json(result);
  });

  // ─── Token revocation ─────────────────────────────────────────────────

  app.post('/revoke', async (c) => {
    // Finding #17.5: RFC 7009 §2.1 requires the revocation endpoint to
    // authenticate the client. We accept HTTP Basic (preferred) or
    // client_id/client_secret in the form body (fallback). Both together
    // is a 400 per RFC 6749 §2.3.1. Unauthenticated calls are 401 with
    // WWW-Authenticate per RFC 7009.
    const authHeader = c.req.header('Authorization') ?? '';

    let formBody: {
      client_id?: string;
      client_secret?: string;
      token?: string;
    } = {};

    const contentType = c.req.header('Content-Type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await c.req.text();
      const params = new URLSearchParams(text);
      formBody = {
        client_id: params.get('client_id') ?? undefined,
        client_secret: params.get('client_secret') ?? undefined,
        token: params.get('token') ?? undefined,
      };
    } else {
      try {
        const body = (await c.req.json()) as Record<string, string>;
        formBody = {
          client_id: body.client_id,
          client_secret: body.client_secret,
          token: body.token,
        };
      } catch {
        // No parseable body — still go through auth check below (will
        // fail without credentials in either Basic or form body).
      }
    }

    const provider = getOAuthProvider();
    const authResult = provider.authenticateRevokeRequest(authHeader, {
      client_id: formBody.client_id,
      client_secret: formBody.client_secret,
    });

    if (!authResult.ok) {
      if (authResult.status === 401) {
        // RFC 7009: 401 responses include WWW-Authenticate so clients can
        // retry with Basic credentials.
        c.header('WWW-Authenticate', 'Basic realm="oauth"');
      }
      return c.json(
        { error: authResult.error, error_description: authResult.errorDescription },
        authResult.status,
      );
    }

    const token = formBody.token;
    if (token) {
      try {
        // Pass the authenticated clientId so revokeToken can enforce
        // token-client binding per RFC 7009 §2.1 (no cross-client leak).
        provider.revokeToken(token, authResult.clientId);
      } catch (err) {
        // revokeToken throws on saveState persistence failure. Surface a
        // 500 so the caller knows the revocation did not stick — the
        // previous silent-swallow behaviour would have returned 200 while
        // the token remained valid on disk (next restart would restore it).
        console.error('[OAuth] /revoke: persistence failed', err);
        return c.json(
          { error: 'server_error', error_description: 'Revocation failed to persist' },
          500,
        );
      }
    }

    // RFC 7009: return 200 for unknown/missing tokens (no token existence
    // oracle), successful revocation, and silently-ignored cross-client
    // revoke attempts. The response body is intentionally empty.
    return c.json({}, 200);
  });

  // ─── PIN login page ───────────────────────────────────────────────────

  app.get('/oauth/login', (c) => {
    const stateKey = c.req.query('state') || '';
    const provider = getOAuthProvider();
    const html = provider.getLoginPage(stateKey);
    return c.html(html);
  });

  app.post('/oauth/callback', async (c) => {
    let stateKey: string;
    let pin: string;

    const contentType = c.req.header('Content-Type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await c.req.text();
      const params = new URLSearchParams(text);
      stateKey = params.get('state') || '';
      pin = params.get('pin') || '';
    } else {
      try {
        const body = await c.req.json() as Record<string, string>;
        stateKey = body.state || '';
        pin = body.pin || '';
      } catch {
        return c.json({ error: 'invalid_request' }, 400);
      }
    }

    const provider = getOAuthProvider();
    const result = provider.handleLoginCallback(stateKey, pin);

    if ('error' in result) {
      if (result.showLoginPage) {
        // Re-render login page with error message
        const html = provider.getLoginPage(stateKey, result.error);
        return c.html(html, result.status as 200 | 400 | 403 | 429 | 503);
      }
      return c.json({ error: result.error }, result.status as 400 | 403 | 429 | 503);
    }

    return c.redirect(result.redirectUri, 302);
  });
}
