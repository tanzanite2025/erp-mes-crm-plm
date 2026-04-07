import { create } from 'zustand'

const MAX_SCAN_ACTIVITIES = 40

export interface ScanActivity {
  id: string
  rawCode: string
  process: string
  result: string
  description: string
  time: string
  scannedAt: string
  type: 'success' | 'info'
}

interface ScanActivityState {
  activities: ScanActivity[]
  addFromPayload: (payload: any) => void
  clear: () => void
}

function toActivity(payload: any): ScanActivity | null {
  const rawCode = String(payload?.rawCode || payload?.parsed?.rawCode || '').trim()
  if (!rawCode) return null

  const scannedAt = String(payload?.scannedAt || new Date().toISOString())
  if (!payload?.bridge || !payload?.resolved) {
    throw new Error("[CRITICAL] Scan activity payload corrupted: missing bridge or resolved metadata");
  }
  const bridge = payload.bridge
  const resolved = payload.resolved
  const productName = resolved?.product?.name ? String(resolved.product.name) : ''
  const materialCode = resolved?.material?.code ? String(resolved.material.code) : ''

  let result = '已完成结构解析'
  if (bridge?.applied) {
    result = '已桥接到盘点提交流程'
  } else if (productName) {
    result = `已识别产品 ${productName}`
  } else if (materialCode) {
    result = `已关联物料 ${materialCode}`
  }

  const details = [
    payload?.scene ? `场景 ${String(payload.scene).toUpperCase()}` : '场景 GENERAL',
    payload?.deviceId ? `设备 ${String(payload.deviceId)}` : '',
    payload?.parsed?.segments?.serial ? `流水 ${String(payload.parsed.segments.serial)}` : '',
  ]
    .filter(Boolean)
    .join(' / ')

  return {
    id: `${rawCode}-${scannedAt}`,
    rawCode,
    process: payload?.protocol ? String(payload.protocol).toUpperCase() : 'SCAN',
    result,
    description: details || String(payload?.summary || '原始扫码事件'),
    time: new Date(scannedAt).toLocaleTimeString('zh-CN', { hour12: false }),
    scannedAt,
    type: bridge?.applied ? 'success' : 'info',
  }
}

export const useScanActivityStore = create<ScanActivityState>()((set) => ({
  activities: [],
  addFromPayload: (payload) =>
    set((state) => {
      const next = toActivity(payload)
      if (!next) return state

      const deduped = state.activities.filter((item) => item.id !== next.id)
      return {
        activities: [next, ...deduped].slice(0, MAX_SCAN_ACTIVITIES),
      }
    }),
  clear: () => set({ activities: [] }),
}))
