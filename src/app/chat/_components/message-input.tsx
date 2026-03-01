'use client';

import { useRef, useCallback } from 'react';
import { useConversationParticipants } from '@/queries/use-conversation-queries';
import { useSendMessage } from '@/queries/use-message-queries';
import { useSocket } from '@/providers/socket-provider';
import { useEncryptionStatus, useEncryptMessageMutation } from '@/hooks/use-encryption';
import { getServerDeviceId } from '@/lib/device';
import { useAuthStore } from '@/stores/auth-store';
import type { Participant } from '@/types';
import { FileUploadButton } from '@/components/shared/file-upload-button';
import { UploadProgressList } from '@/components/shared/upload-progress-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Smile, Lock, LockOpen } from 'lucide-react';

interface MessageInputProps {
    conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = useRef(false);

    const sendMessageMutation = useSendMessage();
    const encryptMessageMutation = useEncryptMessageMutation();
    const { sendTypingStart, sendTypingStop } = useSocket();
    const { data: participants } = useConversationParticipants(conversationId);
    const { isSetup: isEncryptionEnabled } = useEncryptionStatus();
    const currentUser = useAuthStore((state) => state.user);

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const input = inputRef.current;
            if (!input || !input.value.trim()) return;

            const content = input.value.trim();
            input.value = '';
            sendTypingStop(conversationId);

            try {
                if (!currentUser?.id) {
                    throw new Error('User not available');
                }
                if (!participants) {
                    throw new Error('Participants not loaded');
                }

                const ownDeviceId = getServerDeviceId();
                if (!ownDeviceId) {
                    throw new Error('Device ID not available');
                }

                const recipients = participants.filter(
                    (p: Participant) => p.user_id !== currentUser.id
                );
                const selfParticipant = participants.find(
                    (p: Participant) => p.user_id === currentUser.id
                );

                const recipientDeviceEntries = new Map<string, { userId: string; deviceId: string }>();
                for (const recipient of recipients) {
                    for (const deviceId of recipient.device_ids || []) {
                        const key = `${recipient.user_id}:${deviceId}`;
                        if (!recipientDeviceEntries.has(key)) {
                            recipientDeviceEntries.set(key, {
                                userId: recipient.user_id,
                                deviceId,
                            });
                        }
                    }
                }

                const selfDeviceIds = (selfParticipant?.device_ids || []).filter(
                    (deviceId) => deviceId !== ownDeviceId
                );
                for (const deviceId of selfDeviceIds) {
                    const key = `${currentUser.id}:${deviceId}`;
                    if (!recipientDeviceEntries.has(key)) {
                        recipientDeviceEntries.set(key, {
                            userId: currentUser.id,
                            deviceId,
                        });
                    }
                }

                if ((recipients.length > 0 || selfDeviceIds.length > 0) && recipientDeviceEntries.size === 0) {
                    throw new Error('No recipient devices available');
                }

                if (isEncryptionEnabled && recipientDeviceEntries.size > 0) {
                    const ciphertexts = [] as Array<{
                        recipient_device_id: string;
                        ciphertext: string;
                        header?: Record<string, unknown>;
                    }>;

                    for (const entry of recipientDeviceEntries.values()) {
                        try {
                            const result = await encryptMessageMutation.mutateAsync({
                                recipientUserId: entry.userId,
                                recipientDeviceId: entry.deviceId,
                                plaintext: content,
                            });
                            const header = result.ephemeralPublicKey
                                ? {
                                    ephemeral_key: result.ephemeralPublicKey,
                                    one_time_pre_key_id: result.usedOneTimePreKeyId,
                                }
                                : undefined;
                            ciphertexts.push({
                                recipient_device_id: entry.deviceId,
                                ciphertext: btoa(result.encryptedContent),
                                header,
                            });
                        } catch {
                            ciphertexts.push({
                                recipient_device_id: entry.deviceId,
                                ciphertext: btoa(content),
                            });
                        }
                    }

                    try {
                        const selfResult = await encryptMessageMutation.mutateAsync({
                            recipientUserId: currentUser.id,
                            recipientDeviceId: ownDeviceId,
                            plaintext: content,
                        });
                        const header = selfResult.ephemeralPublicKey
                            ? {
                                ephemeral_key: selfResult.ephemeralPublicKey,
                                one_time_pre_key_id: selfResult.usedOneTimePreKeyId,
                            }
                            : undefined;
                        ciphertexts.push({
                            recipient_device_id: ownDeviceId,
                            ciphertext: btoa(selfResult.encryptedContent),
                            header,
                        });
                    } catch {
                        ciphertexts.push({
                            recipient_device_id: ownDeviceId,
                            ciphertext: btoa(content),
                        });
                    }

                    await sendMessageMutation.mutateAsync({
                        conversation_id: conversationId,
                        ciphertexts,
                        message_type: 'TEXT',
                        local_content: content,
                    });
                } else {
                    const deviceIds = new Set<string>([ownDeviceId]);
                    for (const entry of recipientDeviceEntries.values()) {
                        deviceIds.add(entry.deviceId);
                    }

                    await sendMessageMutation.mutateAsync({
                        conversation_id: conversationId,
                        ciphertexts: Array.from(deviceIds).map((id) => ({
                            recipient_device_id: id,
                            ciphertext: btoa(content),
                        })),
                        message_type: 'TEXT',
                        local_content: content,
                    });
                }
            } catch {
                if (inputRef.current) inputRef.current.value = content;
            }
        },
        [
            conversationId,
            participants,
            currentUser?.id,
            sendMessageMutation,
            encryptMessageMutation,
            sendTypingStop,
            isEncryptionEnabled,
        ]
    );

    const handleKeyDown = useCallback(() => {
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            sendTypingStart(conversationId);
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            sendTypingStop(conversationId);
        }, 3000);
    }, [conversationId, sendTypingStart, sendTypingStop]);

    const isPending = sendMessageMutation.isPending || encryptMessageMutation.isPending;

    return (
        <div className="bg-background/80 backdrop-blur-md border-t">
            <UploadProgressList conversationId={conversationId} />
            <form onSubmit={handleSubmit} className="p-4 flex items-center gap-2 max-w-4xl mx-auto">
                <FileUploadButton conversationId={conversationId} className="shrink-0" />

                <div className="flex-1 relative">
                    <Input
                        ref={inputRef}
                        type="text"
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="pr-10 bg-background border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-full"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                        <Smile className="h-5 w-5" />
                    </Button>
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={`shrink-0 p-2 rounded-full ${isEncryptionEnabled ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {isEncryptionEnabled ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isEncryptionEnabled ? 'End-to-end encryption enabled' : 'Encryption not set up'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 shrink-0">
                    <Send className="h-4 w-4 mr-2" />
                    Send
                </Button>
            </form>
        </div>
    );
}
