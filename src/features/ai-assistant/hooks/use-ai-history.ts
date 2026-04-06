import { useState, useCallback, useEffect } from 'react'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { type ChatMessage } from '../services/ai-service'

const AI_HISTORY_STORAGE_KEY = 'xdfc_ai_chat_history'
const MAX_MESSAGES = 20 // 允许保留最近 10 轮对话 (User + Assistant)

/**
 * AI 对话历史持久化 Hook
 * 职责：管理消息状态，与 IndexedDB 进行同步
 */
export function useAiHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. 初始化时恢复历史
  useEffect(() => {
    async function restore() {
      const history = await StorageService.getItem<ChatMessage[]>(AI_HISTORY_STORAGE_KEY)
      if (history && Array.isArray(history)) {
        setMessages(history)
      }
      setIsLoading(false)
    }
    void restore()
  }, [])

  // 2. 状态变更时自动保存
  useEffect(() => {
    if (!isLoading) {
      void StorageService.setItem(AI_HISTORY_STORAGE_KEY, messages)
    }
  }, [messages, isLoading])

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      const next = [...prev, msg]
      // 自动滑动窗口：保留最近的 MAX_MESSAGES 条
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
    })
  }, [])

  const updateLastAssistantMessage = useCallback((chunk: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last && last.role === 'assistant') {
        const nextContent = last.content + chunk
        return [...prev.slice(0, -1), { ...last, content: nextContent }]
      }
      return prev
    })
  }, [])
  
  const setAssistantPlaceholder = useCallback(() => {
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
  }, [])

  const clearHistory = useCallback(async () => {
    setMessages([])
    await StorageService.removeItem(AI_HISTORY_STORAGE_KEY)
  }, [])

  return {
    messages,
    setMessages,
    appendMessage,
    updateLastAssistantMessage,
    setAssistantPlaceholder,
    clearHistory,
    isLoading
  }
}
