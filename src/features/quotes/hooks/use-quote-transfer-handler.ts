import { useCallback } from 'react'

export function useQuoteTransferHandler(
  transferLabel: string,
  transferHelper: string,
  missing: boolean
) {
  return useCallback(() => {
    if (missing) {
      window.alert('客户未留联系方式')
      return
    }

    window.alert(
      `${transferLabel}能力待接入，当前已读取真实联系方式：${transferHelper}`
    )
  }, [missing, transferHelper, transferLabel])
}
