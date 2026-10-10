import { handleRelayRequest } from '../../../relay/cloudflare-relay.mjs';

/**
 * Verma Web — Cloudflare Worker entry point with attached static assets.
 *
 * Routing contract:
 * - Relay & health paths ('/health', '/api/health', '/v1/envelopes*',
 *   '/api/v1/envelopes*') are forwarded to the serverless KV relay.
 * - Every other '/api/*' path returns an explicit JSON 503 because this
 *   deployment has no vault backend at the same origin. This deliberately
 *   prevents the SPA fallback from answering API calls with HTML 200, which
 *   used to make the frontend hang in its 'loading' state.
 * - Everything else is served from the ./dist static assets so the SPA and
 *   its client-side routes keep working.
 */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (
      pathname === '/health' ||
      pathname === '/api/health' ||
      pathname.startsWith('/v1/envelopes') ||
      pathname.startsWith('/api/v1/envelopes')
    ) {
      return handleRelayRequest(request, env);
    }

    if (pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'Vault backend unavailable on this deployment',
          code: 'backend_unavailable',
        }),
        {
          status: 503,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
          },
        }
      );
    }

    return env.ASSETS.fetch(request);
  },
};