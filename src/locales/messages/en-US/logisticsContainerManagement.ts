export const logisticsContainerManagement = {
  tabs: {
    specs: 'Container Specs',
  },
  title: 'Container Management',
  description:
    'Built-in reference data for common ocean containers, including internal space, door openings, volume, and payload.',
  builtinBadge: 'Built-in specs',
  unavailable: 'N/A',
  boundaryTitle: 'Standalone container domain',
  boundaryDescription:
    'Container Management is an independent third-level domain under Logistics Center. It does not belong to Vehicle Matching and is not mounted inside the Logistics Config tabs. This page first preserves common container space data without external APIs, carrier quotes, or shipment-document coupling.',
  summary: {
    total: 'Spec count',
    totalHint:
      'Common dry, reefer, open-top, and flat-rack containers are included.',
    largestVolume: 'Largest usable volume',
    largestVolumeHint:
      'Use suggested usable volume for pre-screening, not as final loaded volume.',
    largestPayload: 'Largest payload',
    largestPayloadHint:
      'For internal pre-selection only; carrier and equipment confirmation still wins.',
    special: 'Special equipment',
    specialHint:
      'Includes reefer, open-top, and flat-rack equipment so they are not mixed with dry containers.',
  },
  metrics: {
    internalDimensions: 'Internal dimensions',
    externalDimensions: 'External dimensions',
    doorOpening: 'Door opening',
    nominalVolume: 'Nominal volume',
    usableVolume: 'Suggested usable volume',
    maxPayload: 'Max payload',
    tareWeight: 'Tare weight',
    maxGrossWeight: 'Max gross weight',
    useCases: 'Common use cases',
    loadPlanningNotes: 'Load planning notes',
    usableRate: 'usable rate',
  },
} as const
