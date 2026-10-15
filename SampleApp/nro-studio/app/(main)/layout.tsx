// (main) layout — every main route renders inside the Shell chrome, behind the
// auth gate. Server component by design; AuthGate + Shell are client islands.
import { AuthGate } from '@/components/auth/AuthGate';
import { Shell } from '@/components/shell/Shell';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}
