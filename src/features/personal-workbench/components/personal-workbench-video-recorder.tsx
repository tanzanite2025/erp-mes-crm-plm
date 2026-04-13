import { Loader2, Square, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PersonalWorkbenchVideoRecorderProps {
  countdown: number
  disabled?: boolean
  isRecording: boolean
  isSupported: boolean
  onStart: () => void
  onStop: () => void
}

export function PersonalWorkbenchVideoRecorder({
  countdown,
  disabled = false,
  isRecording,
  isSupported,
  onStart,
  onStop,
}: PersonalWorkbenchVideoRecorderProps) {
  if (!isSupported) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed bg-background/90 p-3 transition-colors',
        isRecording
          ? 'border-destructive/70 bg-destructive/5 shadow-[0_0_0_1px_rgba(220,38,38,0.18)] animate-pulse'
          : 'border-primary/20'
      )}
    >
      <div className='flex items-center gap-2'>
        <Badge variant={isRecording ? 'destructive' : 'outline'}>
          {isRecording ? `录制中 ${countdown}s` : '最长 10 秒'}
        </Badge>
        {isRecording ? <span className='text-[11px] font-black uppercase tracking-widest text-destructive'>正在记录现场</span> : null}
      </div>
      {isRecording ? (
        <Button type='button' size='sm' variant='destructive' className='rounded-full' onClick={onStop} disabled={disabled}>
          {disabled ? <Loader2 className='size-4 animate-spin' /> : <Square className='size-4' />}
          停止录制
        </Button>
      ) : (
        <Button type='button' size='sm' variant='outline' className='rounded-full' onClick={onStart} disabled={disabled}>
          {disabled ? <Loader2 className='size-4 animate-spin' /> : <Video className='size-4' />}
          开始录制
        </Button>
      )}
    </div>
  )
}
