export const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Constant-time string equality check to prevent timing side-channel attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validates Bearer token authentication against configured secret.
 * @param {string | null | undefined} authHeader
 * @param {string | null | undefined} expectedToken
 * @returns {boolean}
 */
export function isAuthenticated(authHeader, expectedToken) {
  if (!expectedToken || !authHeader) return false;
  const expected = `Bearer ${expectedToken}`;
  return timingSafeEqual(authHeader, expected);
}

/**
 * Handles relay requests for Cloudflare Workers.
 * @param {Request} request
 * @param {Record<string, any>} env
 * @returns {Promise<Response>}
 */
export async function handleRelayRequest(request, env) {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Public health check endpoint
    if (pathname === '/health' || pathname === '/api/health') {
      if (method !== 'GET') {
        return new Response('Method not allowed', {
          status: 405,
          headers: { 'cache-control': 'no-store' },
        });
      }
      return new Response(JSON.stringify({ status: 'ok', service: 'verma-cloudflare-relay' }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
        },
      });
    }

    // Opaque envelope relay endpoints under /v1/envelopes or /api/v1/envelopes
    if (pathname.startsWith('/v1/envelopes') || pathname.startsWith('/api/v1/envelopes')) {
      const authHeader = request.headers.get('authorization');
      const token = env?.RELAY_AUTH_TOKEN;
      if (!isAuthenticated(authHeader, token)) {
        return new Response('Unauthorized', {
          status: 401,
          headers: { 'cache-control': 'no-store' },
        });
      }

      const kv = env?.VERMA_RELAY_KV;
      if (!kv) {
        return new Response('Relay storage unavailable', {
          status: 500,
          headers: { 'cache-control': 'no-store' },
        });
      }

      const cleanPath = pathname.startsWith('/api/') ? pathname.slice(4) : pathname;

      // GET /v1/envelopes - list envelope IDs and byte sizes (metadata only)
      if (cleanPath === '/v1/envelopes') {
        if (method !== 'GET') {
          return new Response('Method not allowed', {
            status: 405,
            headers: { 'cache-control': 'no-store' },
          });
        }
        const listResult = await kv.list();
        const envelopes = [];
        for (const key of listResult.keys) {
          if (!ID_PATTERN.test(key.name)) continue;
          const metadataBytes = key.metadata?.bytes;
          if (typeof metadataBytes === 'number') {
            envelopes.push({ id: key.name, bytes: metadataBytes });
          } else {
            const payload = await kv.get(key.name, 'arrayBuffer');
            if (payload) {
              envelopes.push({ id: key.name, bytes: payload.byteLength });
            }
          }
        }
        envelopes.sort((left, right) => left.id.localeCompare(right.id));
        return new Response(JSON.stringify({ envelopes }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
          },
        });
      }

      const match = cleanPath.match(/^\/v1\/envelopes\/([^/]+)$/);
      if (!match) {
        return new Response('Not found', {
          status: 404,
          headers: { 'cache-control': 'no-store' },
        });
      }

      const id = match[1];

      // POST /v1/envelopes/:id - store opaque synthetic encrypted envelope
      if (method === 'POST') {
        if (!ID_PATTERN.test(id)) {
          return new Response('Invalid envelope schema', {
            status: 400,
            headers: { 'cache-control': 'no-store' },
          });
        }
        const contentType = request.headers.get('content-type');
        const envelopeVersion = request.headers.get('x-verma-envelope-version');
        if (contentType !== 'application/octet-stream' || envelopeVersion !== '1') {
          return new Response('Invalid envelope schema', {
            status: 400,
            headers: { 'cache-control': 'no-store' },
          });
        }

        const maxBytes = Number.parseInt(env?.RELAY_MAX_ENVELOPE_BYTES ?? '1048576', 10);
        const contentLengthHeader = request.headers.get('content-length');
        if (contentLengthHeader) {
          const declaredLength = Number.parseInt(contentLengthHeader, 10);
          if (Number.isSafeInteger(declaredLength) && declaredLength > maxBytes) {
            return new Response('Envelope too large', {
              status: 413,
              headers: { 'cache-control': 'no-store' },
            });
          }
        }

        const bodyBuffer = await request.arrayBuffer();
        if (!bodyBuffer || bodyBuffer.byteLength === 0) {
          return new Response('Invalid envelope', {
            status: 400,
            headers: { 'cache-control': 'no-store' },
          });
        }
        if (bodyBuffer.byteLength > maxBytes) {
          return new Response('Envelope too large', {
            status: 413,
            headers: { 'cache-control': 'no-store' },
          });
        }

        await kv.put(id, bodyBuffer, {
          metadata: { bytes: bodyBuffer.byteLength, storedAt: Date.now() },
        });

        return new Response(JSON.stringify({ id, bytes: bodyBuffer.byteLength }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
          },
        });
      }

      // GET /v1/envelopes/:id - retrieve exact binary payload
      if (method === 'GET') {
        if (!ID_PATTERN.test(id)) {
          return new Response('Invalid envelope id', {
            status: 400,
            headers: { 'cache-control': 'no-store' },
          });
        }
        const payload = await kv.get(id, 'arrayBuffer');
        if (!payload) {
          return new Response('Not found', {
            status: 404,
            headers: { 'cache-control': 'no-store' },
          });
        }
        return new Response(payload, {
          status: 200,
          headers: {
            'content-type': 'application/octet-stream',
            'cache-control': 'no-store',
          },
        });
      }

      return new Response('Method not allowed', {
        status: 405,
        headers: { 'cache-control': 'no-store' },
      });
    }

    return new Response('Not found', {
      status: 404,
      headers: { 'cache-control': 'no-store' },
    });
  } catch {
    return new Response('Internal server error', {
      status: 500,
      headers: { 'cache-control': 'no-store' },
    });
  }
}

export default {
  async fetch(request, env) {
    return handleRelayRequest(request, env);
  },
};
