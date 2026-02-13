import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  
  // Modals
  activeModal: string | null;
  modalData: unknown;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;
  
  // Mobile
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  }>;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  
  // Loading states
  loadingStates: Map<string, boolean>;
  setLoading: (key: string, isLoading: boolean) => void;
  isLoading: (key: string) => boolean;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      isSidebarOpen: true,
      activeModal: null,
      modalData: null,
      isMobile: false,
      notifications: [],
      loadingStates: new Map(),

      setTheme: (theme) => set({ theme }),
      
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
      
      openModal: (activeModal, modalData) => set({ activeModal, modalData }),
      closeModal: () => set({ activeModal: null, modalData: null }),
      
      setIsMobile: (isMobile) => set({ isMobile }),
      
      addNotification: (notification) => set((state) => ({
        notifications: [
          ...state.notifications,
          { ...notification, id: Math.random().toString(36).substr(2, 9) },
        ],
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      })),
      
      setLoading: (key, isLoading) => set((state) => {
        const newLoadingStates = new Map(state.loadingStates);
        newLoadingStates.set(key, isLoading);
        return { loadingStates: newLoadingStates };
      }),
      
      isLoading: (key) => get().loadingStates.get(key) || false,
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);
