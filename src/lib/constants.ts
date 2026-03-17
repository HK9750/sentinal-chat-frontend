import type { LocalUserPreferences } from "@/types/user";

export const APP_NAME = "Sentinel Chat";
export const CONVERSATIONS_PER_PAGE = 50;
export const MESSAGES_PER_PAGE = 50;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_BULK_UPLOAD_COUNT = 20;
export const MAX_MESSAGE_BYTES = 20_000;

export const WS_RECONNECT_BASE_DELAY = 1_500;
export const WS_RECONNECT_MAX_DELAY = 12_000;
export const WS_HEARTBEAT_INTERVAL = 25_000;
export const TYPING_DEBOUNCE_DELAY = 350;
export const TYPING_STALE_AFTER = 4_000;

export const VOICE_NOTE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

export const STORAGE_KEYS = {
  auth: "sentinel.auth",
  ui: "sentinel.ui",
  uploads: "sentinel.uploads",
  deviceId: "sentinel.device.id",
  serverDeviceId: "sentinel.device.server-id",
} as const;

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  chat: "/chat",
  profile: "/profile",
  settings: "/settings",
} as const;

export const API_ROUTES = {
  auth: {
    register: "/v1/auth/register",
    login: "/v1/auth/login",
    refresh: "/v1/auth/refresh",
    logout: "/v1/auth/logout",
    logoutAll: "/v1/auth/logout-all",
    sessions: "/v1/auth/sessions",
    oauthUrl: (provider: string) => `/v1/auth/oauth/${provider}/url`,
    oauthExchange: (provider: string) => `/v1/auth/oauth/${provider}/exchange`,
  },
  users: {
    search: "/v1/users/search",
    contacts: "/v1/users/contacts",
    removeContact: (contactUserId: string) =>
      `/v1/users/contacts/${contactUserId}`,
  },
  conversations: {
    list: "/v1/conversations",
    create: "/v1/conversations",
    detail: (conversationId: string) => `/v1/conversations/${conversationId}`,
    participants: (conversationId: string) =>
      `/v1/conversations/${conversationId}/participants`,
    removeParticipant: (conversationId: string, userId: string) =>
      `/v1/conversations/${conversationId}/participants/${userId}`,
    clear: (conversationId: string) =>
      `/v1/conversations/${conversationId}/clear`,
    messages: (conversationId: string) =>
      `/v1/conversations/${conversationId}/messages`,
  },
  messages: {
    detail: (messageId: string) => `/v1/messages/${messageId}`,
    attachments: (messageId: string) => `/v1/messages/${messageId}/attachments`,
  },
  uploads: {
    single: "/v1/uploads",
    bulk: "/v1/uploads/bulk",
    attachments: "/v1/attachments",
    attachment: (attachmentId: string) => `/v1/attachments/${attachmentId}`,
    viewed: (attachmentId: string) => `/v1/attachments/${attachmentId}/viewed`,
  },
  websocket: "/v1/ws",
} as const;

export const SOCKET_EVENT = {
  ping: "ping",
  pong: "pong",
  error: "error",
  connectionReady: "connection:ready",
  typingStart: "typing:start",
  typingStop: "typing:stop",
  typingStarted: "typing:started",
  typingStopped: "typing:stopped",
  messageSend: "message:send",
  messageNew: "message:new",
  messageEdit: "message:edit",
  messageEdited: "message:edited",
  messageDelete: "message:delete",
  messageDeleted: "message:deleted",
  reactionAdd: "message:reaction:add",
  reactionRemove: "message:reaction:remove",
  messageReaction: "message:reaction",
  pinMessage: "message:pin",
  unpinMessage: "message:unpin",
  messagePinned: "message:pinned",
  messageUnpinned: "message:unpinned",
  receiptDelivered: "receipt:delivered",
  receiptRead: "receipt:read",
  receiptPlayed: "receipt:played",
  receiptUpdate: "receipt:update",
  pollVote: "poll:vote",
  pollClose: "poll:close",
  pollUpdate: "poll:update",
  commandUndo: "command:undo",
  commandRedo: "command:redo",
  commandUndone: "command:undone",
  commandRedone: "command:redone",
  callStart: "call:start",
  callIncoming: "call:incoming",
  callOffer: "call:offer",
  callAnswer: "call:answer",
  callIce: "call:ice",
  callEnd: "call:end",
  callEnded: "call:ended",
} as const;

export const DEFAULT_PREFERENCES: LocalUserPreferences = {
  theme: "system",
  read_receipts: true,
  sound_enabled: true,
  enter_to_send: true,
  reduce_motion: false,
  compact_mode: false,
};

export const APP_LIMITATIONS = {
  userSearch:
    "Search results come from the backend and are optimized for starting chats and managing contacts.",
  serverSearch:
    "Message search currently works across the messages already loaded in the chat view.",
  calls:
    "Direct chats support voice and video calls. Group calling is unavailable.",
} as const;
