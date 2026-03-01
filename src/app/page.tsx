import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Shield, Zap, Lock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Sentinel Chat</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Secure Messaging for
              <span className="text-primary"> Everyone</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              End-to-end encrypted conversations with zero compromise on privacy.
              Your messages, your control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="px-8 font-medium">
                  Start Chatting
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="px-8 font-medium">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-card border shadow-sm transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">End-to-End Encryption</h3>
                <p className="text-muted-foreground">
                  Your messages are encrypted with Signal Protocol. Only you and the recipient can read them.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border shadow-sm transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">Lightning Fast</h3>
                <p className="text-muted-foreground">
                  Real-time messaging with WebSocket technology. Instant delivery, zero delays.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border shadow-sm transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">Privacy First</h3>
                <p className="text-muted-foreground">
                  No data mining, no ads, no tracking. Your privacy is our top priority.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Ready to chat securely?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto text-lg">
              Join thousands of users who trust Sentinel Chat for their private conversations.
            </p>
            <Link href="/register">
              <Button size="lg" className="px-8 font-medium">
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <MessageSquare className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-muted-foreground font-medium text-sm">Sentinel Chat</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Secure messaging platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
