'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDevices } from '@/queries/use-user-queries';
import { Smartphone } from 'lucide-react';

export function DevicesList() {
  const { data: devices, isLoading, isError } = useDevices();

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Smartphone className="h-5 w-5" />
          Devices
        </CardTitle>
        <CardDescription>
          Manage your connected devices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading devices...</p>}
          {isError && <p className="text-sm text-destructive">Unable to load devices right now.</p>}
          {!isLoading && !isError && devices?.length === 0 && (
            <p className="text-sm text-muted-foreground">No devices found</p>
          )}
          {devices?.map((device) => (
            <div
              key={device.session_id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="rounded bg-muted p-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {device.name}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {device.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {device.is_current ? (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    Current
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    Saved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
