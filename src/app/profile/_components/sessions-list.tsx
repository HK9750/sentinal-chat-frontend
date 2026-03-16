'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSessions } from '@/queries/use-auth-queries';
import type { AuthSession } from '@/types';
import { Shield, Activity } from 'lucide-react';

export function SessionsList() {
  const { data: sessionsPayload, isLoading, isError } = useSessions();
  const sessions = sessionsPayload?.items ?? [];

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5" />
          Active Sessions
        </CardTitle>
        <CardDescription>
          View and manage your login sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading sessions...</p>}
          {isError && <p className="text-sm text-destructive">Unable to load sessions right now.</p>}
          {!isLoading && !isError && sessions?.length === 0 && (
            <p className="text-sm text-muted-foreground">No active sessions</p>
          )}
          {sessions?.map((session: AuthSession) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="rounded bg-muted p-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {session.device.device_name || 'Unknown device'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.device.device_type || 'Unknown type'}
                  </p>
                </div>
              </div>
              {session.is_current ? (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
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
