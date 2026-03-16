'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUserSettings, useUpdateSettings } from '@/queries/use-user-queries';

export function AppearanceTab() {
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateSettings();

  const handleThemeChange = useCallback(
    async (theme: 'light' | 'dark' | 'system') => {
      await updateSettings.mutateAsync({ theme });
    },
    [updateSettings]
  );

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how Sentinel Chat looks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <div className="grid grid-cols-3 gap-4">
            <Button
              type="button"
              variant={settings?.theme === 'light' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('light')}
              className="h-auto flex flex-col gap-2 border-border/70 py-4"
            >
              <div className="h-8 w-8 rounded-full border border-border bg-background" />
              <span className="text-xs">Light</span>
            </Button>
            <Button
              type="button"
              variant={settings?.theme === 'dark' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('dark')}
              className="h-auto flex flex-col gap-2 border-border/70 py-4"
            >
              <div className="h-8 w-8 rounded-full border border-border bg-foreground" />
              <span className="text-xs">Dark</span>
            </Button>
            <Button
              type="button"
              variant={settings?.theme === 'system' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('system')}
              className="h-auto flex flex-col gap-2 border-border/70 py-4"
            >
              <div className="h-8 w-8 rounded-full border border-border bg-muted" />
              <span className="text-xs">System</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
