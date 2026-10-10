import { parseArgs } from 'node:util';

export function previewPort(defaultPort, args = process.argv.slice(2), env = process.env) {
  const { values } = parseArgs({ args, options: { port: { type: 'string' } } });
  const raw = values.port ?? env.PORT ?? String(defaultPort);
  if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 65535) {
    throw new Error('Port must be an integer from 1 to 65535. Use --port 5127.');
  }
  return Number(raw);
}
