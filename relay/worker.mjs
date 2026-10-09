import { handleRelayRequest } from './cloudflare-relay.mjs';

export default {
  async fetch(request, env) {
    return handleRelayRequest(request, env);
  },
};
