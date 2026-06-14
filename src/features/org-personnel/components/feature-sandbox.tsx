import React, { Component, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { createLogger } from '@/lib/logger'
import { Card } from '@/components/ui/card'

const logger = createLogger('FeatureSandbox')

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
    logger.error(`${this.props.fallbackName || 'Feature'} crashed`, {
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='animate-in p-8 duration-700 fade-in'>
          <Card className='flex flex-col items-center justify-center gap-4 rounded-[32px] border-dashed border-rose-500/50 bg-rose-500/5 p-12 text-center'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10'>
              <AlertCircle className='h-6 w-6 animate-pulse text-rose-600' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-sm font-black tracking-tighter text-rose-600 uppercase italic'>
                [SANDBOX_FAILURE] {this.props.fallbackName || 'MODULAR_BLOCK'}{' '}
                UNAVAILABLE
              </h3>
              <p className='max-w-md text-[10px] leading-relaxed font-black tracking-widest text-muted-foreground uppercase'>
                此功能模块目前处于隔离维护状态或发生了非预期错误。
                由于采用了物理沙箱隔离，您的其他业务操作（如人员管理、组织架构）不受任何影响。
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className='mt-4 h-9 rounded-full bg-rose-600 px-6 text-[10px] font-black tracking-widest text-white uppercase transition-colors hover:bg-rose-700'
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
