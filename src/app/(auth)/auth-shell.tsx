'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthShellProps {
  title: string;
  description: string;
  cardTitle: string;
  cardDescription: string;
  footerText: string;
  footerHref: string;
  footerLabel: string;
  children: ReactNode;
}

export function AuthShell({
  title,
  description,
  cardTitle,
  cardDescription,
  footerText,
  footerHref,
  footerLabel,
  children,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-28 top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-24 bottom-12 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute inset-0 grid-noise opacity-35" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary text-primary-foreground shadow-lg">
            <ShieldCheck className="size-7" />
          </div>
          <div className="space-y-1.5">
            <p className="section-kicker">Private By Design</p>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-foreground">{title}</h1>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <Card className="surface-panel border-border/60 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-xl font-semibold tracking-[-0.04em]">{cardTitle}</CardTitle>
            <CardDescription>{cardDescription}</CardDescription>
          </CardHeader>

          <CardContent>{children}</CardContent>

          <CardFooter className="justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              {footerText}{' '}
              <Link href={footerHref} className="font-semibold text-primary transition-colors hover:text-primary/80">
                {footerLabel}
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground/70">
          End-to-end encryption lives on your device
        </p>
      </div>
    </div>
  );
}
