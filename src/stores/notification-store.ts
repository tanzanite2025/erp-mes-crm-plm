import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationState {
  unreadApprovals: number
  incrementUnread: () => void
  resetUnread: () => void
  setUnread: (count: number) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      unreadApprovals: 0,
      incrementUnread: () =>
        set((state) => ({ unreadApprovals: state.unreadApprovals + 1 })),
      resetUnread: () => set({ unreadApprovals: 0 }),
      setUnread: (count) => set({ unreadApprovals: count }),
    }),
    {
      name: 'notification-storage',
    }
  )
)
