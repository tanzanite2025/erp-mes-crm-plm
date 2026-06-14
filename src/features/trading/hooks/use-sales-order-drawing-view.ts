import { useMemo } from 'react'

type DrawingType = 'spec' | 'drilling' | 'labeling'

interface DrawingViewMeta {
  type: DrawingType
  className: string
}

const DRAWING_META: Record<DrawingType, DrawingViewMeta> = {
  spec: {
    type: 'spec',
    className: 'border-blue-200/50 hover:bg-blue-500/10 hover:text-blue-600',
  },
  drilling: {
    type: 'drilling',
    className:
      'border-indigo-200/50 hover:bg-indigo-500/10 hover:text-indigo-600',
  },
  labeling: {
    type: 'labeling',
    className:
      'border-teal-200/50 text-teal-600 hover:bg-teal-500/10 hover:text-teal-600',
  },
}

export function useSalesOrderDrawingView(type: DrawingType) {
  return useMemo(() => DRAWING_META[type], [type])
}
