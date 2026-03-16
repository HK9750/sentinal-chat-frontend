'use client';

import { AuthGuard } from '@/components/auth-guard';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Spinner } from '@/components/shared/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDevices, useSessions, useUserProfile, useContacts } from '@/queries/use-user-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/queries/use-auth-queries';
import {
  ArrowLeft,
  LogOut,
  Smartphone,
  Users,
  Shield,
  Mail,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

import { StatCard } from './_components/stat-card';
import { DevicesList } from './_components/devices-list';
import { SessionsList } from './_components/sessions-list';

export default function ProfilePage() {
  const { data: profile } = useUserProfile();
  const { data: contacts } = useContacts();
  const { data: devices } = useDevices();
  const { data: sessions } = useSessions();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link href="/chat">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <h1 className="text-xl font-semibold text-foreground">Profile</h1>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => logout.mutate(undefined)}
                disabled={logout.isPending}
              >
                {logout.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <Card className="border-border bg-card">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <UserAvatar user={user} size="xl" showStatus isOnline />
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile?.display_name || user?.display_name}
                  </h2>
                  <p className="text-muted-foreground">
                    @{profile?.username || user?.username}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground md:justify-start">
                    {profile?.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {profile.email}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Secure account
                    </div>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="border-border text-foreground"
                >
                  <Link href="/settings">Edit Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Contacts"
              value={contacts?.length || 0}
              icon={Users}
              description="People in your contact list"
            />
            <StatCard
              title="Devices"
              value={devices?.length || 0}
              icon={Smartphone}
              description="Connected devices"
            />
            <StatCard
              title="Sessions"
              value={sessions?.length || 0}
              icon={Shield}
              description="Active login sessions"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DevicesList />
            <SessionsList />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
