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
    <Card className="border-border/70 bg-card">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
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
                className="border-border/70"
                disabled
              >
                Avatar updates next
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Profile edits are local-only until profile APIs are added to the backend.
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display_name">
                Display Name
              </Label>
              <Input
                id="display_name"
                name="display_name"
                defaultValue={profile?.display_name || user?.display_name}
                className="border-border/70 bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">
                Username
              </Label>
                <Input
                  id="username"
                  defaultValue={profile?.username || user?.username || ''}
                  disabled
                  className="border-border/70 bg-muted/40 text-muted-foreground"
                />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              defaultValue={profile?.email || user?.email || ''}
              placeholder="name@example.com"
              className="border-border/70 bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">
              Phone Number
            </Label>
            <Input
              id="phone_number"
              name="phone_number"
              defaultValue={profile?.phone_number || user?.phone_number || ''}
              placeholder="Optional"
              className="border-border/70 bg-background"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateProfile.isPending}
            >
                {updateProfile.isPending ? (
                  <>
                  <Spinner size="sm" className="mr-2" />
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
