'use client';

import { useCallback, useMemo } from 'react';
import { useConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CallType } from '@/types/call';
import { MoreVertical, Phone, Video, ArrowLeft, Search } from 'lucide-react';

const EMPTY_ARRAY: string[] = [];

interface ChatHeaderProps {
    conversationId: string;
    onBack?: () => void;
    onStartCall: (callType: CallType) => void;
    onOpenSearch: () => void;
}

export function ChatHeader({ conversationId, onBack, onStartCall, onOpenSearch }: ChatHeaderProps) {
    const { data: conversation } = useConversation(conversationId);
    const currentUserId = useAuthStore((state) => state.user?.id);
    const typingUsers = useChatStore(
        useCallback(
            (state) => state.typingUsers.get(conversationId) ?? EMPTY_ARRAY,
            [conversationId]
        )
    );

    const otherParticipant = useMemo(() => {
        if (conversation?.type !== 'DM' || !conversation.participants) return null;
        return conversation.participants.find((p) => p.user_id !== currentUserId) ?? conversation.participants[0] ?? null;
    }, [conversation?.type, conversation?.participants, currentUserId]);

    const displayName = conversation?.type === 'DM'
        ? (otherParticipant?.display_name || otherParticipant?.username || 'Chat')
        : (conversation?.subject || 'Chat');

    const avatarUrl = conversation?.type === 'DM'
        ? otherParticipant?.avatar_url
        : conversation?.avatar_url;

    const avatarFallback = conversation?.type === 'DM'
        ? (displayName[0]?.toUpperCase() || 'D')
        : 'G';

    const isOnline = otherParticipant?.is_online ?? false;

    const typingText = useMemo(() => {
        if (typingUsers.length === 0) return null;
        if (typingUsers.length === 1) return 'typing...';
        return `${typingUsers.length} people typing...`;
    }, [typingUsers]);

    const subtitle = useMemo(() => {
        if (typingText) return typingText;
        if (conversation?.type === 'DM') {
            return isOnline ? 'Online' : 'Offline';
        }
        const count = conversation?.participant_count || conversation?.participants?.length || 0;
        return `${count} participant${count === 1 ? '' : 's'}`;
    }, [typingText, conversation?.type, conversation?.participant_count, conversation?.participants?.length, isOnline]);

    return (
        <div className="h-16 bg-background/80 backdrop-blur-md border-b flex items-center px-4 justify-between shrink-0">
            <div className="flex items-center gap-3">
                {onBack && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden text-muted-foreground hover:text-foreground"
                        onClick={onBack}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}

                <UserAvatar
                    src={avatarUrl}
                    alt={displayName}
                    fallback={avatarFallback}
                    size="md"
                    showStatus={conversation?.type === 'DM'}
                    isOnline={isOnline}
                />

                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground truncate">
                        {displayName}
                    </h2>
                    <p className={`text-xs truncate ${typingText ? 'text-primary' : isOnline && conversation?.type === 'DM' ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {subtitle}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={onOpenSearch}>
                    <Search className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => onStartCall('AUDIO')}>
                    <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => onStartCall('VIDEO')}>
                    <Video className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem>View Info</DropdownMenuItem>
                        <DropdownMenuItem onClick={onOpenSearch}>
                            <Search className="h-4 w-4 mr-2" />
                            Search Messages
                        </DropdownMenuItem>
                        <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
                        {conversation?.type === 'GROUP' && (
                            <>
                                <Separator />
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">Leave Group</DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
