import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { siteConfig } from '@/config/site';
import { AuthBootstrapProvider } from '@/providers/auth-bootstrap-provider';
import { AuthenticatedProviders } from '@/providers/authenticated-providers';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import './globals.css';

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${monoFont.variable} app-shell antialiased`}>
        <QueryProvider>
          <AuthBootstrapProvider>
            <ThemeProvider>
              <AuthenticatedProviders>
                <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
              </AuthenticatedProviders>
            </ThemeProvider>
          </AuthBootstrapProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
