export const qualityDefectTypeConfiguration = {
  title: 'Defect configuration',
  description:
    'Maintain shared quality defect types and configure their applicable inspection stations.',
  quickConfigure: 'Configure defects',
  catalogTitle: 'Shared defect types',
  catalogDescription:
    'A defect type can be used at multiple inspection stations. Inspection requirements belong to the applicable quality standard.',
  bindingsTitle: 'Station bindings',
  bindingsDescription:
    'Select a station, choose its applicable defect types, and save.',
  add: 'Add defect type',
  edit: 'Edit defect type',
  name: 'Defect name',
  namePlaceholder: 'For example: pinhole, crack, scratch',
  notes: 'Description',
  sortOrder: 'Display order',
  active: 'Active',
  inactive: 'Inactive',
  save: 'Save defect type',
  saveBindings: 'Save bindings',
  saving: 'Saving…',
  refresh: 'Reload',
  retry: 'Retry',
  loading: 'Loading…',
  loadFailed: 'Unable to load configuration. Please retry.',
  empty: 'No defect types yet. Add one first.',
  station: 'Inspection station',
  chooseStation: 'Select an inspection station',
  noStations:
    'No inspection stations. Configure stations in quality standards first.',
  stationInactive:
    'This station is inactive. Activate it before changing bindings.',
  noBindings: 'No defect types are bound to this station.',
  bound: 'Bound',
  unavailableBinding: 'A defect type is unavailable. Reload the catalog.',
  inactiveBinding:
    'Existing bindings to inactive types can be retained or removed. New bindings are unavailable.',
  readOnly:
    'You can view configuration. Quality management permission is required to make changes.',
  saved: 'Defect type saved.',
  bindingsSaved: 'Station bindings saved.',
  validation:
    'Use a name of 1–100 characters, a description up to 2000 characters, and an integer order from 0 to 1000000.',
  dirty: 'Unsaved changes',
  discardChanges: 'Discard unsaved changes and continue?',
  close: 'Close',
}
