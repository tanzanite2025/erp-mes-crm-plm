import { useMemo } from 'react'
import type { QuoteDetail } from '@/features/quotes/data/quote-detail'

export function useQuoteTransferAction(detail: QuoteDetail | null) {
  return useMemo(() => {
    if (detail?.wechat) {
      return {
        label: '转发微信',
        helper: `客户微信：${detail.wechat}`,
        missing: false,
      }
    }

    if (detail?.whatsapp) {
      return {
        label: '转发 WhatsApp',
        helper: `客户 WhatsApp：${detail.whatsapp}`,
        missing: false,
      }
    }

    return {
      label: '转发客户',
      helper: '客户未留联系方式',
      missing: true,
    }
  }, [detail])
}
