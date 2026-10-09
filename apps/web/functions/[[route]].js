import { handleRelayRequest } from '../../../relay/cloudflare-relay.mjs';

/**
 * Cloudflare Pages Functions entry point.
 * Intercepts /health and /v1/envelopes requests to route to the serverless KV relay,
 * while allowing static assets to be served for all other web application routes.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (
    url.pathname === '/health' ||
    url.pathname === '/api/health' ||
    url.pathname.startsWith('/v1/envelopes') ||
    url.pathname.startsWith('/api/v1/envelopes')
  ) {
    return handleRelayRequest(context.request, context.env);
  }
  return context.next();
}
