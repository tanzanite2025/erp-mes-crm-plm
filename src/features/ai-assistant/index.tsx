import React, { Component, lazy, type ReactNode, Suspense } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AIAssistant')

type AiAssistantPlacement = 'floating' | 'dock'

class AiErrorBoundary extends Component<
    { children: ReactNode; placement: AiAssistantPlacement },
    { hasError: boolean }
> {
    constructor(props: { children: ReactNode; placement: AiAssistantPlacement }) {
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
            const fallbackButton = (
                <Button
                    size="icon"
                    variant="ghost"
                    className="size-11 rounded-full border border-red-200 bg-red-50/50 text-red-500"
                    onClick={() => window.location.reload()}
                    title="AI assistant component failed. Click to reload."
                >
                    <AlertCircle className="size-5" />
                </Button>
            )

            if (this.props.placement === 'dock') {
                return fallbackButton
            }

            return <div className="fixed bottom-6 left-6 z-[101]">{fallbackButton}</div>
        }

        return this.props.children
    }
}

const AiTrigger = lazy(() => import('./components/ai-trigger').then(m => ({ default: m.AiTrigger })))

interface AIAssistantProps {
    placement?: AiAssistantPlacement
}

export default function AIAssistant({ placement = 'floating' }: AIAssistantProps) {
    return (
        <AiErrorBoundary placement={placement}>
            <Suspense fallback={null}>
                <AiTrigger placement={placement} />
            </Suspense>
        </AiErrorBoundary>
    )
}
