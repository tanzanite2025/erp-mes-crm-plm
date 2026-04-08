import React, { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallbackName?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * FeatureSandbox - 隔离开发专用沙箱。
 * 捕获子组件运行时错误，防止页签崩溃影响整个模块。
 */
export class FeatureSandbox extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[CRITICAL_SANDBOX_FAILURE] ${this.props.fallbackName || 'Feature'} crashed:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 animate-in fade-in duration-700">
          <Card className="p-12 border-dashed border-rose-500/50 bg-rose-500/5 flex flex-col items-center justify-center gap-4 text-center rounded-[32px]">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-rose-600 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-black italic uppercase tracking-tighter text-rose-600">
                [SANDBOX_FAILURE] {this.props.fallbackName || 'MODULAR_BLOCK'} UNAVAILABLE
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-relaxed max-w-md">
                此功能模块目前处于隔离维护状态或发生了非预期错误。
                由于采用了物理沙箱隔离，您的其他业务操作（如人员管理、组织架构）不受任何影响。
              </p>
            </div>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-6 h-9 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors"
            >
              尝试恢复
            </button>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
