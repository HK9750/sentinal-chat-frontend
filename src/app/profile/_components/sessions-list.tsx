'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSessions } from '@/queries/use-auth-queries';
import type { AuthSession } from '@/types';
import { Shield, Activity } from 'lucide-react';

export function SessionsList() {
  const { data: sessionsPayload } = useSessions();
  const sessions = sessionsPayload?.items ?? [];

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Active Sessions
        </CardTitle>
        <CardDescription className="text-slate-400">
          View and manage your login sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions?.length === 0 && (
            <p className="text-sm text-slate-500">No active sessions</p>
          )}
          {sessions?.map((session: AuthSession) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slate-700">
                  <Activity className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {session.device.device_name || 'Unknown device'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {session.device.device_type || 'Unknown type'}
                  </p>
                </div>
              </div>
              {session.is_current ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">
                  Current
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
