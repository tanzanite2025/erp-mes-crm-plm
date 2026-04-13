import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface UseMediaRecorderOptions {
  maxDurationSeconds?: number
}

interface UseMediaRecorderResult {
  countdown: number
  isRecording: boolean
  lastRecordedFile: File | null
  isSupported: boolean
  clearLastRecordedFile: () => void
  startRecording: (stream: MediaStream) => Promise<void>
  stopRecording: () => Promise<File | null>
}

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return ''
  }

  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) ?? ''
}

export function useMediaRecorder({ maxDurationSeconds = 10 }: UseMediaRecorderOptions = {}): UseMediaRecorderResult {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const countdownIntervalRef = useRef<number | null>(null)
  const autoStopTimeoutRef = useRef<number | null>(null)
  const resolverRef = useRef<((file: File | null) => void) | null>(null)
  const [countdown, setCountdown] = useState(maxDurationSeconds)
  const [isRecording, setIsRecording] = useState(false)
  const [lastRecordedFile, setLastRecordedFile] = useState<File | null>(null)

  const clearTimers = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (autoStopTimeoutRef.current !== null) {
      window.clearTimeout(autoStopTimeoutRef.current)
      autoStopTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimers()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
    }
  }, [clearTimers])

  const isSupported = useMemo(() => {
    return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'
  }, [])

  const startRecording = useCallback(async (stream: MediaStream) => {
    if (!isSupported) {
      throw new Error('当前浏览器不支持视频录制')
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }

    clearTimers()
    chunksRef.current = []
    setCountdown(maxDurationSeconds)

    const mimeType = pickSupportedMimeType()
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
    recorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    recorder.onstop = () => {
      clearTimers()
      setIsRecording(false)
      setCountdown(maxDurationSeconds)
      const blobType = recorder.mimeType || mimeType || 'video/webm'
      const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: blobType }) : null
      chunksRef.current = []
      const extension = blobType.includes('mp4') ? 'mp4' : 'webm'
      const file = blob ? new File([blob], `personal-record-${Date.now()}.${extension}`, { type: blobType }) : null
      setLastRecordedFile(file)
      resolverRef.current?.(file)
      resolverRef.current = null
    }

    recorder.start()
    setIsRecording(true)

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((current) => (current > 0 ? current - 1 : 0))
    }, 1000)

    autoStopTimeoutRef.current = window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    }, maxDurationSeconds * 1000)
  }, [clearTimers, isSupported, maxDurationSeconds])

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') {
      return null
    }

    return await new Promise<File | null>((resolve) => {
      resolverRef.current = resolve
      recorder.stop()
    })
  }, [])

  return {
    countdown,
    clearLastRecordedFile: () => setLastRecordedFile(null),
    isRecording,
    isSupported,
    lastRecordedFile,
    startRecording,
    stopRecording,
  }
}
