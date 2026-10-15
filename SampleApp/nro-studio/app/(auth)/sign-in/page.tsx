// Sign in — the Login card: live inputs (placeholder submit), orange primary
// action, OR divider, bordered Dev Login. Dev Login is the working path.
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/core/authStore';

export default function SignInPage() {
  const router = useRouter();
  const devLogin = useAuthStore((s) => s.devLogin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Standard login attempted', { email, password });
  };

  const handleDevLogin = () => {
    devLogin();
    router.push('/dashboard');
  };

  const input =
    'mt-1 block w-full rounded-md border border-edge bg-surface-raised px-3 py-2 text-sm text-ink shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

  return (
    <div>
      <h2 className="mb-8 text-center text-2xl font-bold text-ink">Sign in to NRO Studio</h2>

      <form onSubmit={handleStandardLogin} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-ink-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </div>
        <button
          type="submit"
          className="flex w-full justify-center rounded-md border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-secondary-shadow focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
        >
          Sign in
        </button>
      </form>

      <div className="relative mt-6 flex items-center justify-center">
        <div className="absolute w-full border-b border-edge" />
        <span className="relative bg-surface-raised px-4 text-xs uppercase text-ink-muted">Or</span>
      </div>

      <button
        onClick={handleDevLogin}
        className="mt-6 flex w-full justify-center rounded-md border border-edge bg-surface-raised px-4 py-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
      >
        Dev Login
      </button>

      <p className="mt-6 text-center text-xs text-ink-muted">
        No account?{' '}
        <Link href="/sign-up" className="font-medium text-secondary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
