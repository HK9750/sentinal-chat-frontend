'use client';

import { AuthGuard } from '@/components/auth-guard';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Spinner } from '@/components/shared/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUserProfile, useContacts } from '@/queries/use-user-queries';
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
import { format } from 'date-fns';

import { StatCard } from './_components/stat-card';
import { DevicesList } from './_components/devices-list';
import { SessionsList } from './_components/sessions-list';

export default function ProfilePage() {
  const { data: profile } = useUserProfile();
  const { data: contacts } = useContacts();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-slate-400 hover:text-white"
                >
                  <Link href="/chat">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <h1 className="text-xl font-semibold text-white">Profile</h1>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => logout.mutate()}
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

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          {/* Profile Card */}
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <UserAvatar user={user} size="xl" showStatus isOnline />
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-2xl font-bold text-white">
                    {profile?.display_name || user?.display_name}
                  </h2>
                  <p className="text-slate-400">
                    @{profile?.username || user?.username}
                  </p>
                  {profile?.status && (
                    <p className="text-slate-500 mt-2">{profile.status}</p>
                  )}

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-sm text-slate-500">
                    {profile?.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {profile.email}
                      </div>
                    )}
                    {profile?.created_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {format(new Date(profile.created_at), 'MMMM yyyy')}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="border-slate-700 text-slate-300"
                >
                  <Link href="/settings">Edit Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Contacts"
              value={contacts?.length || 0}
              icon={Users}
              description="People in your contact list"
            />
            <StatCard
              title="Devices"
              value={0}
              icon={Smartphone}
              description="Connected devices"
            />
            <StatCard
              title="Sessions"
              value={0}
              icon={Shield}
              description="Active login sessions"
            />
          </div>

          {/* Devices & Sessions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DevicesList />
            <SessionsList />
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
