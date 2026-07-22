import { personalWorkbenchColumns } from '../data/constants'
import type { PersonalRecord } from '../data/schema'
import { PersonalWorkbenchCard } from './personal-workbench-card'

interface PersonalWorkbenchColumnProps {
  isCompactLayout?: boolean
  columnKey: (typeof personalWorkbenchColumns)[number]['key']
  draggingRecordId?: string | null
  onCardDragEnd: () => void
  onCardDragStart: (record: PersonalRecord) => void
  onDropToColumn: (
    columnKey: (typeof personalWorkbenchColumns)[number]['key'],
    index: number
  ) => void
  records: PersonalRecord[]
  onEdit: (record: PersonalRecord) => void
}

export function PersonalWorkbenchColumn({
  isCompactLayout = false,
  columnKey,
  draggingRecordId,
  onCardDragEnd,
  onCardDragStart,
  onDropToColumn,
  records,
  onEdit,
}: PersonalWorkbenchColumnProps) {
  const column = personalWorkbenchColumns.find((item) => item.key === columnKey)
  return (
    <section
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropToColumn(columnKey, records.length)}
      className={
        isCompactLayout
          ? 'flex min-h-[12rem] flex-col rounded-[18px] border border-dashed border-muted/50 bg-muted/10 p-2'
          : 'flex min-h-[22rem] flex-col rounded-[28px] border border-dashed border-muted/50 bg-muted/10 p-3'
      }
    >
      <header
        className={
          isCompactLayout
            ? 'mb-1.5 flex items-center justify-between px-1'
            : 'mb-3 flex items-center justify-between px-1'
        }
      >
        <div>
          <h3
            className={
              isCompactLayout
                ? 'text-[11px] font-black tracking-tight text-foreground uppercase italic'
                : 'text-sm font-black tracking-tight text-foreground uppercase italic'
            }
          >
            {column?.label ?? columnKey}
          </h3>
          <p className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
            {records.length} 条
          </p>
        </div>
      </header>
      <div className={isCompactLayout ? 'space-y-2' : 'space-y-3'}>
        {records.length > 0 ? (
          records.map((record, index) => (
            <div
              key={record.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDropToColumn(columnKey, index)}
            >
              <PersonalWorkbenchCard
                isCompactLayout={isCompactLayout}
                isDragging={draggingRecordId === record.id}
                onDragEnd={onCardDragEnd}
                onDragStart={onCardDragStart}
                record={record}
                onEdit={onEdit}
              />
            </div>
          ))
        ) : (
          <div
            className={
              isCompactLayout
                ? 'flex min-h-20 items-center justify-center rounded-[16px] border border-dashed border-muted/50 bg-background/40 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'
                : 'flex min-h-40 items-center justify-center rounded-[24px] border border-dashed border-muted/50 bg-background/40 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'
            }
          >
            暂无记录
          </div>
        )}
      </div>
    </section>
  )
}
