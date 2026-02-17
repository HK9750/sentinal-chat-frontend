import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IncomingCallDialog } from '@/components/shared/incoming-call-dialog';
import { ActiveCallOverlay } from '@/components/shared/active-call-overlay';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sentinel Chat',
  description: 'Secure end-to-end encrypted messaging platform',
  keywords: ['chat', 'messaging', 'secure', 'encrypted', 'privacy'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
      >
        <QueryProvider>
          <ThemeProvider>
            <SocketProvider>
              <TooltipProvider delayDuration={200}>
                {children}
                {/* Global call UI components */}
                <IncomingCallDialog />
                <ActiveCallOverlay />
              </TooltipProvider>
            </SocketProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
