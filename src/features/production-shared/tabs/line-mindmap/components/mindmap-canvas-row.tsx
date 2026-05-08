import { memo } from 'react'
import { MindmapNodeCard } from './mindmap-node-card'
import type { MindmapLevel } from '../data/sample-mindmap'
import type { LineMindmapFlatRow } from '../data/mindmap-render'

const INDENT_PX = 24
const CONNECTOR_WIDTH_PX = 20
const CONNECTOR_Y_PX = 18

interface MindmapCanvasRowProps {
  row: LineMindmapFlatRow
  levelNames: Record<MindmapLevel, string>
  selected: boolean
  onSelect: (nodeId: string) => void
}

function MindmapCanvasRowComponent({
  row,
  levelNames,
  selected,
  onSelect,
}: MindmapCanvasRowProps) {
  const paddingLeft = row.depth * INDENT_PX
  const connectorLeft = paddingLeft - CONNECTOR_WIDTH_PX

  return (
    <div className='relative pb-3' style={{ paddingLeft }}>
      {row.ancestorHasNextSiblings.map((hasNextSibling, index) => {
        if (!hasNextSibling) {
          return null
        }

        return (
          <div
            key={`ancestor-line-${row.node.id}-${index}`}
            className='absolute inset-y-0 w-px bg-muted-foreground/30'
            style={{ left: (index + 1) * INDENT_PX - CONNECTOR_WIDTH_PX }}
          />
        )
      })}

      {row.depth > 0 ? (
        <>
          <div
            className='absolute h-px bg-muted-foreground/30'
            style={{
              left: connectorLeft,
              top: CONNECTOR_Y_PX,
              width: CONNECTOR_WIDTH_PX,
            }}
          />
          <div
            className='absolute w-px bg-muted-foreground/30'
            style={{
              left: connectorLeft,
              top: 0,
              bottom: row.hasNextSibling ? 0 : `calc(100% - ${CONNECTOR_Y_PX}px)`,
            }}
          />
        </>
      ) : null}

      <MindmapNodeCard
        node={row.node}
        levelLabel={levelNames[row.node.level]}
        selected={selected}
        onSelect={onSelect}
      />
    </div>
  )
}

export const MindmapCanvasRow = memo(MindmapCanvasRowComponent)
