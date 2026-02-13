# Sentinel Chat Frontend

**Production-grade Next.js 16 chat client** with App Router, TypeScript, and modern React patterns.

---

## Tech Stack

| Layer | Technology |
| ------------------ | --------------------------------- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Client State | Zustand |
| Server State | TanStack React Query v5 |
| Real-time | Socket.IO Client |
| Date Handling | Day.js |
| Unique IDs | uuid |

---

## Project Structure

```
src/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles & Tailwind directives
│   ├── (auth)/                  # Auth route group
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── _components/     # Route-scoped components
│   │   └── register/
│   │       ├── page.tsx
│   │       └── _components/
│   ├── (chat)/                  # Chat route group
│   │   ├── page.tsx
│   │   └── _components/
│   ├── settings/
│   │   ├── page.tsx
│   │   └── _components/
│   └── ...                      # Additional routes
│
├── components/                  # Global shared components
│   ├── ui/                      # shadcn/ui primitives (Button, Input, Dialog, etc.)
│   ├── layout/                  # Layout components (Sidebar, Header, Footer, etc.)
│   └── shared/                  # App-wide reusable components (Avatar, Badge, etc.)
│
├── hooks/                       # Global custom React hooks
│   ├── use-auth.ts
│   ├── use-socket.ts
│   ├── use-debounce.ts
│   └── ...
│
├── stores/                      # Zustand stores (minimal client state only)
│   ├── auth-store.ts
│   ├── ui-store.ts              # Theme, sidebar open/closed, modals
│   └── ...
│
├── services/                    # API service layer
│   ├── api-client.ts            # Base API client with interceptors
│   ├── auth-service.ts
│   ├── chat-service.ts
│   └── ...
│
├── queries/                     # TanStack React Query hooks
│   ├── use-auth-queries.ts
│   ├── use-chat-queries.ts
│   ├── use-user-queries.ts
│   └── ...
│
├── lib/                         # Utility functions & helpers
│   ├── utils.ts                 # General utilities (cn, formatters, etc.)
│   ├── constants.ts             # App-wide constants
│   ├── validators.ts            # Validation schemas (Zod, etc.)
│   └── ...
│
├── types/                       # TypeScript type definitions
│   ├── auth.ts
│   ├── chat.ts
│   ├── user.ts
│   └── ...
│
├── providers/                   # React context providers
│   ├── query-provider.tsx       # TanStack React Query provider
│   ├── socket-provider.tsx      # Socket.IO provider
│   └── theme-provider.tsx       # Theme provider (dark/light mode)
│
└── config/                      # App configuration
    ├── env.ts                   # Environment variable validation
    └── site.ts                  # Site metadata & config
```

---

## Architecture Principles

### 🎯 Modern React Patterns

#### **1. Minimize `useEffect`**
- ❌ **Don't**: Use `useEffect` for data fetching
- ✅ **Do**: Use TanStack Query for all server state
- ✅ **Do**: Derive state from props/query data instead of syncing with effects
- ✅ **Do**: Use event handlers for user interactions, not effects

```tsx
// ❌ BAD: Unnecessary effect
const [messages, setMessages] = useState([]);
useEffect(() => {
  fetch('/api/messages').then(res => res.json()).then(setMessages);
}, []);

// ✅ GOOD: Query handles it
const { data: messages } = useChatMessages(chatId);
```

#### **2. Minimize State**
- **Server state → TanStack Query** (messages, users, profiles)
- **URL state → Next.js searchParams** (filters, pagination, modal open/closed)
- **Form state → React Hook Form** (uncontrolled inputs)
- **Client state → Zustand** (ONLY for: auth tokens, theme, UI preferences, socket connection)

```tsx
// ❌ BAD: Redundant state
const [isOpen, setIsOpen] = useState(false);
const [selectedUser, setSelectedUser] = useState(null);

// ✅ GOOD: Derive from URL
const searchParams = useSearchParams();
const isOpen = searchParams.get('modal') === 'user';
const selectedUser = searchParams.get('userId');
```

#### **3. Composition Over Configuration**
- Build features with small, composable components
- Use render props and children for flexibility
- Avoid prop drilling — use context sparingly

---

## State Management Strategy

### **TanStack React Query (Primary)**
All server/async state lives here. **This is your single source of truth.**

```tsx
// src/queries/use-chat-queries.ts
export const useChatMessages = (chatId: string) => {
  return useQuery({
    queryKey: ['chats', chatId, 'messages'],
    queryFn: () => chatService.getMessages(chatId),
    staleTime: 30_000,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: chatService.sendMessage,
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: ['chats', chatId, 'messages'] });
    },
  });
};
```

### **Zustand (Minimal Client State)**
Only for truly client-side state that doesn't belong in URL or server.

```tsx
// src/stores/ui-store.ts
interface UIStore {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'dark',
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

### **URL State (Next.js)**
For shareable/bookmarkable state (filters, modals, selected items).

```tsx
// src/app/(chat)/_components/ChatList.tsx
const searchParams = useSearchParams();
const router = useRouter();

const openUserModal = (userId: string) => {
  const params = new URLSearchParams(searchParams);
  params.set('modal', 'user');
  params.set('userId', userId);
  router.push(`?${params.toString()}`);
};
```

---

## Component Organization

### **Global Components** (`src/components/`)
Shared across the entire app.

```
components/
├── ui/              # shadcn/ui primitives
├── layout/          # Sidebar, Header, Footer
└── shared/          # Avatar, Badge, LoadingSpinner, etc.
```

### **Route-Scoped Components** (`_components/`)
Co-located with the route that uses them.

```
app/(chat)/
├── page.tsx
└── _components/
    ├── ChatList.tsx
    ├── ChatBubble.tsx
    └── MessageInput.tsx
```

> **Why `_components/`?** The underscore prefix tells Next.js to ignore this folder when generating routes.

---

## API Layer

### **Service Pattern**
All API calls go through typed service functions.

```tsx
// src/services/chat-service.ts
import { apiClient } from './api-client';
import type { Message, SendMessageDTO } from '@/types/chat';

export const chatService = {
  getMessages: async (chatId: string): Promise<Message[]> => {
    const { data } = await apiClient.get(`/chats/${chatId}/messages`);
    return data;
  },

  sendMessage: async (dto: SendMessageDTO): Promise<Message> => {
    const { data } = await apiClient.post('/messages', dto);
    return data;
  },
};
```

### **Base Client** (`src/services/api-client.ts`)
Centralized axios/fetch instance with auth interceptors.

```tsx
import axios from 'axios';
import { env } from '@/config/env';

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## Real-Time with Socket.IO

### **Socket Provider** (`src/providers/socket-provider.tsx`)
```tsx
'use client';

import { createContext, useContext, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { env } from '@/config/env';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = io(env.NEXT_PUBLIC_SOCKET_URL, {
    autoConnect: false,
  });

  useEffect(() => {
    socket.connect();
    return () => { socket.disconnect(); };
  }, [socket]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error('useSocket must be used within SocketProvider');
  return socket;
};
```

### **Listening to Events** (in components)
```tsx
const socket = useSocket();
const queryClient = useQueryClient();

useEffect(() => {
  const handleNewMessage = (message: Message) => {
    queryClient.setQueryData(['chats', message.chatId, 'messages'], (old: Message[] = []) => {
      return [...old, message];
    });
  };

  socket.on('message:new', handleNewMessage);
  return () => { socket.off('message:new', handleNewMessage); };
}, [socket, queryClient]);
```

---

## Providers Setup

Wrap the app in `src/app/layout.tsx`:

```tsx
import { QueryProvider } from '@/providers/query-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { ThemeProvider } from '@/providers/theme-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <SocketProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## File Naming Conventions

| Item | Convention | Example |
| ------------- | ----------------------- | ------------------------ |
| Components | PascalCase | `ChatBubble.tsx` |
| Hooks | kebab-case, `use-` prefix | `use-auth.ts` |
| Stores | kebab-case, `-store` suffix | `auth-store.ts` |
| Services | kebab-case, `-service` suffix | `auth-service.ts` |
| Query hooks | kebab-case, `use-*-queries` | `use-chat-queries.ts` |
| Types | kebab-case | `chat.ts` |
| Utilities | kebab-case | `utils.ts` |

---

## Code Style Guidelines

### ✅ Do
- Keep files **under 300 lines** — split if needed
- Use **named exports** (except Next.js pages)
- Co-locate tests: `use-auth.test.ts` next to `use-auth.ts`
- Derive state instead of syncing with `useEffect`
- Use TanStack Query for **all** server state
- Use URL params for shareable state (modals, filters)
- Handle errors with Query's `error` state, not try-catch in components

### ❌ Don't
- Use `useEffect` for data fetching
- Duplicate server state in `useState` or Zustand
- Prop drill — use context or composition
- Use barrel exports everywhere (only for `components/ui/`)
- Default exports (except pages)

---

## Environment Variables

Validate in `src/config/env.ts`:

```tsx
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SOCKET_URL: z.string().url(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
});
```

`.env.local`:
```
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_SOCKET_URL=wss://socket.example.com
```

---

## Quick Reference: When to Use What

| State Type | Tool | Example |
|------------|------|---------|
| Server data | TanStack Query | Messages, users, profiles |
| Shareable UI state | URL params | Modal open, filters, selected item |
| Form inputs | React Hook Form | Login form, message input |
| Global UI preferences | Zustand | Theme, sidebar collapsed |
| Auth tokens | Zustand | JWT token |
| Derived state | useMemo/variables | Filtered lists, computed values |

---

**Built for performance, scalability, and developer experience.** 🚀