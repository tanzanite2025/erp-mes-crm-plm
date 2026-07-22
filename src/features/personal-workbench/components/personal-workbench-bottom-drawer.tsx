import {
  useCallback,
  useEffect,
  useMemo,
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
  const closePersonalWorkbenchBottomDrawerAndResetDragState =
    useCallback(() => {
      setIsPersonalWorkbenchBottomDrawerHeightBeingDragged(false)
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

  const updatePersonalWorkbenchBottomDrawerHeightFromPointerClientY =
    useCallback(
      (clientY: number) => {
        if (typeof window === 'undefined') {
          return
        }

        const nextHeightVh =
          ((window.innerHeight - clientY) / window.innerHeight) * 100
        setPersonalWorkbenchBottomDrawerHeightVh(nextHeightVh)
      },
      [setPersonalWorkbenchBottomDrawerHeightVh]
    )

  const startPersonalWorkbenchBottomDrawerHeightDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsPersonalWorkbenchBottomDrawerHeightBeingDragged(true)
      event.currentTarget.setPointerCapture(event.pointerId)
      updatePersonalWorkbenchBottomDrawerHeightFromPointerClientY(event.clientY)
    },
    [updatePersonalWorkbenchBottomDrawerHeightFromPointerClientY]
  )

  const continuePersonalWorkbenchBottomDrawerHeightDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!isPersonalWorkbenchBottomDrawerHeightBeingDragged) {
        return
      }
      updatePersonalWorkbenchBottomDrawerHeightFromPointerClientY(event.clientY)
    },
    [
      isPersonalWorkbenchBottomDrawerHeightBeingDragged,
      updatePersonalWorkbenchBottomDrawerHeightFromPointerClientY,
    ]
  )

  const stopPersonalWorkbenchBottomDrawerHeightDrag = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      setIsPersonalWorkbenchBottomDrawerHeightBeingDragged(false)
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
        'fixed inset-x-0 bottom-0 z-[70] flex min-h-[20dvh] flex-col overflow-hidden rounded-t-[32px] border border-b-0 border-border/70 bg-background/98 shadow-[0_-24px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl',
        isPersonalWorkbenchBottomDrawerHeightBeingDragged && 'select-none'
      )}
      role='dialog'
      style={personalWorkbenchBottomDrawerPanelStyle}
    >
      <div className='flex shrink-0 flex-col border-b border-dashed border-border/70 px-4 pt-3 pb-3 md:px-5'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <NotebookPen className='size-4 shrink-0 text-primary' />
            <div className='min-w-0'>
              <p
                id='personal-workbench-bottom-drawer-title'
                className='truncate text-[10px] font-black tracking-[0.24em] text-muted-foreground/60 uppercase'
              >
                个人记录底部抽屉
              </p>
              <p className='truncate text-sm font-black tracking-tight text-foreground italic'>
                查看记录、备注和收纳内容，不打断当前操作
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

        <button
          type='button'
          aria-label='拖拽调整个人记录抽屉高度'
          className='mt-3 flex h-7 cursor-row-resize touch-none items-center justify-center rounded-full text-muted-foreground transition-colors select-none hover:text-foreground'
          onPointerDown={startPersonalWorkbenchBottomDrawerHeightDrag}
          onPointerMove={continuePersonalWorkbenchBottomDrawerHeightDrag}
          onPointerUp={stopPersonalWorkbenchBottomDrawerHeightDrag}
          onPointerCancel={stopPersonalWorkbenchBottomDrawerHeightDrag}
          onLostPointerCapture={stopPersonalWorkbenchBottomDrawerHeightDrag}
        >
          <GripHorizontal className='size-5' />
        </button>
      </div>

      <ScrollArea className='min-h-0 flex-1'>
        <PersonalWorkbenchBottomDrawerRecordsAndWorkspaceContent />
      </ScrollArea>
    </section>,
    document.body
  )
}
