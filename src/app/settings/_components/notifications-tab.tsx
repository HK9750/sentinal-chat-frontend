'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useUserSettings, useUpdateSettings } from '@/queries/use-user-queries';

export function NotificationsTab() {
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateSettings();

  const handleToggle = useCallback(
    async (key: string, value: boolean | string) => {
      await updateSettings.mutateAsync({ [key]: value });
    },
    [updateSettings]
  );

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Notifications</CardTitle>
        <CardDescription className="text-slate-400">
          Manage how you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-slate-200">Enable Notifications</Label>
            <p className="text-sm text-slate-500">
              Receive push notifications for new messages
            </p>
          </div>
          <Switch
            checked={settings?.notifications_enabled ?? true}
            onCheckedChange={(checked) =>
              handleToggle('notifications_enabled', checked)
            }
          />
        </div>

        <Separator className="bg-slate-800" />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-slate-200">Message Preview</Label>
            <p className="text-sm text-slate-500">
              Show message content in notifications
            </p>
          </div>
          <Switch
            checked={settings?.read_receipts ?? true}
            onCheckedChange={(checked) =>
              handleToggle('read_receipts', checked)
            }
          />
        </div>

        <Separator className="bg-slate-800" />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-slate-200">Sound</Label>
            <p className="text-sm text-slate-500">
              Play sound for new messages
            </p>
          </div>
          <Switch
            checked={settings?.notification_sound !== 'none'}
            onCheckedChange={(checked) =>
              handleToggle('notification_sound', checked ? 'default' : 'none')
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
