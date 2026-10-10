import { handleRelayRequest } from '../../relay/cloudflare-relay.mjs';

const RELAY_PATHS = ['/health', '/api/health', '/v1/envelopes', '/api/v1/envelopes'];

function isRelayPath(pathname) {
  return RELAY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (isRelayPath(url.pathname)) {
      return handleRelayRequest(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
