'use client';

import { useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useUserProfile, useUpdateProfile } from '@/queries/use-user-queries';
import { useAuthStore } from '@/stores/auth-store';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Spinner } from '@/components/shared/spinner';

export function ProfileTab() {
  const { data: profile } = useUserProfile();
  const updateProfile = useUpdateProfile();
  const user = useAuthStore((state) => state.user);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);

      await updateProfile.mutateAsync({
        display_name: formData.get('display_name') as string,
        email: formData.get('email') as string,
        phone_number: formData.get('phone_number') as string,
      });
    },
    [updateProfile]
  );

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100">Profile Information</CardTitle>
        <CardDescription className="text-slate-400">
          Update your personal information and how others see you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} size="xl" />
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300"
              >
                Change Avatar
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>

          <Separator className="bg-slate-800" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display_name" className="text-slate-300">
                Display Name
              </Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={profile?.display_name || user?.display_name}
                className="bg-slate-800 border-slate-700 text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-300">
                Username
              </Label>
                <Input
                  id="username"
                  defaultValue={profile?.username || user?.username || ''}
                  disabled
                  className="bg-slate-800/50 border-slate-700 text-slate-500"
                />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              defaultValue={profile?.email || user?.email || ''}
              placeholder="name@example.com"
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number" className="text-slate-300">
              Phone Number
            </Label>
            <Input
              id="phone_number"
              name="phone_number"
              defaultValue={profile?.phone_number || user?.phone_number || ''}
              placeholder="Optional"
              className="bg-slate-800 border-slate-700 text-slate-200"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {updateProfile.isPending ? (
                <>
                  <Spinner size="sm" className="mr-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
