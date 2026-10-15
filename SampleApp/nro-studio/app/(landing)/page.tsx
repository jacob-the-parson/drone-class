// Landing / splash — the root route. The house visual language: soft surface,
// the orange NX mark, quiet typography.
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-surface px-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 rotate-12 items-center justify-center rounded-2xl bg-secondary shadow-md">
          <span className="-rotate-12 text-xl font-bold text-white">NX</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">NRO Studio</h1>
          <p className="text-sm text-ink-muted">2D · 3D · one creative platform</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/sign-in"
          className="rounded-md bg-secondary px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-secondary-shadow"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md border border-edge bg-surface-raised px-5 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-surface-sunken"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
