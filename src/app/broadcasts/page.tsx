import { Suspense } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { Spinner } from '@/components/shared/spinner';
import { BroadcastList } from './_components/broadcast-list';

export default function BroadcastsPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background">
            <Spinner size="lg" />
          </div>
        }
      >
        <main className="page-shell">
          <div className="dashboard-frame min-h-[calc(100vh-2rem)]">
            <BroadcastList />
          </div>
        </main>
      </Suspense>
    </AuthGuard>
  );
}
