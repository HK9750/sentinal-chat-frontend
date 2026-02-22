'use client';

import { useRef, useCallback, useMemo, useEffect } from 'react';
import { useMessages } from '@/queries/use-message-queries';
import { MessageBubble } from '@/components/shared/message-bubble';
import { Message } from '@/types';
import { Send } from 'lucide-react';

interface GroupedMessage {
    message: Message;
    isOwn: boolean;
    showAvatar: boolean;
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
}

function useGroupedMessages(messages: Message[] | undefined, currentUserId: string | undefined): GroupedMessage[] {
    return useMemo(() => {
        if (!messages) return [];
        return messages.map((msg, index) => {
            const prevMsg = messages[index - 1];
            const nextMsg = messages[index + 1];
            const isOwn = msg.sender_id === currentUserId;
            const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
            const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
            return { message: msg, isOwn, showAvatar: isFirstInGroup && !isOwn, isFirstInGroup, isLastInGroup };
        });
    }, [messages, currentUserId]);
}

interface MessageListProps {
    conversationId: string;
    currentUserId: string | undefined;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    messageRefs: React.RefObject<Map<string, HTMLDivElement>>;
}

export function MessageList({ conversationId, currentUserId, scrollRef, messageRefs }: MessageListProps) {
    const { data: messages, isLoading } = useMessages(conversationId);

    const displayMessages = useMemo(() => {
        if (!messages) return undefined;
        return messages.map((msg) => {
            if (msg.content) return msg;
            if (msg.ciphertext) {
                try {
                    const decoded = atob(msg.ciphertext);
                    if (/^[\x20-\x7E\s]+$/.test(decoded) && decoded.length > 0) {
                        return { ...msg, content: decoded };
                    }
                } catch {
                }
            }
            return msg;
        });
    }, [messages]);

    const groupedMessages = useGroupedMessages(displayMessages, currentUserId);

    useEffect(() => {
        if (scrollRef.current && displayMessages?.length) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [displayMessages?.length, scrollRef]);

    const setMessageRef = useCallback(
        (id: string, el: HTMLDivElement | null) => {
            if (el) messageRefs.current.set(id, el);
            else messageRefs.current.delete(id);
        },
        [messageRefs]
    );

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500" />
            </div>
        );
    }

    if (!displayMessages?.length) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                        <Send className="w-7 h-7 text-slate-600" />
                    </div>
                    <p className="text-slate-400 font-medium mb-1">No messages yet</p>
                    <p className="text-slate-600 text-sm">Send a message to start the conversation</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {groupedMessages.map(({ message, isOwn, showAvatar }) => (
                <div
                    key={message.id}
                    ref={(el) => setMessageRef(message.id, el)}
                    className="transition-all duration-300"
                >
                    <MessageBubble message={message} isOwn={isOwn} showAvatar={showAvatar} status={isOwn ? 'sent' : undefined} />
                </div>
            ))}
            <div ref={scrollRef} />
        </div>
    );
}
