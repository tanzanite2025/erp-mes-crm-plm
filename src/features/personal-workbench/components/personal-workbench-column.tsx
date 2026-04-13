import { personalWorkbenchColumns } from '../data/constants'
import type { PersonalRecord } from '../data/schema'
import { PersonalWorkbenchCard } from './personal-workbench-card'

interface PersonalWorkbenchColumnProps {
  columnKey: (typeof personalWorkbenchColumns)[number]['key']
  draggingRecordId?: string | null
  onCardDragEnd: () => void
  onCardDragStart: (record: PersonalRecord) => void
  onDropToColumn: (columnKey: (typeof personalWorkbenchColumns)[number]['key'], index: number) => void
  records: PersonalRecord[]
  onEdit: (record: PersonalRecord) => void
}

export function PersonalWorkbenchColumn({
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
      className='flex min-h-[22rem] flex-col rounded-[28px] border border-dashed border-muted/50 bg-muted/10 p-3'
    >
      <header className='mb-3 flex items-center justify-between px-1'>
        <div>
          <h3 className='text-sm font-black uppercase tracking-tight italic text-foreground'>{column?.label ?? columnKey}</h3>
          <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>{records.length} 条</p>
        </div>
      </header>
      <div className='space-y-3'>
        {records.length > 0 ? records.map((record, index) => (
          <div key={record.id} onDragOver={(event) => event.preventDefault()} onDrop={() => onDropToColumn(columnKey, index)}>
            <PersonalWorkbenchCard
              isDragging={draggingRecordId === record.id}
              onDragEnd={onCardDragEnd}
              onDragStart={onCardDragStart}
              record={record}
              onEdit={onEdit}
            />
          </div>
        )) : (
          <div className='flex min-h-40 items-center justify-center rounded-[24px] border border-dashed border-muted/50 bg-background/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
            暂无记录
          </div>
        )}
      </div>
    </section>
  )
}
