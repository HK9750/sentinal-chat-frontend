'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { Spinner } from '@/components/shared/spinner';
import { ChatShell } from './_components/chat-shell';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const selectedConversationId = searchParams.get('conversation');

  return <ChatShell selectedConversationId={selectedConversationId} />;
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <ChatPageContent />
      </Suspense>
    </AuthGuard>
  );
}
