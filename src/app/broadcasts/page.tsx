import { BroadcastList } from './_components/broadcast-list';

export default function BroadcastsPage() {
  return (
    <main className="page-shell">
      <div className="dashboard-frame min-h-[calc(100vh-2rem)]">
        <BroadcastList />
      </div>
    </main>
  );
}
