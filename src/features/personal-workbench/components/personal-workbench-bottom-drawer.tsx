import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from 'react'
import { NotebookPen, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { usePersonalWorkbenchBottomDrawerStore } from '../hooks/use-personal-workbench-bottom-drawer-store'
import { PersonalWorkbenchBottomDrawerRecordsAndWorkspaceContent } from './personal-workbench-bottom-drawer-records-and-workspace-content'

const PERSONAL_WORKBENCH_BOTTOM_DRAWER_DRAG_ACTIVATION_DISTANCE_PX = 6

function isPersonalWorkbenchBottomDrawerInteractiveElement(
  target: EventTarget | null
) {
  return Boolean(
    target instanceof HTMLElement &&
      target.closest(
        'button, a, input, textarea, select, option, [role="button"], [contenteditable="true"]'
      )
  )
}

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
    hasExceededActivationDistance: boolean
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
    (event: PointerEvent<HTMLElement>) => {
      if (
        event.button !== 0 ||
        isPersonalWorkbenchBottomDrawerInteractiveElement(event.target)
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      personalWorkbenchBottomDrawerDragSessionRef.current = {
        pointerId: event.pointerId,
        startClientY: event.clientY,
        startHeightVh: personalWorkbenchBottomDrawerHeightVh,
        hasExceededActivationDistance: false,
      }
      setIsPersonalWorkbenchBottomDrawerHeightBeingDragged(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [personalWorkbenchBottomDrawerHeightVh]
  )

  const continuePersonalWorkbenchBottomDrawerHeightDrag = useCallback(
    (event: PointerEvent<HTMLElement>) => {
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

      const clientYDelta = dragSession.startClientY - event.clientY
      if (
        !dragSession.hasExceededActivationDistance &&
        Math.abs(clientYDelta) < PERSONAL_WORKBENCH_BOTTOM_DRAWER_DRAG_ACTIVATION_DISTANCE_PX
      ) {
        return
      }

      dragSession.hasExceededActivationDistance = true
      const nextHeightVh =
        dragSession.startHeightVh + (clientYDelta / window.innerHeight) * 100
      setPersonalWorkbenchBottomDrawerHeightVh(nextHeightVh)
    },
    [
      isPersonalWorkbenchBottomDrawerHeightBeingDragged,
      setPersonalWorkbenchBottomDrawerHeightVh,
    ]
  )

  const stopPersonalWorkbenchBottomDrawerHeightDrag = useCallback(
    (event: PointerEvent<HTMLElement>) => {
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
      <div
        className='relative shrink-0 cursor-row-resize border-b border-border/70 bg-gradient-to-b from-sky-500/12 via-background/98 to-background/100 px-3 py-2 touch-none md:px-5'
        onPointerDown={startPersonalWorkbenchBottomDrawerHeightDrag}
        onPointerMove={continuePersonalWorkbenchBottomDrawerHeightDrag}
        onPointerUp={stopPersonalWorkbenchBottomDrawerHeightDrag}
        onPointerCancel={stopPersonalWorkbenchBottomDrawerHeightDrag}
        onLostPointerCapture={stopPersonalWorkbenchBottomDrawerHeightDrag}
      >
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-x-3 top-0 h-1.5 rounded-full bg-gradient-to-r from-amber-500 via-sky-500 to-cyan-500 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]'
        />

        <div className='flex min-h-9 items-center gap-2.5'>
          <div className='flex min-w-0 flex-1 items-center gap-2.5'>
            <NotebookPen className='size-4 shrink-0 text-sky-500' />
            <div className='min-w-0'>
              <p
                id='personal-workbench-bottom-drawer-title'
                className='truncate whitespace-nowrap text-sm font-black leading-none tracking-tight text-foreground italic'
              >
                个人记录
              </p>
              <p className='truncate whitespace-nowrap text-[10px] font-semibold leading-none tracking-[0.08em] text-muted-foreground/70'>
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
