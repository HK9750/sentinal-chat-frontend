'use client';

import type { CallType } from '@/types';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  callType: CallType;
  recipientName?: string;
  recipientAvatarUrl?: string;
}

export function CallModal(props: CallModalProps) {
  void props;
  return null;
}
