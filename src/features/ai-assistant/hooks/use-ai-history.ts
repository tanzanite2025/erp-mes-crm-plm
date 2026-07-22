import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { type ChatMessage } from '../services/ai-service'

const AI_HISTORY_STORAGE_KEY = 'xdfc_ai_chat_history'
const MAX_MESSAGES = 20 // 允许保留最近 10 轮对话 (User + Assistant)

export function getAiHistoryStorageKey(userId?: string | null): string | null {
  const normalizedUserId = userId?.trim()
  return normalizedUserId
    ? `${AI_HISTORY_STORAGE_KEY}:${normalizedUserId}`
    : null
}

/**
 * AI 对话历史持久化 Hook
 * 职责：按登录用户管理消息状态，与 IndexedDB 进行同步。
 */
export function useAiHistory() {
  const userId = useAuthStore((state) => state.user?.id || null)
  const storageKey = getAiHistoryStorageKey(userId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null)

  useEffect(() => {
    void StorageService.removeItem(AI_HISTORY_STORAGE_KEY).catch(
      () => undefined
    )
  }, [])

  // 1. 初始化时恢复历史
  useEffect(() => {
    let cancelled = false

    async function restore() {
      setIsLoading(true)
      setLoadedStorageKey(null)

      if (!storageKey) {
        if (!cancelled) {
          setMessages([])
          setLoadedStorageKey(null)
          setIsLoading(false)
        }
        return
      }

      const history = await StorageService.getItem<ChatMessage[]>(storageKey)
      if (cancelled) return

      if (Array.isArray(history)) {
        setMessages(history)
      } else {
        setMessages([])
      }
      setLoadedStorageKey(storageKey)
      setIsLoading(false)
    }
    void restore()

    return () => {
      cancelled = true
    }
  }, [storageKey])

  // 2. 状态变更时自动保存
  useEffect(() => {
    if (!isLoading && storageKey && loadedStorageKey === storageKey) {
      void StorageService.setItem(storageKey, messages)
    }
  }, [messages, isLoading, loadedStorageKey, storageKey])

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg]
      // 自动滑动窗口：保留最近的 MAX_MESSAGES 条
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
    })
  }, [])

  const updateLastAssistantMessage = useCallback((chunk: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === 'assistant') {
        const nextContent = last.content + chunk
        return [...prev.slice(0, -1), { ...last, content: nextContent }]
      }
      return prev
    })
  }, [])

  const setAssistantPlaceholder = useCallback(() => {
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
  }, [])

  const clearHistory = useCallback(async () => {
    setMessages([])
    if (storageKey) {
      await StorageService.removeItem(storageKey)
    }
  }, [storageKey])

  return {
    messages,
    setMessages,
    appendMessage,
    updateLastAssistantMessage,
    setAssistantPlaceholder,
    clearHistory,
    isLoading,
  }
}
