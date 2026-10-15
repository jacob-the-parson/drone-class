// Blender relay — SERVER-SIDE ONLY (route handlers). Speaks the official
// Blender Lab MCP add-on's null-byte-delimited JSON protocol directly over
// TCP (the same wire nro-blender/mcp/mcp_bridge.py uses):
//   send: {"type":"execute","code":"<python>","strict_json":bool}\0
//   recv: {"status":"ok","result":{...},"stdout":"...","stderr":"..."}\0
// LAWS: loopback-only (Blender and this app share a machine), graceful no-op
// when Blender isn't listening — never crash the app over a closed socket.
import net from 'node:net';

const BLENDER_HOST = process.env.BLENDER_HOST ?? '127.0.0.1';
const BLENDER_PORT = parseInt(process.env.BLENDER_PORT ?? '9876', 10);
const TIMEOUT_MS = parseInt(process.env.BLENDER_TIMEOUT_MS ?? '30000', 10);

export interface BlenderResponse {
  status: string;
  result?: unknown;
  stdout?: string;
  stderr?: string;
  message?: string;
}

export function blenderExec(code: string, strictJson = false): Promise<BlenderResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: BLENDER_HOST, port: BLENDER_PORT });
    const chunks: Buffer[] = [];
    let settled = false;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(TIMEOUT_MS, () => fail(new Error('Blender connection timed out')));
    socket.on('error', fail);

    socket.on('connect', () => {
      socket.write(
        Buffer.concat([
          Buffer.from(JSON.stringify({ type: 'execute', code, strict_json: strictJson }), 'utf-8'),
          Buffer.from([0]),
        ]),
      );
    });

    socket.on('data', (chunk) => {
      chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      const zero = buf.indexOf(0);
      if (zero !== -1 && !settled) {
        settled = true;
        socket.end();
        try {
          resolve(JSON.parse(buf.subarray(0, zero).toString('utf-8')));
        } catch (e) {
          reject(e as Error);
        }
      }
    });

    socket.on('close', () => fail(new Error('Blender closed the connection early')));
  });
}

/** The relay only ever serves the machine it runs on. */
export function isLoopbackRequest(request: Request): boolean {
  const host = request.headers.get('host') ?? '';
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]');
}

export const relayUnavailable = () =>
  Response.json(
    { available: false, error: 'Blender relay serves localhost only' },
    { status: 403 },
  );
