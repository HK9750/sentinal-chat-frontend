'use client';

import { useCallback, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useUserProfile, useUpdateProfile } from '@/queries/use-user-queries';
import { useAuthStore } from '@/stores/auth-store';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Spinner } from '@/components/shared/spinner';
import { uploadFileBlob } from '@/services/upload-service';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';

export function ProfileTab() {
  const { data: profile } = useUserProfile();
  const updateProfile = useUpdateProfile();
  const user = useAuthStore((state) => state.user);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const effectiveAvatarUrl = avatarUrl ?? profile?.avatar_url ?? user?.avatar_url ?? null;

  const handleAvatarChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = '';

      if (!file) {
        return;
      }
      if (!file.type.startsWith('image/')) {
        setFeedback('Please choose an image file.');
        return;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        setFeedback('Avatar image is too large. Maximum allowed size is 15MB.');
        return;
      }

      setAvatarBusy(true);
      setFeedback(null);

      try {
        const uploaded = await uploadFileBlob(file, file.name);
        if (!uploaded.file_url) {
          throw new Error('missing file URL');
        }
        setAvatarUrl(uploaded.file_url);
        setFeedback('Avatar uploaded. Save changes to apply it.');
      } catch {
        setFeedback('Avatar upload failed. Please try again.');
      } finally {
        setAvatarBusy(false);
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);

      try {
        await updateProfile.mutateAsync({
          display_name: formData.get('display_name') as string,
          email: formData.get('email') as string,
          phone_number: formData.get('phone_number') as string,
          avatar_url: avatarUrl ?? undefined,
        });
        setFeedback('Profile saved successfully.');
      } catch {
        setFeedback('Failed to save profile changes.');
      }
    },
    [avatarUrl, updateProfile]
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
            <UserAvatar src={effectiveAvatarUrl} user={profile ?? user} size="xl" />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border/70"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
              >
                {avatarBusy ? 'Uploading avatar...' : 'Upload avatar'}
              </Button>
              {effectiveAvatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  onClick={() => setAvatarUrl('')}
                  disabled={avatarBusy}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}

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
              disabled={updateProfile.isPending || avatarBusy}
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
