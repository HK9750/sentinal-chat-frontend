'use client';

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useMessages } from '@/queries/use-message-queries';
import { MessageBubble } from '@/components/shared/message-bubble';
import { Message } from '@/types';
import { Send } from 'lucide-react';
import { useDecryptCiphertext, useEncryptionStatus } from '@/hooks/use-encryption';
import {
    cacheDecryptedMessage,
    getCachedDecryptedMessages,
} from '@/lib/decrypted-message-cache';
import { base64ToUtf8 } from '@/lib/base64';

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
    const { decryptCiphertext } = useDecryptCiphertext();
    const { isSetup: encryptionReady } = useEncryptionStatus();

    // In-memory cache of successfully decrypted content (message ID -> plaintext).
    // Seeded from IndexedDB on mount, updated after each successful decryption.
    const [decryptedContent, setDecryptedContent] = useState<Map<string, string>>(new Map());

    // Track message IDs currently being decrypted to avoid duplicate
    // concurrent attempts for the same message.
    const inflightRef = useRef<Set<string>>(new Set());

    // --- Load cached decrypted messages from IndexedDB ---
    useEffect(() => {
        if (!messages) return;

        // Collect IDs of messages that have ciphertext but no content and aren't cached yet
        const uncachedIds = messages
            .filter(msg => !!msg.ciphertext && !msg.content && !decryptedContent.has(msg.id))
            .map(msg => msg.id);

        if (uncachedIds.length === 0) return;

        let active = true;
        getCachedDecryptedMessages(uncachedIds).then(cached => {
            if (!active || cached.size === 0) return;
            setDecryptedContent(prev => {
                const next = new Map(prev);
                let changed = false;
                for (const [id, plaintext] of cached) {
                    if (!next.has(id)) {
                        next.set(id, plaintext);
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }).catch(err => {
            console.error('[MessageList] Failed to load cached decrypted messages:', err);
        });

        return () => { active = false; };
    }, [messages, decryptedContent]);

    const displayMessages = useMemo(() => {
        if (!messages) return undefined;
        return messages.map((msg) => {
            if (msg.content) return msg;
            const cached = decryptedContent.get(msg.id);
            if (cached) {
                return { ...msg, content: cached };
            }
            // Own messages: decode base64 ciphertext as plaintext fallback
            if (msg.sender_id === currentUserId && msg.ciphertext) {
                try {
                    const decoded = base64ToUtf8(msg.ciphertext);
                    const trimmed = decoded.trim();
                    if (!trimmed.startsWith('{') || !trimmed.includes('ratchetKey')) {
                        return { ...msg, content: decoded };
                    }
                } catch { /* ignore decode errors */ }
            }
            return msg;
        });
    }, [messages, decryptedContent, currentUserId]);

    // --- Decryption effect: gated on encryptionReady ---
    useEffect(() => {
        if (!messages || !encryptionReady) return;

        const pending = messages.filter(
            (msg) =>
                !!msg.ciphertext &&
                !!msg.sender_id &&
                !!msg.sender_device_id &&
                msg.sender_id !== currentUserId &&
                !decryptedContent.has(msg.id) &&
                !inflightRef.current.has(msg.id)
        ) as Array<Message & { ciphertext: string; sender_device_id: string }>;

        if (pending.length === 0) return;

        let isActive = true;

        const decryptAll = async () => {
            for (const msg of pending) {
                if (!isActive) return;

                // Mark as in-flight so concurrent renders don't re-attempt
                inflightRef.current.add(msg.id);

                try {
                    const plaintext = await decryptCiphertext({
                        senderUserId: msg.sender_id,
                        senderDeviceId: msg.sender_device_id,
                        ciphertext: msg.ciphertext,
                        header: msg.header,
                    });
                    if (!isActive) {
                        inflightRef.current.delete(msg.id);
                        return;
                    }

                    // Persist to IndexedDB so future page loads don't re-decrypt
                    cacheDecryptedMessage(msg.id, plaintext).catch(err => {
                        console.error(`[MessageList] Failed to persist decrypted message ${msg.id}:`, err);
                    });

                    // Update in-memory cache
                    setDecryptedContent((prev) => {
                        if (prev.has(msg.id)) return prev;
                        const next = new Map(prev);
                        next.set(msg.id, plaintext);
                        return next;
                    });
                } catch (err) {
                    console.error(`[MessageList] Failed to decrypt message ${msg.id}:`, err);
                    // Do NOT cache failures — leave the message uncached so
                    // it will be retried on the next effect run.
                } finally {
                    inflightRef.current.delete(msg.id);
                }
            }
        };

        decryptAll();

        return () => {
            isActive = false;
        };
    }, [messages, encryptionReady, decryptedContent, decryptCiphertext, currentUserId]);

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
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary" />
            </div>
        );
    }

    if (!displayMessages?.length) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Send className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium mb-1">No messages yet</p>
                    <p className="text-muted-foreground text-sm">Send a message to start the conversation</p>
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
