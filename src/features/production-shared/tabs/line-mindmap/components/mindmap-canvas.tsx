import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { flattenMindmapNodes } from '../data/mindmap-render'
import type { LineMindmapNode, MindmapLevel } from '../data/sample-mindmap'
import { MindmapCanvasEmptyState } from './mindmap-canvas-empty-state'
import { MindmapCanvasRow } from './mindmap-canvas-row'

const ROW_HEIGHT = 72
const OVERSCAN = 10

interface MindmapCanvasProps {
  nodes: LineMindmapNode[]
  selectedNodeId: string | null
  levelNames: Record<MindmapLevel, string>
  onSelect: (nodeId: string) => void
  onOpenHierarchyConfig?: () => void
}

export function MindmapCanvas({
  nodes,
  selectedNodeId,
  levelNames,
  onSelect,
  onOpenHierarchyConfig,
}: MindmapCanvasProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const rows = useMemo(() => flattenMindmapNodes(nodes), [nodes])

  useEffect(() => {
    const element = scrollRef.current

    if (!element) {
      return
    }

    setViewportHeight(element.clientHeight)

    const resizeObserver = new ResizeObserver(() => {
      setViewportHeight(element.clientHeight)
    })

    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const effectiveViewportHeight = viewportHeight || ROW_HEIGHT * 6
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(
    rows.length,
    Math.ceil((scrollTop + effectiveViewportHeight) / ROW_HEIGHT) + OVERSCAN
  )
  const visibleRows = rows.slice(startIndex, endIndex)
  const totalHeight = rows.length * ROW_HEIGHT

  return (
    <Card className='flex h-full min-h-[calc(100dvh-14rem)] flex-col rounded-[24px] border border-dashed border-muted/40 bg-background/90 shadow-none md:min-h-[calc(100dvh-15rem)]'>
      <CardHeader className='px-4 pt-3 pb-1.5 md:px-5'>
        <CardTitle className='text-sm font-black tracking-tighter text-foreground italic'>
          脑图区
        </CardTitle>
      </CardHeader>
      <CardContent
        ref={scrollRef}
        className='flex min-h-0 flex-1 flex-col overflow-auto px-4 pt-0 pb-4 md:px-5 md:pb-5'
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        {nodes.length > 0 ? (
          <div className='min-w-[320px]' style={{ height: `${totalHeight}px` }}>
            <div className='relative'>
              {visibleRows.map((row, index) => {
                const rowIndex = startIndex + index

                return (
                  <div
                    key={row.node.id}
                    className='absolute top-0 left-0 w-full'
                    data-index={rowIndex}
                    style={{
                      transform: `translateY(${rowIndex * ROW_HEIGHT}px)`,
                    }}
                  >
                    <MindmapCanvasRow
                      row={row}
                      levelNames={levelNames}
                      selected={selectedNodeId === row.node.id}
                      onSelect={onSelect}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <MindmapCanvasEmptyState
            levelNames={levelNames}
            onOpenHierarchyConfig={onOpenHierarchyConfig}
          />
        )}
      </CardContent>
    </Card>
  )
}
