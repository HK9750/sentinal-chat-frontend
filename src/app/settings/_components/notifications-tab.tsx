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
            checked={settings?.sound_enabled ?? true}
            onCheckedChange={(checked) =>
              handleToggle('sound_enabled', checked)
            }
          />
        </div>

        <Separator className="bg-slate-800" />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-slate-200">Enter to Send</Label>
            <p className="text-sm text-slate-500">
              Press Enter to send instead of creating a new line
            </p>
          </div>
          <Switch
            checked={settings?.enter_to_send ?? true}
            onCheckedChange={(checked) =>
              handleToggle('enter_to_send', checked)
            }
          />
        </div>

        <Separator className="bg-slate-800" />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-slate-200">Reduce Motion</Label>
            <p className="text-sm text-slate-500">
              Tone down non-essential animations across the app
            </p>
          </div>
          <Switch
            checked={settings?.reduce_motion ?? false}
            onCheckedChange={(checked) =>
              handleToggle('reduce_motion', checked)
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
