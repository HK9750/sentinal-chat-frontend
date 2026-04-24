import {
  BellRing,
  Building2,
  Database,
  FileUp,
  Lock,
  MessageSquareText,
  Mic,
  PhoneCall,
  Router,
  Server,
  ShieldCheck,
  UserRound,
  Users,
  Workflow,
  Wrench,
} from 'lucide-react';

const problemPoints = [
  'Teams often switch between multiple apps for chat, files, and calls.',
  'Many tools sacrifice privacy or do not provide clear delivery/read visibility.',
  'Admins need better control over communication quality, moderation, and reliability.',
];

const solutionPoints = [
  'A secure real-time chat platform built for dependable daily communication.',
  'WebSocket-driven messaging with delivery, read, and playback receipts.',
  'Unified chat, voice notes, file sharing, notifications, and conversation controls.',
];

const keyFeatures = [
  'Real-time messaging with typing, presence, and robust reconnect handling.',
  'Message actions: reply, edit, delete (for me/for everyone), reactions, forwarding.',
  'Media-ready communication with file uploads, voice notes, and call support.',
  'Notification center with badge updates, preferences, in-app toasts, and mute-aware behavior.',
  'Conversation controls: disappearing modes, mute windows, participant management, and call history.',
];

const technologies = [
  'Next.js',
  'TypeScript',
  'Tailwind CSS',
  'Zustand',
  'TanStack Query',
  'Go',
  'Gin',
  'PostgreSQL',
  'Redis',
  'WebSocket',
];

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mx-auto -mt-5 mb-3 w-fit rounded-md bg-primary px-5 py-1.5 text-center text-lg font-semibold text-primary-foreground print:-mt-4 print:text-base">
      {title}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-[clamp(0.95rem,1.8vw,1.3rem)] leading-relaxed text-foreground print:text-base">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ArchitectureCard({
  icon,
  title,
  points,
}: {
  icon: React.ReactNode;
  title: string;
  points: string[];
}) {
  return (
    <div className="rounded-xl border-2 border-primary bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-primary">
        {icon}
        <h4 className="text-lg font-semibold">{title}</h4>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-foreground">
        {points.map((point) => (
          <p key={point} className="rounded-md border border-border bg-white/70 px-2.5 py-1.5">
            {point}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function FlyerPage() {
  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-5 sm:py-8 print:bg-white print:p-0">
      <section className="animate-in fade-in duration-500 mx-auto w-[min(1200px,100%)] border-[3px] border-primary bg-card shadow-2xl print:w-full print:shadow-none">
        <header className="border-b-[3px] border-primary px-4 pb-4 pt-5 sm:px-8 print:px-5 print:py-4">
          <div className="grid grid-cols-[64px_1fr_64px] items-center gap-3 sm:grid-cols-[110px_1fr_110px]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-white text-primary sm:h-20 sm:w-20">
              <Building2 className="h-7 w-7 sm:h-10 sm:w-10" />
            </div>

            <div className="text-center text-foreground">
              <h1 className="font-serif text-[clamp(1.8rem,4vw,3.5rem)] font-semibold leading-none tracking-tight">
                Sentinel Chat
              </h1>
              <p className="mt-1 font-serif text-[clamp(1rem,2.2vw,2.1rem)] leading-tight">
                Secure Real-Time Communication Platform
              </p>
              <p className="mt-1 text-[clamp(0.75rem,1.4vw,1.1rem)] text-muted-foreground">
                Project Flyer | Software Product Showcase
              </p>
            </div>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-white text-primary sm:h-20 sm:w-20">
              <ShieldCheck className="h-7 w-7 sm:h-10 sm:w-10" />
            </div>
          </div>

          <div className="mt-4 rounded-md border-2 border-primary bg-primary px-3 py-3 text-center text-primary-foreground sm:px-5">
            <p className="text-base font-medium sm:text-2xl">Product Team: Sentinel Chat Engineers</p>
            <p className="text-sm opacity-95 sm:text-xl">Department of Software Engineering</p>
            <p className="text-sm opacity-95 sm:text-xl">NED University of Engineering and Technology, Karachi, Pakistan</p>
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6 print:space-y-4 print:p-4">
          <div className="grid gap-5 md:grid-cols-2 print:gap-4">
            <article className="rounded-sm border-[3px] border-primary bg-muted p-4 sm:p-5">
              <SectionHeading title="Problem Statement" />
              <BulletList items={problemPoints} />
            </article>

            <article className="rounded-sm border-[3px] border-primary bg-muted p-4 sm:p-5">
              <SectionHeading title="Solution" />
              <BulletList items={solutionPoints} />
            </article>
          </div>

          <div className="grid gap-5 lg:grid-cols-[2.2fr_1fr] print:gap-4">
            <article className="rounded-sm border-[3px] border-primary bg-muted p-4 sm:p-5">
              <SectionHeading title="System Architecture" />
              <div className="grid gap-3 md:grid-cols-3">
                <ArchitectureCard
                  icon={<UserRound className="h-5 w-5" />}
                  title="Client Layer"
                  points={[
                    'Chat UI (web-first, mobile responsive)',
                    'Message composer with file and voice support',
                    'Conversation view with reactions and forwarding',
                  ]}
                />

                <ArchitectureCard
                  icon={<Workflow className="h-5 w-5" />}
                  title="Realtime Layer"
                  points={[
                    'WebSocket channel and request/ack flow',
                    'Typing, presence, receipts, and call signaling',
                    'Event bridge for cache sync and notification fanout',
                  ]}
                />

                <ArchitectureCard
                  icon={<Server className="h-5 w-5" />}
                  title="Service + Data"
                  points={[
                    'Auth, conversations, messages, uploads, notifications',
                    'Role-aware handlers and robust event publishing',
                    'PostgreSQL persistence with Redis-backed realtime support',
                  ]}
                />
              </div>

              <div className="mt-4 rounded-lg border-2 border-dashed border-primary bg-white/70 p-3 text-sm text-primary">
                Data Flow: Client App <Router className="mx-1 inline h-4 w-4" /> API + WebSocket <Router className="mx-1 inline h-4 w-4" /> Services <Router className="mx-1 inline h-4 w-4" /> Database + Cache
              </div>
            </article>

            <article className="rounded-sm border-[3px] border-primary bg-muted p-4 sm:p-5">
              <SectionHeading title="Technology" />

              <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-foreground sm:text-sm">
                <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1.5"><MessageSquareText className="h-4 w-4" /> Chat UI</div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1.5"><BellRing className="h-4 w-4" /> Notifications</div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1.5"><FileUp className="h-4 w-4" /> File Uploads</div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1.5"><PhoneCall className="h-4 w-4" /> Calls</div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1.5"><Mic className="h-4 w-4" /> Voice Notes</div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-white px-2 py-1.5"><Lock className="h-4 w-4" /> Privacy</div>
              </div>

              <div className="flex flex-wrap gap-2">
                {technologies.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground sm:text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </article>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] print:gap-4">
            <article className="rounded-sm border-[3px] border-primary bg-muted p-4 sm:p-5">
              <SectionHeading title="Mapped Goals" />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border-2 border-border bg-accent p-3 text-white">
                  <p className="text-2xl font-bold">11</p>
                  <p className="mt-1 text-sm font-medium">Sustainable communities through connected communication.</p>
                </div>
                <div className="rounded-lg border-2 border-border bg-primary p-3 text-white">
                  <p className="text-2xl font-bold">13</p>
                  <p className="mt-1 text-sm font-medium">Reduced digital waste by centralizing fragmented tools.</p>
                </div>
                <div className="rounded-lg border-2 border-border bg-secondary p-3 text-white">
                  <p className="text-2xl font-bold">16</p>
                  <p className="mt-1 text-sm font-medium">Stronger institutions with secure and auditable messaging.</p>
                </div>
              </div>
            </article>

            <article className="rounded-sm border-[3px] border-primary bg-muted p-4 sm:p-5">
              <SectionHeading title="Key Features" />
              <BulletList items={keyFeatures} />
            </article>
          </div>

          <article className="rounded-sm border-[3px] border-primary bg-muted p-4 sm:p-5">
            <SectionHeading title="Impact Statement" />
            <p className="font-serif text-[clamp(1.05rem,2vw,1.9rem)] leading-relaxed text-foreground">
              Strengthening modern communication by combining reliability, privacy, and real-time collaboration in one platform. Sentinel Chat helps teams move faster, stay aligned, and communicate with confidence.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary bg-white px-3 py-1.5"><Database className="h-4 w-4" /> Reliable Data Layer</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary bg-white px-3 py-1.5"><Wrench className="h-4 w-4" /> Admin Friendly Controls</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary bg-white px-3 py-1.5"><Users className="h-4 w-4" /> Collaboration at Scale</span>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
