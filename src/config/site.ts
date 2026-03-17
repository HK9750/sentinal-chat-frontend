import { APP_LIMITATIONS, APP_NAME } from '@/lib/constants';

export const siteConfig = {
  name: APP_NAME,
  title: 'Realtime conversations, designed with intention',
  description:
    'A shadcn-based chat workspace for realtime text, files, voice notes, and resilient signaling.',
  keywords: ['chat', 'websocket', 'voice notes', 'webrtc', 'messaging'],
  navigation: [
    { label: 'Chat', href: '/chat' },
    { label: 'Profile', href: '/profile' },
    { label: 'Settings', href: '/settings' },
  ],
  limitations: APP_LIMITATIONS,
} as const;
