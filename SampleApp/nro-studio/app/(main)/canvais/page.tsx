// Canvais route — Konva is browser-only: mount the workspace ssr:false.
'use client';
import dynamic from 'next/dynamic';

const CanvaisWorkspace = dynamic(
  () => import('@/domains/canvais/CanvaisWorkspace').then((m) => m.CanvaisWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-ink-muted">
        Warming up the stage…
      </div>
    ),
  },
);

export default function Page() {
  return <CanvaisWorkspace />;
}
