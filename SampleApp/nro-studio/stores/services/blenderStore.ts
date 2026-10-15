// Blender relay service store — client half of the local-companion bridge.
// Generic transport (status + execute); domains build their own bpy payloads
// (creator's palette push lives creator-side). Localhost-only by nature.
import { create } from 'zustand';

interface BlenderState {
  connected: boolean | null; // null = never checked
  blenderVersion: string | null;
  sceneName: string | null;
  checking: boolean;
  busy: boolean;
  lastMessage: string;
  checkStatus: () => Promise<boolean>;
  execute: (code: string, strictJson?: boolean) => Promise<{ ok: boolean; result?: unknown; error?: string; stdout?: string }>;
}

export const useBlenderStore = create<BlenderState>((set) => ({
  connected: null,
  blenderVersion: null,
  sceneName: null,
  checking: false,
  busy: false,
  lastMessage: '',

  checkStatus: async () => {
    set({ checking: true });
    try {
      const res = await fetch('/api/blender/status');
      const data = await res.json();
      const connected = !!data.connected;
      set({
        connected,
        blenderVersion: data.blender ?? null,
        sceneName: data.scene ?? null,
        lastMessage: connected ? `Blender ${data.blender} · scene "${data.scene}"` : (data.error ?? 'not connected'),
      });
      return connected;
    } catch (e) {
      set({ connected: false, lastMessage: (e as Error).message });
      return false;
    } finally {
      set({ checking: false });
    }
  },

  execute: async (code, strictJson = false) => {
    set({ busy: true });
    try {
      const res = await fetch('/api/blender/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, strictJson }),
      });
      const data = await res.json();
      set({ lastMessage: data.ok ? 'ok' : (data.error ?? 'error'), connected: data.ok ? true : undefined });
      return data;
    } catch (e) {
      const error = (e as Error).message;
      set({ lastMessage: error });
      return { ok: false, error };
    } finally {
      set({ busy: false });
    }
  },
}));
