import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard, RotateCcw, ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type HIDScanCompletionReason = 'enter' | 'tab' | 'idle' | 'manual'

export interface HIDScanResult {
  rawCode: string
  normalizedCode: string
  completedBy: HIDScanCompletionReason
  completedAt: string
  durationMs: number
  charCount: number
  hasWhitespaceWrapper: boolean
}

export interface HIDScanInputProps {
  value?: string
  onValueChange?: (value: string) => void
  onScanComplete: (code: string, result: HIDScanResult) => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  completeOnIdle?: boolean
  clearOnComplete?: boolean
  idleDelayMs?: number
  className?: string
  inputClassName?: string
  showManualComplete?: boolean
  showReset?: boolean
}

function normalizeScanCode(value: string) {
  return value.trim()
}

export function HIDScanInput({
  value,
  onValueChange,
  onScanComplete,
  placeholder = '请扫描条码',
  disabled,
  autoFocus,
  completeOnIdle = true,
  clearOnComplete = false,
  idleDelayMs = 260,
  className,
  inputClassName,
  showManualComplete = true,
  showReset = true,
}: HIDScanInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const valueRef = useRef('')
  const lastCompletedRef = useRef<{ code: string; at: number } | null>(null)

  const currentValue = value ?? internalValue
  valueRef.current = currentValue

  const setScanValue = useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [onValueChange, value]
  )

  const clearIdleTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const completeScan = useCallback(
    (completedBy: HIDScanCompletionReason, rawValue = valueRef.current) => {
      clearIdleTimer()

      const rawCode = rawValue
      const normalizedCode = normalizeScanCode(rawCode)
      if (!normalizedCode) return

      const now = Date.now()
      const lastCompleted = lastCompletedRef.current
      if (
        lastCompleted?.code === normalizedCode &&
        now - lastCompleted.at < Math.max(idleDelayMs, 500)
      ) {
        return
      }

      const startedAt = startedAtRef.current ?? now
      lastCompletedRef.current = { code: normalizedCode, at: now }
      startedAtRef.current = null

      const result: HIDScanResult = {
        rawCode,
        normalizedCode,
        completedBy,
        completedAt: new Date(now).toISOString(),
        durationMs: Math.max(0, now - startedAt),
        charCount: rawCode.length,
        hasWhitespaceWrapper: rawCode !== normalizedCode,
      }

      onScanComplete(normalizedCode, result)

      if (clearOnComplete) {
        setScanValue('')
      }
    },
    [clearIdleTimer, clearOnComplete, idleDelayMs, onScanComplete, setScanValue]
  )

  const scheduleIdleComplete = useCallback(
    (nextValue: string) => {
      clearIdleTimer()
      if (!completeOnIdle || !nextValue.trim()) return

      timerRef.current = window.setTimeout(() => {
        completeScan('idle', nextValue)
      }, idleDelayMs)
    },
    [clearIdleTimer, completeOnIdle, completeScan, idleDelayMs]
  )

  useEffect(() => clearIdleTimer, [clearIdleTimer])

  return (
    <div className={cn('space-y-3', className)}>
      <div className='relative'>
        <ScanLine className='pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/40' />
        <Input
          value={currentValue}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(event) => {
            const nextValue = event.target.value
            if (!valueRef.current && nextValue) {
              startedAtRef.current = Date.now()
            }
            setScanValue(nextValue)
            scheduleIdleComplete(nextValue)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              completeScan('enter')
            }
            if (event.key === 'Tab' && valueRef.current.trim()) {
              event.preventDefault()
              completeScan('tab')
            }
          }}
          className={cn(
            'h-12 rounded-2xl border-dashed bg-background pr-4 pl-11 font-mono text-sm font-black tracking-widest',
            inputClassName
          )}
        />
      </div>

      {showManualComplete || showReset ? (
        <div className='flex flex-wrap gap-2'>
          {showManualComplete ? (
            <Button
              type='button'
              variant='outline'
              disabled={disabled || !currentValue.trim()}
              onClick={() => completeScan('manual')}
              className='h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
            >
              <Keyboard className='mr-2 size-3.5' />
              手动完成
            </Button>
          ) : null}
          {showReset ? (
            <Button
              type='button'
              variant='ghost'
              disabled={disabled || !currentValue}
              onClick={() => {
                clearIdleTimer()
                startedAtRef.current = null
                setScanValue('')
              }}
              className='h-9 rounded-full px-4 text-[10px] font-black tracking-widest uppercase'
            >
              <RotateCcw className='mr-2 size-3.5' />
              清空
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
