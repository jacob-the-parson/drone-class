// GET /api/blender/status — is Blender listening? (loopback-only)
import { blenderExec, isLoopbackRequest, relayUnavailable } from '@/lib/blenderRelay';

export async function GET(request: Request) {
  if (!isLoopbackRequest(request)) return relayUnavailable();
  try {
    const resp = await blenderExec(
      "import bpy\nresult = {'ok': True, 'blender': bpy.app.version_string, 'scene': bpy.context.scene.name}",
      true,
    );
    if (resp.status === 'ok') {
      return Response.json({ available: true, connected: true, ...(resp.result as object) });
    }
    return Response.json({ available: true, connected: false, error: resp.message ?? 'blender error' });
  } catch (e) {
    // graceful no-op: Blender simply isn't running/listening
    return Response.json({ available: true, connected: false, error: (e as Error).message });
  }
}
