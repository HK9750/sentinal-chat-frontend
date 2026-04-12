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
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Manage how you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>In-app Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notification cards inside Sentinel Chat
            </p>
          </div>
          <Switch
            checked={settings?.in_app_notifications ?? true}
            onCheckedChange={(checked) =>
              handleToggle('in_app_notifications', checked)
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Message Sounds</Label>
            <p className="text-sm text-muted-foreground">
              Play a sound for new messages in supported browsers
            </p>
          </div>
          <Switch
            checked={settings?.sound_enabled ?? true}
            onCheckedChange={(checked) =>
              handleToggle('sound_enabled', checked)
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Message Preview</Label>
            <p className="text-sm text-muted-foreground">
              Show sender message text in notifications
            </p>
          </div>
          <Switch
            checked={settings?.show_message_preview ?? true}
            onCheckedChange={(checked) =>
              handleToggle('show_message_preview', checked)
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enter to Send</Label>
            <p className="text-sm text-muted-foreground">
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

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Reduce Motion</Label>
            <p className="text-sm text-muted-foreground">
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
