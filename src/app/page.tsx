"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCheck,
  Lock,
  MessageSquare,
  Mic,
  Paperclip,
  Phone,
  Search,
  Settings,
  Shield,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_LIMITATIONS } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

interface CapabilityCard {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets: string[];
  accentClass: string;
}

interface ArchitectureHighlight {
  title: string;
  description: string;
  icon: LucideIcon;
}

const heroSignals = [
  "Realtime text, files, voice notes, and polls",
  "Audio and video calling for direct conversations",
  "Notification center with unread sync and deep links",
  "OAuth + password auth with session and device visibility",
];

const capabilityCards: CapabilityCard[] = [
  {
    title: "Live Message Engine",
    description:
      "Socket events and optimistic rendering keep every conversation fast and responsive.",
    icon: MessageSquare,
    bullets: [
      "Typing, presence, and message events stream over a persistent channel.",
      "Pending messages reconcile with server acknowledgements automatically.",
      "Receipts track sent, delivered, read, and played states.",
      "Reply, edit, forward, react, and multi-select actions are built in.",
    ],
    accentClass: "from-primary/25 via-primary/10 to-transparent",
  },
  {
    title: "Rich Composer",
    description:
      "A single composer handles text, voice notes, file uploads, emoji, and polls.",
    icon: Mic,
    bullets: [
      "Voice notes are recorded in-browser and uploaded with progress feedback.",
      "Bulk file attachments move through uploading, registering, and sending states.",
      "Polls support single or multiple answers with optional closing dates.",
      "Enter-to-send and editing flows respect user preferences.",
    ],
    accentClass: "from-accent/90 via-primary/10 to-transparent",
  },
  {
    title: "Integrated Calls",
    description:
      "WebRTC calling is wired directly into the chat experience without context switching.",
    icon: Phone,
    bullets: [
      "Direct chats support both audio and video calling.",
      "ICE restart and connection-state monitoring improve reliability.",
      "Optional TURN credentials support stricter network environments.",
      "Call quality metrics track RTT, packet loss, and media health.",
    ],
    accentClass: "from-secondary via-muted to-transparent",
  },
  {
    title: "Notification Workflow",
    description:
      "Unread state is synchronized across badges, panel views, and navigation paths.",
    icon: BellRing,
    bullets: [
      "Badge counts update in real time through dedicated events.",
      "The notification panel supports mark-read and open actions.",
      "Desktop in-app toast delivery can be toggled independently.",
      "Conversation filters help prioritize unread and group threads.",
    ],
    accentClass: "from-primary/20 via-accent/70 to-transparent",
  },
  {
    title: "Identity and Access",
    description:
      "Authentication and account surfaces are built for secure, multi-device usage.",
    icon: Shield,
    bullets: [
      "Google and GitHub OAuth use PKCE-based authorization flows.",
      "Password auth remains available for standard login/signup.",
      "Access tokens are refreshed during bootstrap before protected actions.",
      "Profile views expose contacts, active sessions, and linked devices.",
    ],
    accentClass: "from-primary/20 via-muted/50 to-transparent",
  },
  {
    title: "Privacy and Controls",
    description:
      "Users can tune visibility, interruptions, and retention behavior in context.",
    icon: Lock,
    bullets: [
      "Read receipts, compact mode, and motion settings are configurable.",
      "Conversation mute windows range from one hour to forever.",
      "Disappearing message durations include 24 hours, 7 days, and 90 days.",
      "Undo and redo command support reduces destructive mistakes.",
    ],
    accentClass: "from-accent/70 via-secondary to-transparent",
  },
];

const architectureHighlights: ArchitectureHighlight[] = [
  {
    title: "Low-latency transport",
    description:
      "Realtime channels power typing, receipts, notifications, and call signaling from the same session.",
    icon: Zap,
  },
  {
    title: "Delivery confidence",
    description:
      "Message state transitions and playback receipts provide clear delivery feedback for text and audio.",
    icon: CheckCheck,
  },
  {
    title: "Focused retrieval",
    description:
      "Search and message navigation keep high-volume threads manageable during active conversations.",
    icon: Search,
  },
  {
    title: "Preference-aware UX",
    description:
      "Theme, notification, privacy, and motion settings shape the interface behavior without page reloads.",
    icon: Settings,
  },
];

const firstMinuteSteps = [
  {
    title: "Authenticate",
    detail: "Sign in with OAuth or password and restore your secured session automatically.",
  },
  {
    title: "Start a conversation",
    detail: "Send text instantly, attach files, drop voice notes, or create a poll from one composer.",
  },
  {
    title: "Scale when needed",
    detail: "Escalate to voice/video, tune notifications, and manage devices from profile/settings.",
  },
];

export default function LandingPage() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSignedIn = isHydrated && isAuthenticated;

  const primaryAction = isSignedIn
    ? { href: "/chat", label: "Open Chat Workspace" }
    : { href: "/register", label: "Create Free Account" };
  const secondaryAction = isSignedIn
    ? { href: "/settings", label: "Review Settings" }
    : { href: "/login", label: "Sign In" };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[380px] w-[860px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-120px] top-[34%] h-[260px] w-[260px] rounded-full bg-accent/70 blur-3xl" />
        <div className="absolute left-[-120px] top-[62%] h-[240px] w-[240px] rounded-full bg-secondary blur-3xl" />
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in srgb, var(--color-border) 45%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-border) 45%, transparent) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold leading-none text-foreground">Sentinel Chat</p>
              <p className="text-xs text-muted-foreground">Secure realtime workspace</p>
            </div>
          </div>

          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <Link href="#features" className="transition-colors hover:text-foreground">
              Feature map
            </Link>
            <Link href="#workflow" className="transition-colors hover:text-foreground">
              Workflow
            </Link>
            <Link href="#security" className="transition-colors hover:text-foreground">
              Security
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {!isHydrated ? (
              <div className="h-9 w-40 animate-pulse rounded-md bg-muted/70" aria-hidden />
            ) : isSignedIn ? (
              <>
                <Link href="/profile" className="hidden sm:block">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                    Profile
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button>Open Chat</Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="pb-14 pt-12 md:pb-18 md:pt-18">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div className="space-y-7 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                  Messaging, calling, and collaboration in one secure realtime surface.
                </h1>
                <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                  This landing page now mirrors what Sentinel Chat actually ships today: optimistic realtime messaging,
                  voice/video calls, notification workflows, privacy controls, and account-level session security.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {heroSignals.map((signal) => (
                  <Badge key={signal} variant="secondary" className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs">
                    {signal}
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {!isHydrated ? (
                  <>
                    <div className="h-11 w-52 animate-pulse rounded-md bg-muted/70" aria-hidden />
                    <div className="h-11 w-40 animate-pulse rounded-md bg-muted/70" aria-hidden />
                  </>
                ) : (
                  <>
                    <Link href={primaryAction.href}>
                      <Button size="lg" className="h-11 rounded-full px-7 text-sm font-semibold">
                        {primaryAction.label}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={secondaryAction.href}>
                      <Button size="lg" variant="outline" className="h-11 rounded-full px-7 text-sm font-semibold">
                        {secondaryAction.label}
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Clear expectations: this page highlights implemented behavior, not abstract marketing claims.
              </p>
            </div>

            <div className="relative flex items-center justify-center animate-in fade-in zoom-in-95 slide-in-from-bottom-8 duration-1000 ease-out">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/5 rounded-3xl blur-2xl" />
              <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-md ring-1 ring-border/20">
                {/* Mockup Header */}
                <div className="flex h-12 items-center justify-between border-b border-border/50 bg-card/40 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-destructive/80" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <Video className="h-4 w-4" />
                    <Settings className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex h-[380px]">
                  {/* Mockup Sidebar */}
                  <div className="hidden w-1/3 flex-col border-r border-border/50 bg-card/20 sm:flex">
                    <div className="p-3">
                      <div className="flex h-8 items-center gap-2 rounded-md bg-muted/50 px-3 text-xs text-muted-foreground">
                        <Search className="h-3 w-3" />
                        Search messages...
                      </div>
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden px-2 pb-2">
                      {[
                        { name: "Team Sync", msg: "Are we still on for 3?", time: "2m", active: true },
                        { name: "Alice Cooper", msg: "Sent an audio message", time: "1h", icon: Mic },
                        { name: "Design Review", msg: "Poll: Which logo?", time: "3h", icon: BarChart3 },
                      ].map((chat, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                            chat.active ? "bg-primary/10" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary/30 to-accent/30" />
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between">
                              <p className="truncate text-sm font-medium text-foreground">{chat.name}</p>
                              <span className="text-[10px] text-muted-foreground">{chat.time}</span>
                            </div>
                            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              {chat.icon && <chat.icon className="h-3 w-3" />}
                              {chat.msg}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mockup Main Chat */}
                  <div className="flex flex-1 flex-col bg-background/30">
                    <div className="flex flex-1 flex-col gap-4 p-4">
                      {/* Incoming Message */}
                      <div className="flex w-3/4 items-end gap-2">
                        <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-primary/30 to-accent/30" />
                        <div className="rounded-2xl rounded-bl-sm border border-border/40 bg-card/60 px-3 py-2 text-sm shadow-sm">
                          <p className="text-foreground">Did you check the new realtime capabilities?</p>
                        </div>
                      </div>

                      {/* Outgoing Message with Receipt */}
                      <div className="flex w-3/4 flex-col items-end gap-1 self-end">
                        <div className="rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
                          <p>Yes! The WebSocket engine handles pending states and receipts flawlessly now. 🚀</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CheckCheck className="h-3 w-3 text-primary" />
                          Read
                        </div>
                      </div>

                      {/* System/Poll Message */}
                      <div className="mx-auto mt-2 rounded-xl border border-border/50 bg-card/50 px-4 py-3 shadow-sm backdrop-blur-sm">
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <p className="text-xs font-medium text-foreground">Next release priority?</p>
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            Poll
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <div className="relative h-6 w-full overflow-hidden rounded-md border border-primary/20 bg-background">
                            <div className="absolute inset-y-0 left-0 w-[65%] bg-primary/20" />
                            <div className="relative flex h-full items-center justify-between px-2 text-[10px]">
                              <span>End-to-end Encryption</span>
                              <span className="font-medium text-primary">65%</span>
                            </div>
                          </div>
                          <div className="relative h-6 w-full overflow-hidden rounded-md border border-border/40 bg-background">
                            <div className="absolute inset-y-0 left-0 w-[35%] bg-muted" />
                            <div className="relative flex h-full items-center justify-between px-2 text-[10px]">
                              <span>Voice Transcription</span>
                              <span className="text-muted-foreground">35%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mockup Composer */}
                    <div className="border-t border-border/50 bg-card/30 p-3">
                      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 shadow-sm">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 text-sm text-muted-foreground">Message...</div>
                        <Mic className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl space-y-3">
              <Badge variant="outline" className="rounded-full border-border/80 bg-card/50 px-3 py-1 text-[11px] uppercase tracking-[0.16em]">
                Detailed feature map
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Aligned with the actual surface area users get after login.
              </h2>
              <p className="text-muted-foreground">
                Instead of generic landing claims, this redesign maps directly to your implemented modules across chat,
                calls, notifications, profile, and settings.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {capabilityCards.map((card) => {
                const Icon = card.icon;

                return (
                  <Card key={card.title} className="border-border/80 bg-card/75 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
                    <CardHeader className="pb-3">
                      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.accentClass}`}>
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {card.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/80" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <CardTitle className="text-2xl">First-minute workflow</CardTitle>
                <CardDescription>
                  The core path from authentication to productive collaboration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {firstMinuteSteps.map((step, index) => (
                  <div key={step.title} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <CardTitle className="text-2xl">Realtime architecture highlights</CardTitle>
                <CardDescription>
                  Why this product feels responsive once users enter the chat surface.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {architectureHighlights.map((highlight, index) => {
                  const Icon = highlight.icon;

                  return (
                    <div key={highlight.title}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{highlight.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{highlight.description}</p>
                        </div>
                      </div>
                      {index !== architectureHighlights.length - 1 ? <Separator className="mt-4" /> : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="security" className="py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <CardTitle className="text-2xl">Security posture and account control</CardTitle>
                <CardDescription>
                  Privacy and access layers surfaced clearly across auth, profile, and settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  OAuth PKCE and password auth coexist, with token refresh during bootstrap.
                </p>
                <p className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Settings expose read receipts, motion reduction, notification behavior, and theme preferences.
                </p>
                <p className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Profile screens provide visibility into contacts, active sessions, and linked devices.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/80">
              <CardHeader>
                <CardTitle className="text-2xl">Transparent current boundaries</CardTitle>
                <CardDescription>
                  Product limits are explicit so users know what to expect before onboarding.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{APP_LIMITATIONS.userSearch}</p>
                <Separator />
                <p>{APP_LIMITATIONS.serverSearch}</p>
                <Separator />
                <p>{APP_LIMITATIONS.calls}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="pb-20 pt-6">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border/80 bg-card/85 px-6 py-10 text-center shadow-sm sm:px-8">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {isSignedIn
                  ? "Your secure workspace is ready."
                  : "Start with chat, scale into calls and control."}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                {isSignedIn
                  ? "Jump back into conversations, manage your profile, or fine-tune notifications and privacy preferences."
                  : "Create your account and get a realtime stack that already includes messaging, media, calling, and account security."}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                {!isHydrated ? (
                  <div className="h-11 w-56 animate-pulse rounded-md bg-muted/70" aria-hidden />
                ) : (
                  <>
                    <Link href={primaryAction.href}>
                      <Button size="lg" className="h-11 rounded-full px-7 text-sm font-semibold">
                        {primaryAction.label}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={secondaryAction.href}>
                      <Button size="lg" variant="outline" className="h-11 rounded-full px-7 text-sm font-semibold">
                        {secondaryAction.label}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Sentinel Chat</p>
              <p className="text-xs text-muted-foreground">Realtime secure conversations</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Built around implemented chat, calling, notification, and privacy features.
          </p>
        </div>
      </footer>
    </div>
  );
}
