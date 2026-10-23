import { useCallback } from 'react'
import { showApplicationAlert } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'

export function useQuoteTransferHandler(
  transferLabel: string,
  transferHelper: string,
  missing: boolean
) {
  return useCallback(async () => {
    if (missing) {
      await showApplicationAlert('客户未留联系方式')
      return
    }

    await showApplicationAlert(
      `${transferLabel}能力待接入，当前已读取真实联系方式：${transferHelper}`
    )
  }, [missing, transferHelper, transferLabel])
}
