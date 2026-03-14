import { APP_LIMITATIONS, APP_NAME } from '@/lib/constants';

export const siteConfig = {
  name: APP_NAME,
  title: 'Encrypted conversations, designed with intention',
  description:
    'A shadcn-based chat workspace for encrypted text, files, voice notes, and resilient realtime signaling.',
  keywords: ['chat', 'encrypted', 'websocket', 'voice notes', 'webrtc', 'privacy'],
  navigation: [
    { label: 'Chat', href: '/chat' },
    { label: 'Profile', href: '/profile' },
    { label: 'Settings', href: '/settings' },
    { label: 'Broadcasts', href: '/broadcasts' },
  ],
  limitations: APP_LIMITATIONS,
} as const;
