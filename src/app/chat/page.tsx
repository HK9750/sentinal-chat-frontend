'use client';

import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { ConversationList } from './_components/conversation-list';
import { ChatArea } from './_components/chat-area';
import { Suspense } from 'react';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const selectedConversationId = searchParams.get('conversation');

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Conversation list: visible when no conversation selected on mobile, always visible on desktop */}
      <div className={`${selectedConversationId ? 'hidden lg:block' : 'w-full lg:w-80'} lg:w-80 shrink-0`}>
        <ConversationList />
      </div>

      {/* Chat area: visible when conversation selected on mobile, always visible on desktop */}
      <div className={`${selectedConversationId ? 'flex-1 flex flex-col' : 'hidden lg:flex lg:flex-1 lg:flex-col'} bg-slate-950 min-w-0`}>
        {selectedConversationId ? (
          <ChatArea conversationId={selectedConversationId} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-slate-300 mb-2">
                Select a conversation
              </h2>
              <p className="text-slate-500">
                Choose from your existing conversations or start a new one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-slate-950">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-slate-800 border-t-blue-500" />
          </div>
        }
      >
        <ChatPageContent />
      </Suspense>
    </AuthGuard>
  );
}
