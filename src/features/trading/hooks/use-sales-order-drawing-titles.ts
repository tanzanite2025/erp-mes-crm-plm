type DrawingType = 'spec' | 'drilling' | 'labeling'

interface DrawingTitleParams {
  type: DrawingType
  t: (key: string) => string
}

export function getSalesOrderDrawingTitle({ type, t }: DrawingTitleParams) {
  switch (type) {
    case 'spec':
      return t('tradingSalesOrder.detail.drawing.spec')
    case 'drilling':
      return t('tradingSalesOrder.detail.drawing.drilling')
    case 'labeling':
    default:
      return t('tradingSalesOrder.detail.drawing.labeling')
  }
}
