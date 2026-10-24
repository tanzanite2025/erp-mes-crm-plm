/** Shared business explanations, available inside the editor and in operation guides. */
export const bomFieldBusinessMeaningHelpTopicItemKeys = {
  bomType: ['engineering', 'manufacturing'],
  ownership: ['internal', 'customer'],
  performanceAndWeight: ['catalog', 'weight', 'save'],
  lifecycle: ['draft', 'released', 'obsolete'],
} as const

export type BOMFieldBusinessMeaningHelpTopic =
  keyof typeof bomFieldBusinessMeaningHelpTopicItemKeys
