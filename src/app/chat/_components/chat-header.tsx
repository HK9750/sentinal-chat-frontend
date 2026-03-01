'use client';

import { useCallback, useMemo } from 'react';
import { useConversation, useConversationParticipants } from '@/queries/use-conversation-queries';
import { useSocket } from '@/providers/socket-provider';
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
    const { data: participants } = useConversationParticipants(conversationId);
    const typingUsers = useChatStore(
        useCallback(
            (state) => state.typingUsers.get(conversationId) ?? EMPTY_ARRAY,
            [conversationId]
        )
    );

    const typingText = useMemo(() => {
        if (typingUsers.length === 0) return null;
        if (typingUsers.length === 1) return 'typing...';
        return `${typingUsers.length} people typing...`;
    }, [typingUsers]);

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
                    src={conversation?.avatar_url}
                    alt={conversation?.subject}
                    fallback={conversation?.type === 'DM' ? 'DM' : 'G'}
                    size="md"
                />

                <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground truncate">
                        {conversation?.subject || 'Chat'}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">
                        {typingText ||
                            `${participants?.length || 0} participant${participants?.length === 1 ? '' : 's'}`}
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
                        <Separator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">Leave Group</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
