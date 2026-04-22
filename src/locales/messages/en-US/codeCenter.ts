export const codeCenter = {
  title: 'Code Center',
  linearBarcode: {
    tabs: {
      protocol: 'Protocol Rules',
      numbering: 'Business Numbering',
    },
  },
  dmCode: {
    tabs: {
      rules: 'DM Code Rules',
    },
  },
  sharedCodeSource: {
    tabs: {
      holeCodes: 'Hole Codes',
      numberingEngine: 'Shared Numbering Engine',
    },
    holeCodes: {
      page: {
        title: 'Hole Prefix & Count Source',
        description:
          'Shared maintenance entry for linear barcode hole prefixes and hole counts',
        total: 'Total {{count}}',
        active: 'Active {{count}}',
      },
      sections: {
        prefix: {
          title: 'Hole Prefix',
          description:
            'Maintain the shared source for the 1-char hole prefix segment.',
          total: 'Prefixes {{count}}',
          active: 'Active {{count}}',
          emptyTitle: 'No Hole Prefixes Yet',
          emptyDescription:
            'There are no shared hole prefixes yet. Please create one first.',
        },
        count: {
          title: 'Hole Count',
          description:
            'Maintain the shared source for the 2-char hole count segment.',
          total: 'Counts {{count}}',
          active: 'Active {{count}}',
          emptyTitle: 'No Hole Counts Yet',
          emptyDescription:
            'There are no shared hole counts yet. Please create one first.',
        },
      },
      fields: {
        label: 'Label',
        prefix: 'Hole Prefix',
        holes: 'Hole Count',
        description: 'Description',
        sortOrder: 'Sort Order',
        active: 'Active State',
      },
      actions: {
        createPrefix: 'Create Prefix',
        createCount: 'Create Count',
        gotoHoleCodes: 'Go To Hole Code Source',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
      },
      states: {
        loading: 'Loading Hole Codes',
        emptyTitle: 'No Hole Code Sources Yet',
        emptyDescription:
          'There are no shared hole code sources yet. Please create combinations first.',
        noDescription: 'No description',
        enabled: 'Enabled',
        disabled: 'Disabled',
      },
      dialog: {
        prefixCreateTitle: 'Create Hole Prefix',
        prefixEditTitle: 'Edit Hole Prefix',
        prefixDescription: 'Maintain the shared source for hole prefixes.',
        countCreateTitle: 'Create Hole Count',
        countEditTitle: 'Edit Hole Count',
        countDescription: 'Maintain the shared source for hole counts.',
      },
      toasts: {
        prefixSaveSuccess: 'Hole prefix saved',
        prefixSaveFailed: 'Failed to save hole prefix',
        countSaveSuccess: 'Hole count saved',
        countSaveFailed: 'Failed to save hole count',
        prefixDeleteSuccess: 'Hole prefix deleted',
        prefixDeleteFailed: 'Failed to delete hole prefix',
        countDeleteSuccess: 'Hole count deleted',
        countDeleteFailed: 'Failed to delete hole count',
        duplicatePrefixError: 'This hole prefix already exists',
        duplicateCountError: 'This hole count already exists',
      },
    },
    numberingEngine: {
      page: {
        title: 'Shared Numbering Engine',
        description: 'Centralized entry for the current shared numbering configuration and linear-barcode numbering rules',
        notice:
          'This shared page now only keeps the linear-barcode shared numbering configuration. Maintain DM code numbering rules in the standalone DM Code module.',
        badges: {
          linearBarcode: 'Linear Barcode',
          dmCode: 'DM Code',
        },
      },
      sections: {
        linearBarcode: {
          title: 'Linear Barcode Numbering Rules',
          description: 'Reuses the current linear-barcode numbering rules and persisted /numbering/rules backend capability.',
          status: 'Backend numbering connected',
        },
      },
    },
  },
}
