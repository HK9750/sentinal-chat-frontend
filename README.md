<div align="center">

# Sentinel Chat

<!-- 
A highly secure, real-time end-to-end encrypted messaging platform built with modern web technologies. 
Prioritizing privacy and seamless user experience through a clean, responsive interface.
-->

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)

</div>

---

## Overview

Sentinel Chat is a cutting-edge messaging application engineered for absolute privacy and real-time performance. Designed with a zero-compromise approach to security, it ensures all communications are end-to-end encrypted (E2EE) before they ever leave your device. The application features a meticulously crafted user interface, optimized for both desktop and mobile experiences, delivering seamless state management and instantaneous message delivery.

## Key Features

- 🔒 **End-to-End Encryption:** Client-side encryption utilizing the Signal Protocol ensures that only the intended recipients can read messages.
- ⚡ **Real-Time Communication:** Instant message delivery, typing indicators, and presence tracking powered by persistent WebSocket connections.
- 📱 **Responsive Design:** A polished, mobile-first interface built with Tailwind CSS, ensuring a flawless experience across all device sizes.
- 🏗️ **Modular Architecture:** A one-component-per-file structure emphasizing separation of concerns, scalability, and maintainability.
- 💾 **Optimized State Management:** Intelligent data fetching, caching, and optimistic UI updates for a snappy, unresponsive feel.
- 📞 **Audio & Video Calls:** Integrated WebRTC capabilities for secure, peer-to-peer audio and video communication.
- 📎 **Secure File Sharing:** Encrypted file uploads seamlessly integrated into the chat experience.

## Getting Started

### Prerequisites

Ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/sentinal-chat-frontend.git
   cd sentinal-chat-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory and add the necessary configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_SOCKET_URL=ws://localhost:5000/socket
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

The codebase is organized adhering to stringent frontend engineering standards:

- `/src/app`: Next.js App Router pages and layouts.
- `/src/components`: Reusable UI components and complex interactive elements.
- `/src/hooks`: Custom React hooks for encapsulation of logic.
- `/src/lib`: Utility functions, cryptographic helpers, and constants.
- `/src/providers`: React context providers for global state (Theme, Socket, Encryption).
- `/src/queries`: Data fetching and mutation hooks.
- `/src/services`: API client definitions and external service integrations.
- `/src/stores`: Global state management slices.
- `/src/types`: TypeScript interfaces and type definitions.

## Design Philosophy

The Sentinel Chat frontend is the embodiment of modern frontend engineering techniques:
- **Clean Code:** Adhering strictly to DRY principles and removing all unnecessary comments to ensure readability.
- **Minimal `useEffect`:** Logic is managed through robust data fetching layers and state managers to avoid render lifecycles anti-patterns.
- **Component Granularity:** Every component resides in its own isolated file, maximizing reusability and testing ease.
- **Perfect User Flows:** Carefully managed redirect paths, route guards, and back-button behaviors for a seamless user journey.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
