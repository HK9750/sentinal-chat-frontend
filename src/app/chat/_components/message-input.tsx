'use client';

import { useRef, useCallback } from 'react';
import { useConversationParticipants } from '@/queries/use-conversation-queries';
import { useSendMessage } from '@/queries/use-message-queries';
import { useSocket } from '@/providers/socket-provider';
import { useEncryptionStatus, useEncryptMessageMutation } from '@/hooks/use-encryption';
import { getServerDeviceId } from '@/lib/device';
import { useAuthStore } from '@/stores/auth-store';
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
                const recipients = participants?.filter((p) => p.user_id !== currentUser?.id) || [];
                const ownDeviceId = getServerDeviceId() || '';

                if (isEncryptionEnabled && recipients.length > 0) {
                    const ciphertexts = [];

                    for (const p of recipients) {
                        try {
                            const result = await encryptMessageMutation.mutateAsync({
                                recipientUserId: p.user_id,
                                recipientDeviceId: p.user_id,
                                plaintext: content,
                            });
                            ciphertexts.push({
                                recipient_device_id: p.user_id,
                                ciphertext: btoa(result.encryptedContent),
                                header: result.ephemeralPublicKey ? { ephemeral_key: result.ephemeralPublicKey } : undefined,
                            });
                        } catch {
                            ciphertexts.push({ recipient_device_id: p.user_id, ciphertext: btoa(content) });
                        }
                    }

                    try {
                        const selfResult = await encryptMessageMutation.mutateAsync({
                            recipientUserId: currentUser?.id || '',
                            recipientDeviceId: ownDeviceId,
                            plaintext: content,
                        });
                        ciphertexts.push({
                            recipient_device_id: ownDeviceId,
                            ciphertext: btoa(selfResult.encryptedContent),
                            header: selfResult.ephemeralPublicKey ? { ephemeral_key: selfResult.ephemeralPublicKey } : undefined,
                        });
                    } catch {
                        ciphertexts.push({ recipient_device_id: ownDeviceId, ciphertext: btoa(content) });
                    }

                    await sendMessageMutation.mutateAsync({ conversation_id: conversationId, ciphertexts, message_type: 'TEXT' });
                } else {
                    const allDevices = [...(recipients.map((p) => p.user_id) || []), ownDeviceId];
                    await sendMessageMutation.mutateAsync({
                        conversation_id: conversationId,
                        ciphertexts: allDevices.map((id) => ({ recipient_device_id: id, ciphertext: btoa(content) })),
                        message_type: 'TEXT',
                    });
                }
            } catch {
                if (inputRef.current) inputRef.current.value = content;
            }
        },
        [conversationId, participants, currentUser, sendMessageMutation, encryptMessageMutation, sendTypingStop, isEncryptionEnabled]
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
        <div className="bg-slate-900/80 backdrop-blur-md border-t border-slate-800">
            <UploadProgressList conversationId={conversationId} />
            <form onSubmit={handleSubmit} className="p-4 flex items-center gap-2 max-w-4xl mx-auto">
                <FileUploadButton conversationId={conversationId} className="shrink-0" />

                <div className="flex-1 relative">
                    <Input
                        ref={inputRef}
                        type="text"
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="pr-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-blue-500/50 rounded-full"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-white"
                    >
                        <Smile className="h-5 w-5" />
                    </Button>
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className={`shrink-0 p-2 rounded-full ${isEncryptionEnabled ? 'text-green-500' : 'text-slate-500'}`}>
                                {isEncryptionEnabled ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            {isEncryptionEnabled ? 'End-to-end encryption enabled' : 'Encryption not set up'}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 shrink-0">
                    <Send className="h-4 w-4 mr-2" />
                    Send
                </Button>
            </form>
        </div>
    );
}
