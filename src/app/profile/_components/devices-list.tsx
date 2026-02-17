'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDevices } from '@/queries/use-user-queries';
import { Smartphone } from 'lucide-react';

export function DevicesList() {
  const { data: devices } = useDevices();

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Devices
        </CardTitle>
        <CardDescription className="text-slate-400">
          Manage your connected devices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {devices?.length === 0 && (
            <p className="text-sm text-slate-500">No devices found</p>
          )}
          {devices?.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slate-700">
                  <Smartphone className="h-4 w-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {device.device_name}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {device.device_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {device.is_active ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-400">
                    Offline
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
