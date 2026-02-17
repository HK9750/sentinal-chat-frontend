import { BroadcastList } from './_components/broadcast-list';

export default function BroadcastsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto h-screen">
        <BroadcastList />
      </div>
    </main>
  );
}
