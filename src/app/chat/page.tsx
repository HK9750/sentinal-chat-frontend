'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { ConversationList } from './_components/conversation-list';
import { ChatArea } from './_components/chat-area';
import { useUserProfile } from '@/queries/use-user-queries';
import { useAuthStore } from '@/stores/auth-store';

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const setUser = useAuthStore((state) => state.setUser);
  
  // Load user profile on mount
  const { data: userProfile } = useUserProfile();
  
  if (userProfile) {
    setUser(userProfile);
  }

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Sentinel Chat</h1>
          </div>
          <ConversationList 
            selectedId={selectedConversationId} 
            onSelect={setSelectedConversationId} 
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversationId ? (
            <ChatArea conversationId={selectedConversationId} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-gray-600">Welcome to Sentinel Chat</h2>
                <p className="mt-2 text-gray-500">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
