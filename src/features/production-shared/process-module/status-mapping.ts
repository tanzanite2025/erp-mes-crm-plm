import type { ProcessTreeNodeStatus } from './config'

export const sharedProcessNodeStatusMap: Record<ProcessTreeNodeStatus, { label: string; className: string; dotClassName: string }> = {
  normal: { label: '正常', className: 'bg-cyan-500/10 text-cyan-700', dotClassName: 'border-cyan-400/40 bg-cyan-400/20' },
  disabled: { label: '停用', className: 'bg-slate-500/10 text-slate-600', dotClassName: 'border-slate-400/40 bg-slate-400/20' },
  warning: { label: '风险', className: 'bg-amber-500/10 text-amber-700', dotClassName: 'border-amber-400/40 bg-amber-400/20' },
  danger: { label: '阻塞', className: 'bg-rose-500/10 text-rose-700', dotClassName: 'border-rose-400/40 bg-rose-400/20' },
  blocked: { label: '阻塞', className: 'bg-rose-500/10 text-rose-700', dotClassName: 'border-rose-400/40 bg-rose-400/20' },
}
