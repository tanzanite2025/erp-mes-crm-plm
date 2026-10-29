export const productionMaterialIssuanceStartWorkflow = {
  action: 'Start material issuance',
  startWithSelected: 'Start issuance for these sources',
  title: 'Start production material issuance',
  steps:
    'Select order lines → Review BOM and requirements → Dispatch document → Confirm warehouse handover',
  permissionRequired:
    'Starting issuance requires production access, view and dispatch permissions. Ask your administrator to configure them.',
  wholeLineScope:
    'Prepare whole order lines using their finished quantities. Select 1–500 lines. The warehouse may issue materials in parts and enters actual quantities during handover.',
  selectSources: '1. Select order lines',
  search: 'Search order number, customer or product',
  searchAction: 'Search',
  loading: 'Loading issuance sources…',
  loadFailed: 'Could not load issuance sources. Retry.',
  noSources:
    'No active order lines match this search. Adjust the search or ask the sales team to create and confirm an order.',
  alreadyDispatched:
    'Covered by an active issuance document. Continue on the original:',
  openWarehouseDocument: 'Open original document',
  selected: '{{count}} order lines selected',
  sourcePagination: 'Page {{page}} · {{count}} order lines',
  selectionHint:
    'Searching and paging preserve the selection. Dispatch includes every selected line shown here.',
  removeSource: 'Remove {{order}} line {{line}}',
  remove: 'Remove',
  prepare: '2. Review BOM and prerequisites',
  bomScope:
    'Review applicable BOMs, finished weights and standard requirements for every selected order line. Warehouse staff enter actual quantities and batches after dispatch.',
  bomIncomplete:
    'Issuance prerequisites are incomplete. Select an applicable BOM or complete the details below, then review again.',
  preparing: 'Reviewing BOM and prerequisites…',
  prepareFailed: 'Preparation failed. Resolve the reported issue and retry.',
  selectionChanged:
    'Sources or BOM choices changed. Review prerequisites again before reviewing the formal basis.',
  prerequisitesTitle: 'Resolve these prerequisites first',
  prerequisites: {
    MISSING_PRODUCT:
      'The source product is unavailable. Ask the product or order maintainer to review it.',
    MISSING_FINISHED_UNIT:
      'The finished unit is missing. Ask the order maintainer to complete it.',
    INVALID_SOURCE_VERSION:
      'The order or selected BOM has no valid version. Contact its maintainer.',
    INVALID_FINISHED_WEIGHT:
      'The selected BOM needs a positive finished weight and weight unit. Ask the BOM maintainer to publish an applicable version.',
  },
  repairHint:
    'Ask the BOM or material maintainer to resolve recipe issues and the order maintainer to resolve order issues. Review again after maintenance.',
  openBom: 'Open BOM recipes',
  warehouseAction: 'Continue in warehouse',
  warehouseUnavailable:
    'Warehouse prerequisites are incomplete. Ask an administrator to check the material and pending-consumption warehouses and their receiving and shipping capabilities.',
  warehousePermissionHint:
    'Give the formal document number to authorized warehouse staff for confirmation under Warehouse → Production handovers.',
  warehouseStartHint:
    'For the first issue, production staff start and dispatch a formal document. Select the original here, choose material and batch, enter the actual quantity, review order allocations and confirm. Supplements and returns use the same document.',
  guideQuickStart: 'Start production material issuance',
  guideQuickStartHint:
    'Prepare active order lines, an applicable released MBOM, finished weight and units. Open the production workspace to select and review orders. Warehouse staff enter actual handover quantities.',
  statuses: {
    Pending: 'Pending',
    Scheduling: 'Scheduling',
    InProgress: 'In progress',
  },
}
