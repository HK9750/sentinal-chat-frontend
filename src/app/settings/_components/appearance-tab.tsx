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
    async (theme: 'LIGHT' | 'DARK' | 'SYSTEM') => {
      await updateSettings.mutateAsync({ theme });
    },
    [updateSettings]
  );

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Appearance</CardTitle>
        <CardDescription className="text-slate-400">
          Customize how Sentinel Chat looks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-slate-200">Theme</Label>
          <div className="grid grid-cols-3 gap-4">
            <Button
              type="button"
              variant={settings?.theme === 'LIGHT' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('LIGHT')}
              className="h-auto py-4 flex flex-col gap-2 border-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300" />
              <span className="text-xs">Light</span>
            </Button>
            <Button
              type="button"
              variant={settings?.theme === 'DARK' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('DARK')}
              className="h-auto py-4 flex flex-col gap-2 border-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700" />
              <span className="text-xs">Dark</span>
            </Button>
            <Button
              type="button"
              variant={settings?.theme === 'SYSTEM' ? 'default' : 'outline'}
              onClick={() => handleThemeChange('SYSTEM')}
              className="h-auto py-4 flex flex-col gap-2 border-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-900 border border-slate-400" />
              <span className="text-xs">System</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
