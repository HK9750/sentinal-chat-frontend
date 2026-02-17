/**
 * Site configuration
 * Per AGENTS.md: Centralize site metadata and configuration
 */

export const siteConfig = {
  name: 'Sentinel Chat',
  description: 'Secure end-to-end encrypted messaging platform',
  
  // Navigation
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
  
  // External links
  links: {
    github: 'https://github.com/sentinel-chat',
    twitter: 'https://twitter.com/sentinelchat',
  },
  
  // SEO defaults
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
  
  // Feature flags
  features: {
    videoCalls: false, // Coming soon
    voiceCalls: false, // Coming soon
    groupBroadcasts: false, // Coming soon
  },
} as const;
