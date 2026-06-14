import { useState, useEffect, useRef, useCallback } from 'react'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useAiVoice')

// 浏览器 WebSpeech API 类型(类型库标准模糊,这里写最小可用接口)
interface SpeechRecognitionResultPayload {
  results?: ArrayLike<ArrayLike<{ transcript?: string }>>
}
interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: (event: SpeechRecognitionResultPayload) => void
  onstart: () => void
  onerror: () => void
  onend: () => void
  start: () => void
  stop: () => void
  abort: () => void
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}
interface WindowWithSpeech extends Window {
  webkitSpeechRecognition?: SpeechRecognitionConstructor
  SpeechRecognition?: SpeechRecognitionConstructor
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null

  const w = window as WindowWithSpeech
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * AI 语音识别 Hook (Speech-to-Text Integration)
 * 职责：封装浏览器语音识别 API 的生命周期与状态。
 */
export function useAiVoice(onResult: (transcript: string) => void) {
  const [isRecording, setIsRecording] = useState(false)
  const isSupported = !!getSpeechRecognitionCtor()
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // 1. 初始化语音引擎
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognitionCtor()
    if (!SpeechRecognition) {
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript
      if (transcript) {
        onResult(transcript)
      }
    }

    recognition.onstart = () => setIsRecording(true)
    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [onResult])

  // 2. 按钮控制逻辑
  const startRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (err) {
        logger.warn('Multiple start calls ignored.', err)
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  return {
    isRecording,
    startRecording,
    stopRecording,
    isSupported,
  }
}
