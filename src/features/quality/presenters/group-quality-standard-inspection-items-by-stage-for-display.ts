interface QualityInspectionItemStageReference {
  inspectionStageId: string
  inspectionStageName: string
}

export interface QualityStandardInspectionStageDisplayGroup<
  TItem extends QualityInspectionItemStageReference,
> {
  inspectionStageId: string
  inspectionStageName: string
  items: TItem[]
}

export function groupQualityStandardInspectionItemsByStageForDisplay<
  TItem extends QualityInspectionItemStageReference,
>(
  items: readonly TItem[]
): QualityStandardInspectionStageDisplayGroup<TItem>[] {
  const groups = new Map<
    string,
    QualityStandardInspectionStageDisplayGroup<TItem>
  >()
  for (const item of items) {
    const inspectionStageId = item.inspectionStageId
    const group = groups.get(inspectionStageId)
    if (group) {
      group.items.push(item)
    } else {
      groups.set(inspectionStageId, {
        inspectionStageId,
        inspectionStageName: item.inspectionStageName,
        items: [item],
      })
    }
  }
  return [...groups.values()]
}
