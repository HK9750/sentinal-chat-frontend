'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSessions } from '@/queries/use-auth-queries';
import { UserSession } from '@/types';
import { Shield, Activity } from 'lucide-react';

export function SessionsList() {
  const { data: sessions } = useSessions();

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
          {sessions?.map((session: UserSession) => (
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
                    {session.device_name || 'Unknown Device'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {session.device_type}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
