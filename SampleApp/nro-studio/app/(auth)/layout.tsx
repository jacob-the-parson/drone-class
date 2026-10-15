// (auth) layout — the Login chrome: soft page, elevated white card.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-xl bg-surface-raised p-8 shadow-lg">
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 rotate-12 items-center justify-center rounded-2xl bg-secondary">
            <span className="-rotate-12 text-2xl font-bold text-white">NX</span>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
