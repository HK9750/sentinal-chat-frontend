export interface Broadcast {
  id: string;
  title: string;
  description: string;
  audience: string;
  status: 'unavailable' | 'draft';
}

export interface BroadcastDetail extends Broadcast {
  notes: string[];
}
