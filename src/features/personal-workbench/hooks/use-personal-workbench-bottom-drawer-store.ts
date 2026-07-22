import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const PERSONAL_WORKBENCH_BOTTOM_DRAWER_MIN_HEIGHT_VH = 20
export const PERSONAL_WORKBENCH_BOTTOM_DRAWER_DEFAULT_HEIGHT_VH = 50
export const PERSONAL_WORKBENCH_BOTTOM_DRAWER_MAX_HEIGHT_VH = 80

export function clampPersonalWorkbenchBottomDrawerHeightToAllowedViewportRange(
  requestedHeightVh: number
) {
  return Math.min(
    PERSONAL_WORKBENCH_BOTTOM_DRAWER_MAX_HEIGHT_VH,
    Math.max(PERSONAL_WORKBENCH_BOTTOM_DRAWER_MIN_HEIGHT_VH, requestedHeightVh)
  )
}

interface PersonalWorkbenchBottomDrawerState {
  personalWorkbenchBottomDrawerHeightVh: number
  isOpen: boolean
  closePersonalWorkbenchBottomDrawer: () => void
  openPersonalWorkbenchBottomDrawer: () => void
  setPersonalWorkbenchBottomDrawerHeightVh: (heightVh: number) => void
  setPersonalWorkbenchBottomDrawerOpen: (isOpen: boolean) => void
}

export const usePersonalWorkbenchBottomDrawerStore =
  create<PersonalWorkbenchBottomDrawerState>()(
    persist(
      (set) => ({
        personalWorkbenchBottomDrawerHeightVh:
          PERSONAL_WORKBENCH_BOTTOM_DRAWER_DEFAULT_HEIGHT_VH,
        isOpen: false,
        closePersonalWorkbenchBottomDrawer: () => set({ isOpen: false }),
        openPersonalWorkbenchBottomDrawer: () => set({ isOpen: true }),
        setPersonalWorkbenchBottomDrawerHeightVh: (heightVh) =>
          set({
            personalWorkbenchBottomDrawerHeightVh:
              clampPersonalWorkbenchBottomDrawerHeightToAllowedViewportRange(
                heightVh
              ),
          }),
        setPersonalWorkbenchBottomDrawerOpen: (isOpen) => set({ isOpen }),
      }),
      {
        name: 'xdfc_personal_workbench_bottom_drawer_v1',
        partialize: (state) => ({
          personalWorkbenchBottomDrawerHeightVh:
            state.personalWorkbenchBottomDrawerHeightVh,
        }),
        merge: (persistedState, currentState) => {
          const persisted = persistedState as
            | Partial<PersonalWorkbenchBottomDrawerState>
            | undefined
          const persistedHeightVh =
            typeof persisted?.personalWorkbenchBottomDrawerHeightVh === 'number'
              ? persisted.personalWorkbenchBottomDrawerHeightVh
              : currentState.personalWorkbenchBottomDrawerHeightVh

          return {
            ...currentState,
            personalWorkbenchBottomDrawerHeightVh:
              clampPersonalWorkbenchBottomDrawerHeightToAllowedViewportRange(
                persistedHeightVh
              ),
            isOpen: false,
          }
        },
      }
    )
  )
