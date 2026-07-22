export const toolingFurnaces = {
  tabs: {
    archive: 'Furnace Archive',
    maintenance: 'Furnace Maintenance',
  },
  archive: {
    title: 'Furnace Archive',
    description:
      'FURNACE_ASSET_ARCHIVE / Heat-treatment equipment master data and status ledger',
    searchPlaceholder: 'Search by furnace serial, name, or type...',
  },
  maintenance: {
    title: 'Furnace Maintenance',
    description:
      'FURNACE_MAINTENANCE / Furnace-only maintenance records and handling status',
    filteredDescription:
      'FURNACE_MAINTENANCE / Showing maintenance records for the selected furnace only',
  },
  actions: {
    add: 'Add Furnace Asset',
    viewMaintenance: 'View Maintenance',
  },
  toast: {
    removed: 'Furnace removed',
    updated: 'Furnace profile updated',
    created: 'New furnace registered',
  },
  status: {
    idle: 'Idle',
    heating: 'Running',
    cooling: 'Cooling',
    maintenance: 'Maintenance',
    fault: 'Fault',
    unknown: 'Unknown',
  },
  card: {
    type: 'Type',
    location: 'Location',
    none: 'None',
    tempLive: 'Live Temp',
    maxTemp: '{{value}}°C max',
    sensorOffline: 'Sensor data offline',
  },
  stats: {
    totalUnits: 'Total Units',
    runningNow: 'Running Now',
    live: 'Live',
    maintenance: 'Maintenance',
    faultAlert: 'Fault Alert',
  },
  dialog: {
    title: {
      edit: 'Edit Furnace Profile',
      create: 'Register New Furnace Asset',
    },
    description:
      'Input physical serial, maximum temperature, and location data',
    fields: {
      sn: 'Serial No.',
      name: 'Asset Name',
      type: 'Category',
      location: 'Location',
      maxTemp: 'Max Temp (°C)',
      description: 'Description',
    },
    placeholders: {
      sn: 'e.g. FURN-2024-01',
      name: 'e.g. Vacuum Furnace #1',
      type: 'e.g. Vacuum Furnace',
      location: 'e.g. Zone A',
      description: 'Detailed notes or history...',
    },
    defaults: {
      type: 'Vacuum Furnace',
    },
    validation: {
      snRequired: 'Please enter a furnace serial ID',
      nameRequired: 'Please enter a furnace name',
      typeRequired: 'Please enter a furnace category',
      maxTempPositive: 'Max temperature must be greater than 0',
    },
    actions: {
      cancel: 'Cancel',
      save: 'Save',
    },
  },
} as const
