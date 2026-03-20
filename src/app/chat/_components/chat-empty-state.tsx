'use client';

import { Lock, Laptop } from 'lucide-react';

export function ChatEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted/30 p-6">
      {/* WhatsApp Web style landing screen */}
      <div className="flex max-w-md flex-col items-center text-center">
        {/* Logo/Icon */}
        <div className="mb-6">
          <svg
            viewBox="0 0 303 172"
            className="h-40 w-auto text-muted-foreground/50"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M229.565 160.229C262.212 149.245 286.931 118.241 283.39 73.4194C278.009 5.31929 212.365 -11.5738 171.472 8.48673C115.998 35.9917 116.111 73.6594 93.4622 73.6594C70.8132 73.6594 47.4355 33.2304 12.6831 48.7581C-22.0693 64.2858 -2.72725 137.334 45.1476 162.727C79.2446 180.72 115.455 176.088 132.426 170.667C149.397 165.246 172.672 166.377 229.565 160.229Z"
            />
            <rect
              x="131"
              y="62"
              width="49"
              height="83"
              rx="24.5"
              fill="white"
            />
            <circle cx="155.5" cy="86.5" r="8.5" fill="currentColor" />
            <rect
              x="147"
              y="117"
              width="17"
              height="4"
              rx="2"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-3xl font-light text-foreground">
          Sentinel Chat for Web
        </h1>

        {/* Description */}
        <p className="mb-8 text-sm leading-6 text-muted-foreground">
          Send and receive messages without keeping your phone online.
          <br />
          Use Sentinel Chat on up to 4 linked devices at a time.
        </p>

        {/* Encryption notice */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Your personal messages are end-to-end encrypted</span>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Laptop className="h-4 w-4" />
        <span>Make calls from desktop with Sentinel Chat for Windows</span>
      </div>
    </div>
  );
}
