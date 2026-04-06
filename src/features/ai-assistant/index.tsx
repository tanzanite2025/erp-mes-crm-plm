import React, { Component, ReactNode, Suspense, lazy } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AIAssistant')

/**
 * AI 模块专项断路器 (ErrorBoundary)
 * 确保 AI 模块代码崩溃时不影响全局 ERP 系统
 */
class AiErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error('Isolated module crash', { error, errorInfo })
    }

    render() {
        if (this.state.hasError) {
            // 模块损坏时的降级显示：右下角一个微型错误图标，不显示 AI 按钮
            return (
                <div className="fixed bottom-6 left-6 z-[101]">
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="size-14 rounded-full bg-red-50/50 border border-red-200 text-red-500"
                        onClick={() => window.location.reload()}
                        title="AI 助手组件故障，点击刷新页面"
                    >
                        <AlertCircle className="size-6" />
                    </Button>
                </div>
            )
        }
        return this.props.children
    }
}

// 懒加载真正的 AI 触发逻辑
const AiTrigger = lazy(() => import('./components/ai-trigger').then(m => ({ default: m.AiTrigger })))

/**
 * 全局导出的 AI 助手入口
 */
export default function AIAssistant() {
    return (
        <AiErrorBoundary>
            <Suspense fallback={null}>
                <AiTrigger />
            </Suspense>
        </AiErrorBoundary>
    )
}
