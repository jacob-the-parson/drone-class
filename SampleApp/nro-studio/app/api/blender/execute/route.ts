// POST /api/blender/execute — run bpy code in the live Blender (loopback-only).
// Body: { code: string, strictJson?: boolean }
import { blenderExec, isLoopbackRequest, relayUnavailable } from '@/lib/blenderRelay';

export async function POST(request: Request) {
  if (!isLoopbackRequest(request)) return relayUnavailable();
  let body: { code?: string; strictJson?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }
  if (!body.code?.trim()) {
    return Response.json({ ok: false, error: 'no code provided' }, { status: 400 });
  }
  try {
    const resp = await blenderExec(body.code, body.strictJson ?? false);
    return Response.json({
      ok: resp.status === 'ok',
      result: resp.result ?? null,
      stdout: resp.stdout ?? '',
      stderr: resp.stderr ?? '',
      error: resp.status === 'ok' ? undefined : (resp.message ?? 'blender error'),
    });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
