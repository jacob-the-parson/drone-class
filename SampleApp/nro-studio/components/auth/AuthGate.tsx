// AuthGate — client-side guard for the (main) group: unauthenticated visitors
// are bounced to /sign-in. Session is deliberately in-memory, so the gate is
// a client concern by design; server-side sessions arrive with real auth.
'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/core/authStore';

export function AuthGate({ children }: { children: ReactNode }) {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthed) router.replace('/sign-in');
  }, [isAuthed, router]);

  if (!isAuthed) return null;
  return <>{children}</>;
}
