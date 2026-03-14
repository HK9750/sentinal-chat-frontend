import type { Broadcast, BroadcastDetail } from '@/types';

const broadcasts: Broadcast[] = [
  {
    id: 'backend-unavailable',
    title: 'Broadcast transport not wired yet',
    description: 'The current backend build does not expose broadcast routes, so this surface stays in planning mode.',
    audience: 'all teams',
    status: 'unavailable',
  },
];

export async function listBroadcasts(): Promise<Broadcast[]> {
  return broadcasts;
}

export async function getBroadcastDetail(broadcastId: string): Promise<BroadcastDetail> {
  const broadcast = broadcasts.find((item) => item.id === broadcastId) ?? broadcasts[0];

  return {
    ...broadcast,
    notes: [
      'No `/v1/broadcasts` endpoints were found in the bundled backend.',
      'Keep this view as an intentional placeholder until backend transport exists.',
      'Use direct conversations and groups for now.',
    ],
  };
}
