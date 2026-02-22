
export const CONVERSATIONS_PER_PAGE = 20;
export const MESSAGES_PER_PAGE = 50;
export const CONTACTS_PER_PAGE = 50;

export const STALE_TIME = {
  SHORT: 10_000,
  MEDIUM: 30_000,
  LONG: 60_000,
  VERY_LONG: 300_000,
} as const;

export const WS_RECONNECT_DELAY = 3000;

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 32,
  DISPLAY_NAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
  STATUS_MAX_LENGTH: 100,
} as const;

export const DATE_FORMATS = {
  TIME: 'h:mm a',
  DATE: 'MMM d',
  FULL: 'MMM d, yyyy h:mm a',
  RELATIVE_THRESHOLD: 7 * 24 * 60 * 60 * 1000,
} as const;

export const STORAGE_KEYS = {
  AUTH: 'auth-storage',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar-collapsed',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  CHAT: '/chat',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/v1/auth/login',
    REGISTER: '/v1/auth/register',
    LOGOUT: '/v1/auth/logout',
    REFRESH: '/v1/auth/refresh',
    SESSIONS: '/v1/auth/sessions',
  },
  USERS: {
    PROFILE: '/v1/users/me',
    SETTINGS: '/v1/users/me/settings',
    CONTACTS: '/v1/users/me/contacts',
    DEVICES: '/v1/users/me/devices',
  },
  CONVERSATIONS: {
    LIST: '/v1/conversations',
    CREATE: '/v1/conversations',
  },
  MESSAGES: {
    SEND: '/v1/messages',
  },
} as const;
