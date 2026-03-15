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
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>Privacy</CardTitle>
        <CardDescription>
          Control your privacy settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Read Receipts</Label>
            <p className="text-sm text-muted-foreground">
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

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Compact Mode</Label>
            <p className="text-sm text-muted-foreground">
              Tighten spacing across dense conversation surfaces
            </p>
          </div>
          <Switch
            checked={settings?.compact_mode ?? false}
            onCheckedChange={(checked) =>
              handleToggle('compact_mode', checked)
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
