import { create } from 'zustand'

interface PersonalWorkbenchDialogState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const usePersonalWorkbenchDialogStore =
  create<PersonalWorkbenchDialogState>((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
  }))
