/**
 * OAuth 2.0 handler for claude.ai MCP integration
 * Provides minimal OAuth flow while using existing API key authentication
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { verifyApiKey } from '../transports/auth.js';

// In-memory storage for authorization codes (expires in 5 minutes)
const authCodes = new Map<string, { apiKey: string; expiresAt: number; codeChallenge?: string }>();

// Clean up expired codes every minute
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of authCodes.entries()) {
    if (data.expiresAt < now) {
      authCodes.delete(code);
    }
  }
}, 60000);

/**
 * OAuth Discovery Endpoint
 * Returns OAuth server metadata for claude.ai discovery
 */
export function handleOAuthDiscovery(req: Request, res: Response) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256', 'plain'],
    token_endpoint_auth_methods_supported: ['none']
  });
}

/**
 * OAuth Authorization Endpoint
 * Shows a simple form for users to enter their API key
 */
export function handleOAuthAuthorize(req: Request, res: Response) {
  const { client_id, redirect_uri, state, code_challenge, code_challenge_method = 'plain' } = req.query;

  if (!redirect_uri || !state) {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Missing required parameters' });
  }

  // If this is a form submission
  if (req.method === 'POST') {
    const { api_key } = req.body;

    if (!api_key || !verifyApiKey(api_key)) {
      return res.status(401).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Musashi - Authorization</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
            .error { background: #fee; border: 1px solid #fcc; padding: 10px; border-radius: 4px; color: #c33; margin-bottom: 20px; }
            input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: monospace; box-sizing: border-box; }
            button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <h2>🥋 Musashi Authorization</h2>
          <div class="error">Invalid API key. Please try again.</div>
          <form method="POST">
            <input type="password" name="api_key" placeholder="mcp_sk_..." required autofocus />
            <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
            <input type="hidden" name="state" value="${state}" />
            <input type="hidden" name="code_challenge" value="${code_challenge || ''}" />
            <button type="submit">Authorize</button>
          </form>
        </body>
        </html>
      `);
    }

    // Generate authorization code
    const code = `auth_${crypto.randomBytes(32).toString('hex')}`;
    authCodes.set(code, {
      apiKey: api_key,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      codeChallenge: code_challenge as string
    });

    // Redirect back to claude.ai with authorization code
    const redirectUrl = new URL(redirect_uri as string);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', state as string);

    return res.redirect(redirectUrl.toString());
  }

  // Show authorization form (GET request)
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Musashi - Authorization</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
        h2 { color: #333; }
        p { color: #666; line-height: 1.5; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; font-family: monospace; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        .info { background: #e7f3ff; border: 1px solid #b3d9ff; padding: 10px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
      </style>
    </head>
    <body>
      <h2>🥋 Musashi Authorization</h2>
      <p>Claude.ai is requesting access to your Musashi prediction market intelligence.</p>
      <div class="info">
        Enter your Musashi API key to authorize access. Don't have one? Contact the Musashi team.
      </div>
      <form method="POST">
        <input type="password" name="api_key" placeholder="mcp_sk_..." required autofocus />
        <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
        <input type="hidden" name="state" value="${state}" />
        <input type="hidden" name="code_challenge" value="${code_challenge || ''}" />
        <button type="submit">Authorize Access</button>
      </form>
    </body>
    </html>
  `);
}

/**
 * OAuth Token Endpoint
 * Exchanges authorization code for access token
 */
export function handleOAuthToken(req: Request, res: Response) {
  const { grant_type, code, redirect_uri, code_verifier } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({
      error: 'unsupported_grant_type',
      error_description: 'Only authorization_code grant type is supported'
    });
  }

  if (!code) {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing authorization code'
    });
  }

  // Retrieve and validate authorization code
  const authData = authCodes.get(code);

  if (!authData) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code'
    });
  }

  if (authData.expiresAt < Date.now()) {
    authCodes.delete(code);
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code has expired'
    });
  }

  // Verify PKCE challenge if provided
  if (authData.codeChallenge && code_verifier) {
    const hash = crypto.createHash('sha256').update(code_verifier).digest('base64url');
    if (hash !== authData.codeChallenge) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Code verifier does not match challenge'
      });
    }
  }

  // Delete used code
  authCodes.delete(code);

  // Return the API key as the access token
  res.json({
    access_token: authData.apiKey,
    token_type: 'Bearer',
    expires_in: 31536000, // 1 year
    scope: 'mcp:read mcp:write'
  });
}
