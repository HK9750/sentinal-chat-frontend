
export const siteConfig = {
  name: 'Sentinel Chat',
  description: 'Secure end-to-end encrypted messaging platform',
  
  nav: {
    main: [
      { label: 'Home', href: '/' },
      { label: 'Features', href: '/#features' },
    ],
    auth: {
      login: { label: 'Sign In', href: '/login' },
      register: { label: 'Get Started', href: '/register' },
    },
  },
  
  links: {
    github: 'https://github.com/sentinel-chat',
    twitter: 'https://twitter.com/sentinelchat',
  },
  
  seo: {
    title: 'Sentinel Chat',
    titleTemplate: '%s | Sentinel Chat',
    description: 'Secure end-to-end encrypted messaging platform',
    keywords: ['chat', 'messaging', 'secure', 'encrypted', 'privacy', 'e2ee'],
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'Sentinel Chat',
    },
  },
  
  features: {
    videoCalls: false,
    voiceCalls: false,
    groupBroadcasts: false,
  },
} as const;
