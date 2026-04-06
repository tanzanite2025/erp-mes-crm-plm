import { useState, useEffect, useRef, useCallback } from 'react'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useAiVoice')

/**
 * AI 语音识别 Hook (Speech-to-Text Integration)
 * 职责：封装浏览器语音识别 API 的生命周期与状态。
 */
export function useAiVoice(onResult: (transcript: string) => void) {
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)

  // 1. 初始化语音引擎
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          onResult(transcript)
        }
      }

      recognition.onstart = () => setIsRecording(true)
      recognition.onerror = () => setIsRecording(false)
      recognition.onend = () => setIsRecording(false)
      
      recognitionRef.current = recognition
    }

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
    isSupported: !!recognitionRef.current || !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)
  }
}
