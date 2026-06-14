import { useEffect } from 'react'
import { useAiContextStore } from '@/stores/ai-context-store'

interface PageContextProps {
  data: Record<string, any>
  title: string
}

/**
 * 业务页面感知 Hook
 * 职责：当组件挂载时，将局部业务数据“推入” AI 上下文总线；卸载时清理。
 */
export function useAiPageContext({ data, title }: PageContextProps) {
  const setPageContext = useAiContextStore((s) => s.setPageContext)
  const clearPageContext = useAiContextStore((s) => s.clearPageContext)

  useEffect(() => {
    // 1. 注入当前页面的深度业务模型 (BOM, PO, WIP Detail 等)
    // AI 侧边栏及极光分析按钮将自动拾取此上下文
    if (data && title) {
      setPageContext(data, title)
    }

    // 2. 卸载时清理，防止“张三页面的订单”出现在“李四页面的物料分析”中
    return () => {
      clearPageContext()
    }
  }, [data, title, setPageContext, clearPageContext])
}
