export const basicSettings = {
  tabs: {
    dmNumbering: "DM Code Numbering Rules",
    linearBarcode: "Linear Barcode",
    units: "Unit Management",
    sequences: "Linear Barcode Numbering Rules",
    enterprise: "Enterprise Info",
    security: "Security Settings"
  },
  placeholders: {
    moduleInitialized: "Module initialized. Waiting for underlying business logic.",
    dataEngineLinking: "Data engine integration in progress",
    pages: {
      teamMgmt: "Work Team",
      numberingMgmt: "Numbering Rules",
      printTemplateMgmt: "Print Templates",
      templateVarMgmt: "Template Variables",
      factoryMgmt: "Factory Management",
      lineMgmt: "Line Management",
      sectionMgmt: "Section Management",
      groupMgmt: "Group Management",
      routingMgmt: "Routing Management",
      specialRoutingMgmt: "Special Routing",
      warehouseMgmt: "Warehouse Management",
      binLocationMgmt: "Bin Location Management"
    }
  },
  sequences: {
    page: {
      title: "Linear Barcode Numbering Rule Center",
      subtitle: "Maintain the rule keys, reset strategy, and persisted issuance logic used by shared linear-barcode numbering."
    },
    syncGuard: {
      title: "Atomic Sync Protocol",
      description: "All sequence issuance is completed in backend distributed transactions. Changes take effect in the next issuance cycle to ensure global uniqueness."
    },
    actions: {
      refresh: "Refresh Index",
      addRule: "Add Rule"
    },
    table: {
      headers: {
        ruleKey: "Rule Key",
        prefix: "Prefix",
        pattern: "Pattern",
        seq: "Current Seq",
        reset: "Reset Policy",
        action: "Action"
      },
      resetPeriod: {
        monthly: "Monthly Reset",
        yearly: "Yearly Reset",
        never: "Never Reset"
      },
      emptyLoading: "Fetching schema...",
      emptyNoRules: "No rules defined"
    },
    dialog: {
      editTitle: "Edit Rule",
      createTitle: "Create Rule",
      description: "Configure atomic sequence issuance logic. Supported tokens: {PREFIX}, {YYMM}, {SEQ}.",
      labels: {
        ruleKey: "Rule Key",
        prefix: "Prefix",
        padding: "Padding",
        pattern: "Pattern",
        resetStrategy: "Reset Strategy"
      },
      placeholders: {
        ruleKey: "ORDER_ERP_GS",
        prefix: "ERP-",
        pattern: "{PREFIX}{YYMM}{SEQ}"
      },
      resetOptions: {
        monthly: "Monthly Reset (2403****)",
        yearly: "Yearly Reset (24******)",
        never: "Never Reset (GA Sequence)"
      },
      actions: {
        cancel: "Cancel Action",
        syncing: "Syncing...",
        commit: "Commit Rule"
      }
    },
    toast: {
      fetchFailed: "Failed to load sequence rules",
      requiredMissing: "Required fields are missing",
      patternMissingSeq: "Pattern must include the {SEQ} placeholder",
      saveSuccess: "Rule saved and synced to cloud",
      conflict: "Data was updated elsewhere. Please refresh and retry",
      saveFailed: "Save failed: {{message}}",
      unknown: "Unknown error"
    }
  },
  units: {
    page: {
      title: "Measurement Unit Standard Center",
      subtitle: "Measurement units, precision control, and conversion standardization across modules",
      searchPlaceholder: "Search code or display name..."
    },
    filters: {
      all: "All"
    },
    categories: {
      all: "All Categories",
      quantity: "Quantity",
      weight: "Weight",
      length: "Length",
      area: "Area",
      volume: "Volume",
      time: "Time",
      other: "Other",
      QUANTITY: "Quantity",
      WEIGHT: "Weight",
      LENGTH: "Length",
      AREA: "Area",
      VOLUME: "Volume",
      TIME: "Time",
      OTHER: "Other"
    },
    excel: {
      sheetName: "Unit Import Template",
      fileName: "XDFC_Unit_Import_Template_{{date}}.xlsx",
      headers: {
        code: "Unit Code (Required)",
        name: "Display Name (Required)",
        category: "Category",
        precision: "Precision (Number)",
        description: "Description"
      },
      categoryQuantity: "Quantity",
      categoryWeight: "Weight",
      categoryLength: "Length",
      categoryArea: "Area",
      categoryVolume: "Volume",
      categoryTime: "Time",
      categoryOther: "Other",
      validation: {
        categoryErrorTitle: "Invalid Category",
        categoryError: "Please select a predefined category from the dropdown list.",
        precisionErrorTitle: "Invalid Precision",
        precisionError: "Precision must be an integer between 0 and 10."
      },
      sample: {
        code1: "PCS",
        name1: "Piece",
        category1: "Quantity",
        precision1: "0",
        description1: "This is sample data. Please remove this row before import.",
        code2: "KG",
        name2: "Kilogram",
        category2: "Weight",
        precision2: "2",
        description2: "Weight unit supporting 2 decimal places"
      }
    },
    toolbar: {
      downloadTemplate: "Download Template",
      dataImport: "Import Data",
      importing: "Importing...",
      addNew: "Add Unit"
    },
    table: {
      code: "Unit Code",
      name: "Display Name",
      category: "Category",
      precision: "Precision",
      description: "Notes",
      status: "Status",
      empty: "No matching units found"
    },
    statuses: {
      active: "Active",
      inactive: "Disabled"
    },
    menu: {
      label: "Unit Actions",
      edit: "Edit Metadata",
      delete: "Delete Unit"
    },
    dialog: {
      createTitle: "Add Measurement Unit",
      editTitle: "Edit Measurement Unit",
      description: "Define system-wide measurement standards and precision rules.",
      fields: {
        code: "Unit Code",
        name: "Display Name",
        category: "Category",
        precision: "Precision",
        status: "Status",
        description: "Description"
      },
      placeholders: {
        code: "e.g. PCS, KG",
        name: "e.g. Piece, Kilogram",
        description: "Add usage notes for this unit..."
      },
      status: {
        active: "Enabled",
        inactive: "Disabled"
      },
      cancel: "Cancel",
      save: "Save Configuration"
    },
    import: {
      parsing: "Parsing and preparing import template...",
      missingRequired: "Row {{line}}: required code or name is missing",
      moreIssues: "and {{count}} more issues",
      noValidData: "No valid unit data detected. Please confirm you are using the standard template.",
      parseFailed: "Excel parsing failed. Please check whether the file is corrupted or invalid.",
      syncing: "Syncing {{count}} rows to the server...",
      success: "Successfully imported {{count}} units",
      syncFailed: "Server sync failed: {{message}}"
    },
    confirmDelete: "Are you sure you want to delete unit \"{{name}}\"?",
    toasts: {
      created: "Unit {{name}} created",
      updated: "Unit {{name}} updated",
      deleted: "Unit deleted successfully",
      createFailed: "Failed to create unit",
      updateFailed: "Failed to update unit",
      deleteFailed: "Failed to delete unit"
    }
  },
  securityPage: {
    loading: "Entering secure configuration center...",
    title: "System Security Architecture",
    subtitle: "System-level security gateway and topology authorization center",
    authCardTitle: "Topology Operation Authorization Code (AUTH_CODE)",
    authCardDescription: "Controls the global verification password for topology renaming, process adjustment, and node overflow.",
    currentPassword: "Current Authorization Code",
    placeholder: "Enter at least 4 letters or digits",
    warning: "High-risk reminder: after changing this code, all opened topology pages must re-enter the new code.",
    actions: {
      saving: "Writing to system...",
      apply: "Apply Global Changes"
    },
    auditTitle: "Security Audit Info",
    auditItems: {
      first: "1. This authorization code is enforced not only on the frontend, but also at the backend API layer.",
      second: "2. All operations using this authorization code, such as rename and delete, are recorded in the audit log.",
      third: "3. The authorization code is stored in the core configuration database and cannot be bypassed physically."
    },
    version: "Architecture Hardening Ver: 1.0.4 - Secure System",
    toasts: {
      loadFailed: "Failed to load security settings",
      minLength: "Authorization code must be at least 4 characters long",
      saved: "Security authorization code updated",
      saveFailed: "Update failed. Please try again."
    }
  },
  appearanceMapping: {
    title: "View Appearance Code Mapping",
    description: "This dialog only shows the current barcode mapping for appearance codes 1-9. To edit appearance data, use the Product Appearance master-data tab under Product Engineering.",
    empty: {
      title: "No Product Appearances Yet",
      description: "No product appearance master data has been maintained yet, so there is no appearance code mapping to display here."
    },
    fields: {
      label: "Appearance Label",
      description: "Business Description"
    },
    placeholders: {
      label: "e.g. UD / 3K...",
      description: "Enter the meaning of this appearance..."
    },
    actions: {
      reset: "Restore Defaults",
      save: "Save Global Config",
      gotoProductAppearance: "Open Product Appearance"
    },
    toasts: {
      saved: "Appearance mapping rules synced globally",
      reset: "Restored system default mapping"
    }
  },
  enterprisePage: {
    title: "Enterprise Identity Center",
    subtitle: "ENTERPRISE_IDENTITY / Configure Global Organization Name, Platform Description, and Branding Assets",
    form: {
      nameLabel: "System Display Name / SYSTEM NAME",
      namePlaceholder: "e.g. XDFC Composite",
      planLabel: "Description & Version / PLATFORM DESC",
      planPlaceholder: "e.g. Digital Management Platform",
      saveButton: "Save & Sync Configuration",
      saving: "Syncing..."
    },
    syncNotice: "SYSTEM_SYNC_NOTICE / Note: Changes directly affect the system headers, sidebar, and exported PDF reports. Using professional business names is recommended for optimal display.",
    toasts: {
      success: "Configuration Saved",
      successDesc: "Enterprise info updated. Sidebar will refresh automatically.",
      error: "Save Failed"
    }
  },
  linearBarcode: {
    page: {
      title: "Linear Barcode Rule Center",
      subtitle: "LINEAR_BARCODE_PROTOCOL / Maintain the persisted Code128 wheel-barcode protocol for date, model, appearance, hole prefix, hole count, and 4-digit sequence.",
      badges: {
        active: "LINEAR_BARCODE_ACTIVE",
        loading: "CONFIG_LOADING",
        saving: "CONFIG_SAVING",
        synced: "CONFIG_SYNCED",
        payload: "Payload: 15-character core code + shared numbering service"
      },
      actions: {
        save: "SAVE_PROTOCOL",
        saving: "SYNCING_PROTOCOL",
        numberingRule: "NUMBERING_RULE",
        reset: "RESET_PROTOCOL"
      }
    },
    table: {
      headers: {
        segment: "SEGMENT",
        description: "DESCRIPTION",
        example: "ENCODING_EXAMPLE",
        action: "ACTION"
      },
      segments: {
        year: {
          name: "Year (YY)",
          desc: "Last two digits of the production year, fixed 2-digit encoding."
        },
        month: {
          name: "Month (M)",
          desc: "1-9 for Jan-Sep, 0 for Oct, N for Nov, and D for Dec."
        },
        day: {
          name: "Day (DD)",
          desc: "Calendar day, fixed range 01-31."
        },
        model: {
          name: "Model",
          desc: "2-digit model code aligned with the engineering product archive."
        },
        appearance: {
          name: "Appearance",
          desc: "Single-digit appearance mapping that reuses the shared appearance dictionary."
        },
        holePrefix: {
          name: "Hole Prefix",
          desc: "Occupies 1 character and currently uses category markers such as R and D."
        },
        holes: {
          name: "Hole Count",
          desc: "Occupies 2 characters and uses 2-digit numeric values such as 14, 18, and 32."
        },
        serial: {
          name: "Serial Number",
          desc: "4-digit serial issued by the shared business numbering rule."
        }
      }
    },
    simulation: {
      title: "Dynamic Linear Barcode Simulation",
      subtitle: "Year + Month + Day + Model + Appearance + Hole Prefix + Hole Count + Sequence",
      codeLabel: "CODE",
      form: {
        year: "YEAR (YY)",
        month: "MONTH (M)",
        day: "DAY (DD)",
        model: "MODEL (2 CHAR)",
        appearance: "APPEARANCE (1 CHAR)",
        holePrefix: "HOLE PREFIX (R/D)",
        holes: "HOLE COUNT (2 CHAR)",
        serial: "SERIAL (4 DIGITS)",
        notIssued: "NOT_ISSUED",
        requestSerial: "ISSUE_SERIAL",
        undefinedAppearance: "UNDEFINED",
        specialPrefix: "PREFIX: DRAIN HOLE",
        enableHPrefix: "ENABLE H PREFIX",
        suffixWheel: "SUFFIX: WHEEL POSITION",
        suffixScope: "SUFFIX: SCOPE",
        scopePlaceholder: "Enter scope code, e.g. AM",
        placeholders: {
          year: "Select year",
          month: "Select month",
          day: "Select day",
          model: "Select model",
          appearance: "Select appearance",
          holes: "Select holes"
        },
        holePrefixOptions: {
          R: "ROAD (R)",
          D: "DIRT (D)"
        },
        wheelOptions: {
          F: "FRONT (F)",
          R: "REAR (R)",
          H: "MIXED (H)"
        }
      },
      validator: {
        title: "Parsed Result",
        description: "The scanner returns the barcode payload directly for downstream clients."
      },
      sequenceRule: {
        title: "Sequence Rule Notes",
        description: "Serial numbers are issued by rule",
        patternHint: "Configure it with"
      }
    },
    footer: {
      title: "Linear Barcode Implementation Notes",
      description: "This page defines the standard 15-character wheel barcode structure: year + month + day + model + appearance + hole prefix + hole count + serial. The hole prefix occupies 1 character and the hole count occupies 2 characters. The serial reuses numbering rule {{key}} so PDA and scan-ingest clients share the same persisted defaults."
    },
    resetDialog: {
      title: "RESET LINEAR BARCODE",
      description: "This action restores the field descriptions and simulation inputs on this page to their default values, then syncs the protocol back to backend persistence.",
      verifyPrompt: "Enter the verification text before continuing.",
      verifyTarget: "RESET_LINEAR_BARCODE",
      placeholder: "VERIFY_TEXT_HERE...",
      discard: "DISCARD_ACTION",
      commit: "COMMIT_RESET_PROTOCOL"
    },
    toasts: {
      invalidSerialFormat: "Rule {{key}} must return exactly 4 digits. Configure the numbering rule with pattern={SEQ} and padding=4.",
      requestSerialSuccess: "Issued linear-barcode serial: {{serial}}",
      requestSerialFailed: "Failed to issue serial number.",
      sequenceRuleMissing: "Please create numbering rule {{key}} first and configure it with pattern={SEQ} plus padding=4.",
      saveSuccess: "Linear barcode protocol synced to backend config center.",
      saveFailed: "Failed to save linear barcode protocol.",
      resetSuccess: "Linear barcode defaults restored."
    },
    dialog: {
      editTitle: "Edit {{name}} Logic",
      helperText: "Changes made here update the protocol metadata used by the management page and persisted backend config.",
      mappingMatrix: "Mapping Matrix",
      addMapping: "Add Mapping",
      originalValue: "Original Value (Key)",
      convertedValue: "Converted Value (Value)",
      placeholderKey: "e.g. Nov",
      placeholderValue: "e.g. N",
      autoRules: "Auto Rules",
      logicDescription: "Logic Description",
      autoDescriptionPlaceholder: "Describe how this segment is generated",
      step: "Step: Fixed",
      period: "Period: Persisted",
      save: "Save Logic",
      configRevision: "Config revision: {{value}}",
      protocol: "Protocol: {{value}}"
    }
  },
  dmNumbering: {
    page: {
      title: "DM Code Numbering Rule Center",
      subtitle: "Maintain the segment rules, simulation settings, and current local numbering logic used by the shared DM numbering experience."
    },
    table: {
      headers: {
        segment: "SEGMENT",
        description: "DESCRIPTION",
        example: "ENCODING_EXAMPLE",
        action: "ACTION"
      },
      segments: {
        year: {
          name: "Year (YY)",
          desc: "Last two digits of the year, fixed 2-digit encoding."
        },
        month: {
          name: "Month (3-bit)",
          desc: "1-9 for Jan-Sep, 0, N, D for Oct, Nov, Dec."
        },
        model: {
          name: "Product Model",
          desc: "2-digit model code from the enterprise product dictionary."
        },
        appearance: {
          name: "Appearance",
          desc: "Values 1-9 representing different finishes or textures."
        },
        category: {
          name: "Category",
          desc: "Primary business attribute code from master data."
        },
        holes: {
          name: "Holes",
          desc: "Number of physical holes, fixed 2-digit encoding."
        },
        serial: {
          name: "Serial Number",
          desc: "5-digit Base-36 compressed sequence per model."
        }
      }
    },
    simulation: {
      batchSN: "PRODUCTION BATCH SN",
      verifiedStandard: "VERIFIED STANDARD"
    },
    toasts: {
      modelRequired: "Select a model before requesting a serial number.",
      serialSuccess: "Model {{model}} issued serial: {{serial}}"
    },
    footer: {
      title: "Industrial Traceability Protocol Compliance",
      description: "The QR code configuration defined here serves as the master data standard. All mobile collection devices and MES terminals will parse sequences based on these segments. Special month mapping (e.g., N=Nov, D=Dec) is hard-coded in the parsing engine to ensure global uniqueness until 2030."
    },
    dialog: {
      editTitle: "Edit {{name}} Logic",
      helperText: "After modifying the encoding logic for this segment, the system will automatically push rules to the production execution layer. Changes take effect on the next DM proof redraw.",
      mappingMatrix: "Mapping Matrix Definition",
      addMapping: "Add Mapping",
      originalValue: "Original Value (Key)",
      convertedValue: "Converted Code (Value)",
      placeholderKey: "e.g. Nov",
      placeholderValue: "e.g. N",
      autoRules: "Auto Increment Rules",
      logicDescription: "Logic Description / Start Bit",
      autoDescriptionPlaceholder: "e.g. Starts from 00001",
      step: "Step: 1",
      period: "Period: Monthly Reset",
      save: "Save Logic"
    },
    parser: {
      labels: {
        yearSuffix: "",
        monthSuffix: "",
        categorySuffix: " Cat",
        appearancePrefix: "App",
        holesSuffix: " Holes",
        serialPrefix: "Serial",
        base36Suffix: " (Base-36)",
        anyCat: "ANY (*)",
        anyModel: "ANY (**)",
        unknownMonth: "Unknown Month",
        invalidCode: "Invalid Code",
        errorLength: "Invalid code length (14 chars required)",
        months: {
          "0": "Oct",
          "1": "Jan",
          "2": "Feb",
          "3": "Mar",
          "4": "Apr",
          "5": "May",
          "6": "Jun",
          "7": "Jul",
          "8": "Aug",
          "9": "Sep",
          N: "Nov",
          D: "Dec"
        }
      }
    }
  }
} as const
