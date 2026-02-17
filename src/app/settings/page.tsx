'use client';

import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bell, Palette, Shield, User } from 'lucide-react';
import Link from 'next/link';

import { ProfileTab } from './_components/profile-tab';
import { NotificationsTab } from './_components/notifications-tab';
import { AppearanceTab } from './_components/appearance-tab';
import { PrivacyTab } from './_components/privacy-tab';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/50 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4">
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
              <h1 className="text-xl font-semibold text-white">Settings</h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-slate-900 border border-slate-800">
              <TabsTrigger
                value="profile"
                className="data-[state=active]:bg-slate-800"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-slate-800"
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="data-[state=active]:bg-slate-800"
              >
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger
                value="privacy"
                className="data-[state=active]:bg-slate-800"
              >
                <Shield className="h-4 w-4 mr-2" />
                Privacy
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <ProfileTab />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <NotificationsTab />
            </TabsContent>

            <TabsContent value="appearance" className="mt-6">
              <AppearanceTab />
            </TabsContent>

            <TabsContent value="privacy" className="mt-6">
              <PrivacyTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  );
}
