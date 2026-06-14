import { create } from 'zustand'

interface AiContextState {
  /** 当前业务页面感知的核心数据 (JSON 模型) */
  localContext: Record<string, any> | null
  /** 当前感知的页面名称或业务实体类型 (如: 'BOM_DETAIL', 'SALES_ORDER') */
  contextTitle: string | null

  /** 注入页面上下文 */
  setPageContext: (data: Record<string, any>, title: string) => void
  /** 清理上下文 (跨页面重置) */
  clearPageContext: () => void
}

/**
 * AI 上下文总线存储 (Zustand)
 * 职责：作为业务页面与 AI 侧边栏之间的“感知桥梁”
 */
export const useAiContextStore = create<AiContextState>((set) => ({
  localContext: null,
  contextTitle: null,

  setPageContext: (data, title) =>
    set({ localContext: data, contextTitle: title }),
  clearPageContext: () => set({ localContext: null, contextTitle: null }),
}))
