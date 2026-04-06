export const basicSettingsEnUSOverrides = {
  basicSettings: {
    dmNumbering: {
      page: {
        title: 'Barcode Protocol Center',
        subtitle: 'DATAMATRIX_PROTOCOL / Maintain universal DataMatrix and QR code generation protocols.',
        badges: {
          mirrorActive: 'Mirror Cache Active',
          payload: 'Payload: 14-bit Core + Industrial ECC',
        },
        actions: {
          reset: 'Restore Default Protocol',
          publish: 'Merge to Production',
        },
      },
      simulation: {
        title: 'Dynamic Barcode Simulation',
        subtitle: 'YEAR + MONTH + MODEL + APP + CAT + HOLES + SERIAL',
        placeholder: 'Waiting for scan command or manual simulation...',
        codeLabel: 'Core Code',
        qrCodeOutput: 'QR Code Simulation Output',
        form: {
          year: 'Year (YY)',
          month: 'Month (1 Char)',
          category: 'Category',
          model: 'Model',
          appearance: 'App Mapping',
          holes: 'Holes (HH)',
          serial: '5-Digit Serial',
          serialCount: 'Issued: {{count}}',
          notIssued: 'Not Issued',
          applySerial: 'Apply New Serial',
          specialPrefix: 'Physical: Drain Hole',
          enableHPrefix: 'Enable H Prefix',
          suffixWheel: 'Suffix: Wheel Position',
          suffixScope: 'Suffix: Scope',
          scopePlaceholder: 'e.g., AM/OE',
          wheelOptions: {
            F: 'Front (F)',
            R: 'Rear (R)',
            H: 'Hybrid (H)',
          },
          modelRequired: 'Please select a model before applying for a serial.',
          serialSuccess: 'Serial issued: {{serial}} for {{model}}',
        },
        validator: {
          title: 'Dynamic Parser Engine',
          titleSuffix: 'DATA_PARSER_V1',
          waiting: 'Waiting for simulated code...',
          success: 'Consistency Check Passed / PARSER_OK',
        },
        scannerGuide: {
          title: 'Physical Scan Simulation',
          text: 'Current barcode carries 14-bit physical ID:',
        },
      },
      resetDialog: {
        title: 'Rollback Confirmation',
        description: 'This will clear all local modifications and reset to factory settings (SYSTEM_DEFAULTS).',
        verifyPrompt: 'Enter verify text below to unlock:',
        verifyTarget: 'RESET_RULES',
        placeholder: 'Enter verify text',
        discard: 'Discard',
        commit: 'Commit Rollback',
      },
      toasts: {
        resetSuccess: 'Numbering protocol reset to defaults.',
      },
      dialog: {
        configRevision: 'Revision: {{value}}',
        protocol: 'Protocol: {{value}}',
        segmentLabel: 'Segment',
        modeLabel: 'Mode',
      },
    },
    dictionary: {
      page: {
        title: 'Dictionary Atomic Center',
        description: 'PARAMETER_DICTIONARY / Define universal business parameters and industry features.',
        actions: {
          sync: 'RE-SEED / Sync System',
          syncing: 'SYNCING...',
          addGroup: 'ADD_GROUP / Create Group',
        },
      },
      empty: {
        title: 'Data Link Init Error',
        description: 'DATABASE_CONNECTION_IDLE / No groups detected. Try manual sync.',
        action: 'RECOVERY_SYNC / Try Recovery',
      },
      search: {
        placeholder: 'Search in {{group}}... SCAN_ENTRY',
      },
      actions: {
        addEntry: 'ADD_ENTRY / Create Entry',
      },
      group: {
        config: 'SCHEMA_CONFIG / Configuration',
        rename: 'RENAME_GROUP / Rename',
        purge: 'PURGE_GROUP / Delete Group',
      },
      entry: {
        noCode: 'NO_META_CODE',
        noOptions: 'NO_OPTIONS_DEFINED',
        addOption: '+ ADD_OPTION',
        emptyList: 'No entries in this group / EMPTY_SET',
      },
    },
    linearBarcode: {
      dialog: {
        segmentLabel: 'Segment',
        modeLabel: 'Mode',
      },
    },
  },
} as const
