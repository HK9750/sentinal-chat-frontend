'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useUserSettings, useUpdateSettings } from '@/queries/use-user-queries';

export function PrivacyTab() {
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
        <CardTitle className="text-slate-100">Privacy</CardTitle>
        <CardDescription className="text-slate-400">
          Control your privacy settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-slate-200">Read Receipts</Label>
            <p className="text-sm text-slate-500">
              Let others know when you&apos;ve read their messages
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
            <Label className="text-slate-200">Last Seen</Label>
            <p className="text-sm text-slate-500">
              Show when you were last active
            </p>
          </div>
          <Switch
            checked={settings?.privacy_last_seen === 'EVERYONE'}
            onCheckedChange={(checked) =>
              handleToggle('privacy_last_seen', checked ? 'EVERYONE' : 'NOBODY')
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
