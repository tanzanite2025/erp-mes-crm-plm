import { useEffect } from 'react'

export function useProductCreationGuideSubmissionLock(
  isBusy: boolean,
  onBusyChange: (busy: boolean) => void
) {
  useEffect(() => {
    onBusyChange(isBusy)
    return () => onBusyChange(false)
  }, [isBusy, onBusyChange])
}
