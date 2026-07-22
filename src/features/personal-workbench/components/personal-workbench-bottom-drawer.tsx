import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { GripHorizontal, NotebookPen, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePersonalWorkbenchBottomDrawerStore } from '../hooks/use-personal-workbench-bottom-drawer-store'
import { PersonalWorkbenchBottomDrawerRecordsAndWorkspaceContent } from './personal-workbench-bottom-drawer-records-and-workspace-content'

export function PersonalWorkbenchBottomDrawer() {
  const isOpen = usePersonalWorkbenchBottomDrawerStore((state) => state.isOpen)
  const closePersonalWorkbenchBottomDrawer =
    usePersonalWorkbenchBottomDrawerStore(
      (state) => state.closePersonalWorkbenchBottomDrawer
    )
  const personalWorkbenchBottomDrawerHeightVh =
    usePersonalWorkbenchBottomDrawerStore(
      (state) => state.personalWorkbenchBottomDrawerHeightVh
    )
  const setPersonalWorkbenchBottomDrawerHeightVh =
    usePersonalWorkbenchBottomDrawerStore(
      (state) => state.setPersonalWorkbenchBottomDrawerHeightVh
    )
  const [
    isPersonalWorkbenchBottomDrawerHeightBeingDragged,
    setIsPersonalWorkbenchBottomDrawerHeightBeingDragged,
  ] = useState(false)
  const personalWorkbenchBottomDrawerDragSessionRef = useRef<{
    pointerId: number
    startClientY: number
    startHeightVh: number
  } | null>(null)
  const closePersonalWorkbenchBottomDrawerAndResetDragState =
    useCallback(() => {
      setIsPersonalWorkbenchBottomDrawerHeightBeingDragged(false)
      personalWorkbenchBottomDrawerDragSessionRef.current = null
      closePersonalWorkbenchBottomDrawer()
    }, [closePersonalWorkbenchBottomDrawer])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePersonalWorkbenchBottomDrawerAndResetDragState()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closePersonalWorkbenchBottomDrawerAndResetDragState, isOpen])

  const startPersonalWorkbenchBottomDrawerHeightDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      personalWorkbenchBottomDrawerDragSessionRef.current = {
        pointerId: event.pointerId,
        startClientY: event.clientY,
        startHeightVh: personalWorkbenchBottomDrawerHeightVh,
      }
      setIsPersonalWorkbenchBottomDrawerHeightBeingDragged(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [personalWorkbenchBottomDrawerHeightVh]
  )

  const continuePersonalWorkbenchBottomDrawerHeightDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const dragSession = personalWorkbenchBottomDrawerDragSessionRef.current
      if (!isPersonalWorkbenchBottomDrawerHeightBeingDragged || !dragSession) {
        return
      }

      if (dragSession.pointerId !== event.pointerId) {
        return
      }

      if (typeof window === 'undefined') {
        return
      }

      const nextHeightVh =
        dragSession.startHeightVh +
        ((dragSession.startClientY - event.clientY) / window.innerHeight) * 100
      setPersonalWorkbenchBottomDrawerHeightVh(nextHeightVh)
    },
    [
      isPersonalWorkbenchBottomDrawerHeightBeingDragged,
      setPersonalWorkbenchBottomDrawerHeightVh,
    ]
  )

  const stopPersonalWorkbenchBottomDrawerHeightDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      setIsPersonalWorkbenchBottomDrawerHeightBeingDragged(false)
      personalWorkbenchBottomDrawerDragSessionRef.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    },
    []
  )

  const personalWorkbenchBottomDrawerPanelStyle = useMemo(
    () => ({ height: `${personalWorkbenchBottomDrawerHeightVh}dvh` }),
    [personalWorkbenchBottomDrawerHeightVh]
  )

  if (typeof document === 'undefined' || !isOpen) {
    return null
  }

  return createPortal(
    <section
      aria-labelledby='personal-workbench-bottom-drawer-title'
      aria-modal='false'
      className={cn(
        'fixed inset-x-0 bottom-0 z-[70] flex min-h-[20dvh] flex-col overflow-hidden rounded-t-[28px] border border-b-0 border-border/70 bg-background/98 shadow-[0_-24px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl',
        isPersonalWorkbenchBottomDrawerHeightBeingDragged && 'select-none'
      )}
      role='dialog'
      style={personalWorkbenchBottomDrawerPanelStyle}
    >
      <div className='relative shrink-0 border-b border-border/70 bg-gradient-to-b from-primary/10 via-background/98 to-background/100 px-3 py-2 md:px-5'>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-primary/40 to-transparent'
        />

        <div className='flex min-h-9 items-center gap-3'>
          <button
            type='button'
            aria-label='拖拽调整个人记录抽屉高度'
            className='group relative -ml-1 flex h-8 w-24 shrink-0 cursor-row-resize touch-none items-center justify-center rounded-full text-muted-foreground transition-colors select-none hover:bg-primary/10 hover:text-foreground'
            onPointerDown={startPersonalWorkbenchBottomDrawerHeightDrag}
            onPointerMove={continuePersonalWorkbenchBottomDrawerHeightDrag}
            onPointerUp={stopPersonalWorkbenchBottomDrawerHeightDrag}
            onPointerCancel={stopPersonalWorkbenchBottomDrawerHeightDrag}
            onLostPointerCapture={stopPersonalWorkbenchBottomDrawerHeightDrag}
          >
            <span
              aria-hidden='true'
              className='h-1.5 w-14 rounded-full bg-muted-foreground/25 transition-colors group-hover:bg-primary/45'
            />
            <GripHorizontal className='absolute size-4 opacity-90' />
          </button>

          <div className='flex min-w-0 flex-1 items-center gap-2.5'>
            <NotebookPen className='size-4 shrink-0 text-primary' />
            <div className='min-w-0'>
              <p
                id='personal-workbench-bottom-drawer-title'
                className='truncate text-sm font-black tracking-tight text-foreground italic'
              >
                个人记录
              </p>
              <p className='truncate text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                记录、备注和收纳内容
              </p>
            </div>
          </div>

          <Button
            type='button'
            aria-label='关闭个人记录底部抽屉'
            variant='ghost'
            size='icon'
            className='size-8 rounded-full'
            onClick={closePersonalWorkbenchBottomDrawerAndResetDragState}
          >
            <X className='size-4' />
          </Button>
        </div>
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <PersonalWorkbenchBottomDrawerRecordsAndWorkspaceContent />
      </ScrollArea>
    </section>,
    document.body
  )
}
