import { useState, useCallback } from 'react'
import { useAiContextStore } from '@/stores/ai-context-store'
import { createLogger } from '@/lib/logger'
import {
  callProviderStream,
  type ChatMessage,
  type DashboardSummary,
} from '../services/ai-service'
import { useAiHistory } from './use-ai-history'

const logger = createLogger('useAiChatEngine')

interface UseAiChatEngineOptions {
  getLatestSnapshot: () => Promise<DashboardSummary>
}

/**
 * AI 对话核心引擎 Hook (Industrial Chat Engine)
 * 职责：管理消息流控制、实时快照注入、历史持久化同步。
 * 特点：Live Context 感知、流式状态管理、错误大声报错。
 */
export function useAiChatEngine({ getLatestSnapshot }: UseAiChatEngineOptions) {
  const {
    messages,
    appendMessage,
    updateLastAssistantMessage,
    setAssistantPlaceholder,
    clearHistory,
    isLoading: isHistoryLoading,
  } = useAiHistory()

  const [isGenerating, setIsGenerating] = useState(false)

  // 引用临场上下文 (Page Context)
  const localContext = useAiContextStore((s) => s.localContext)
  const contextTitle = useAiContextStore((s) => s.contextTitle)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isGenerating) return

      // 1. 追加用户消息
      const userMsg: ChatMessage = { role: 'user', content }
      appendMessage(userMsg)
      setIsGenerating(true)
      setAssistantPlaceholder()

      try {
        // 2. [LIVE_CONTEXT] 每一轮对话都异步抓取最新的秒级快照
        const snapshot = await getLatestSnapshot()

        // 3. 注入局部页面上下文
        if (localContext && contextTitle) {
          snapshot.localContext = {
            title: contextTitle,
            data: localContext,
          }
        }

        // 4. 调用流式接口
        const chatContext = [...messages, userMsg]

        await callProviderStream(
          chatContext,
          (chunk) => {
            updateLastAssistantMessage(chunk)
          },
          snapshot
        )
      } catch (error: unknown) {
        logger.error('Stream failed', error)
        const message = error instanceof Error ? error.message : '未知错误'
        updateLastAssistantMessage(
          `\n\n> [!CAUTION]\n> **[CRITICAL ERROR]** 对话流中断: ${message}`
        )
      } finally {
        setIsGenerating(false)
      }
    },
    [
      messages,
      isGenerating,
      getLatestSnapshot,
      localContext,
      contextTitle,
      appendMessage,
      setAssistantPlaceholder,
      updateLastAssistantMessage,
    ]
  )

  return {
    messages,
    isGenerating,
    isHistoryLoading,
    sendMessage,
    clearHistory,
  }
}
