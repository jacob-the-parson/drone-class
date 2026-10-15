// CreatorSettings — the Blender bridge config (the staged tab, fulfilled):
// relay status, connection check, live scene readout. Loopback-only by law.
'use client';
import { useEffect } from 'react';
import { Cable, RefreshCw } from 'lucide-react';
import { useBlenderStore } from '@/stores/services/blenderStore';

export function CreatorSettings() {
  const connected = useBlenderStore((s) => s.connected);
  const blenderVersion = useBlenderStore((s) => s.blenderVersion);
  const sceneName = useBlenderStore((s) => s.sceneName);
  const checking = useBlenderStore((s) => s.checking);
  const lastMessage = useBlenderStore((s) => s.lastMessage);
  const checkStatus = useBlenderStore((s) => s.checkStatus);

  useEffect(() => {
    if (connected === null) checkStatus();
  }, [connected, checkStatus]);

  const dot =
    connected === null ? 'bg-zinc-400' : connected ? 'bg-primary' : 'bg-red-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <Cable size={15} className="text-cyan-600 dark:text-cyan-400" /> Blender Bridge
      </div>

      <div className="flex items-center justify-between rounded-lg border border-edge bg-surface-sunken/50 p-3">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          <div className="text-sm text-ink">
            {connected === null ? 'Not checked' : connected ? 'Connected' : 'Not connected'}
            <div className="text-xs text-ink-muted">
              {connected && blenderVersion
                ? `Blender ${blenderVersion} · scene "${sceneName}"`
                : lastMessage || 'Blender Lab MCP add-on on 127.0.0.1:9876'}
            </div>
          </div>
        </div>
        <button
          onClick={checkStatus}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-md border border-edge px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-50"
        >
          <RefreshCw size={13} className={checking ? 'animate-spin' : ''} /> Check
        </button>
      </div>

      <p className="rounded-lg border border-dashed border-edge p-3 text-xs leading-relaxed text-ink-muted">
        The relay is <strong>localhost-only</strong> and no-ops when deployed. It speaks the
        official Blender Lab add-on protocol (same wire as the MCP bridge). With Blender
        connected, the Regions panel&apos;s push SYNCS the live palette into Blender —
        building the per-gender <code>eon.skin.toon.idcolor.body_*</code> material (all 42
        regions, body ID map from the shader library) or fast-updating its colors. The
        recipe is canonical; both engines resolve it. Env: <code>BLENDER_HOST</code> /{' '}
        <code>BLENDER_PORT</code>.
      </p>
    </div>
  );
}
