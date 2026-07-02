import type { LineMindmapNode, MindmapLevel } from '../data/line-mindmap-domain'

interface MindmapDetailSummaryProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
}

export function MindmapDetailSummary({
  selectedNode,
  levelNames,
}: MindmapDetailSummaryProps) {
  return (
    <>
      <div className='space-y-2 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
        <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
          当前节点
        </p>
        <div className='text-sm font-black tracking-tight text-foreground'>
          {selectedNode.nameSnapshot}
        </div>
        <div className='grid gap-2 font-mono text-[10px] text-muted-foreground/70'>
          <span>
            LEVEL {selectedNode.level} / {levelNames[selectedNode.level]}
          </span>
          <span>OPTION {selectedNode.hierarchyOptionId ?? '未绑定'}</span>
          <span>
            SOURCE {selectedNode.sourceType ?? 'unknown'} /{' '}
            {selectedNode.sourceId ?? 'n/a'}
          </span>
        </div>
      </div>

      {selectedNode.readonlyMeta ? (
        <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            只读信息
          </p>
          <div className='grid gap-2 text-[11px] text-muted-foreground/80'>
            {selectedNode.readonlyMeta.lineName ? (
              <div>所属产线：{selectedNode.readonlyMeta.lineName}</div>
            ) : null}
            {selectedNode.sourceType !== 'process' &&
            selectedNode.readonlyMeta.code ? (
              <div>编码：{selectedNode.readonlyMeta.code}</div>
            ) : null}
            {selectedNode.readonlyMeta.description ? (
              <div>说明：{selectedNode.readonlyMeta.description}</div>
            ) : null}
            {typeof selectedNode.readonlyMeta.sortOrder === 'number' ? (
              <div>排序：{selectedNode.readonlyMeta.sortOrder}</div>
            ) : null}
            {typeof selectedNode.readonlyMeta.isActive === 'boolean' ? (
              <div>
                启用：{selectedNode.readonlyMeta.isActive ? '是' : '否'}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
