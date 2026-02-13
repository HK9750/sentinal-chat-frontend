'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { ConversationList } from './_components/conversation-list';
import { ChatArea } from './_components/chat-area';

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <AuthGuard>
      <div className="flex h-screen bg-slate-950">
        {/* Sidebar */}
        <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col">
          {/* Header */}
          <div className="h-16 flex items-center px-4 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-white">Sentinel Chat</h1>
            </div>
          </div>
          
          <ConversationList 
            selectedId={selectedConversationId} 
            onSelect={setSelectedConversationId} 
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {selectedConversationId ? (
            <ChatArea conversationId={selectedConversationId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-slate-300 mb-2">Select a conversation</h2>
                <p className="text-slate-500">Choose from your existing conversations or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
