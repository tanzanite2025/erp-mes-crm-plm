export const codeCenter = {
  title: 'Code Center',
  linearBarcode: {
    symbols: {
      linearBarcode: 'Code128',
      qrCode: 'QR Code',
      pairedSymbols: 'Code128 / QR Code',
      sameCode: 'Code128 and QR encode the same value: {{code}}',
      loading: 'Preparing symbols',
      renderFailed: 'Symbols could not be rendered',
    },
    tabs: {
      protocol: 'Protocol Rules',
      print: 'Print',
      status: 'Code Status',
      numbering: 'Business Numbering',
    },
    print: {
      page: {
        title: 'Product Code Print Center',
        subtitle: 'Unique numbering, batch records, and Code128 / QR previews',
        notice:
          'Each product code is issued once and rendered as both Code128 and QR. Choose either symbol or both in the print window; reprint existing codes from inventory below.',
        badges: {
          placeholder: 'Skeleton Placeholder',
          awaitingOrder: 'Awaiting Order',
          analysisReady: 'Ready {{count}} lines',
          analysisBlocked: 'Blocked {{count}} lines',
          protocolLinked: 'Protocol Linked',
        },
      },
      actions: {
        gotoProtocol: 'Back To Protocol Rules',
        gotoNumberingEngine: 'Open Shared Numbering Engine',
      },
      sections: {
        templates: {
          title: 'Order Intake',
          description:
            'Select a sales order and read order details as the authoritative source for print parsing.',
          placeholder:
            'Order intake is connected. This area now prefers normalized sales-order detail fields instead of re-deriving values from multiple sources.',
          selectLabel: 'Select Sales Order',
          selectPlaceholder: '-- Select Order --',
          summary: {
            orderNo: 'Order No.',
            customer: 'Customer',
            status: 'Order Status',
            lines: 'Line Count',
          },
          states: {
            loadingOrders: 'Loading orders',
            emptyOrders: 'There are no sales orders to choose from.',
            awaitingSelection:
              'Select a sales order before starting print parsing.',
            loadingOrderDetail: 'Loading order detail',
            orderDetailFailed:
              'Failed to load order detail. Please retry later.',
          },
        },
        parameters: {
          title: 'Parsing Rules',
          description:
            'Shows protocol summary and the minimum field-resolution rules currently used by the print tab.',
          placeholder:
            'The parsing-rules area is connected. It documents field sources and blocking rules, but does not yet host printer settings.',
          ruleTitle: 'Current Minimum Parsing Rules',
          summary: {
            protocolVersion: 'Protocol Version',
            sequenceRuleKey: 'Sequence Rule Key',
          },
          states: {
            loadingProtocol: 'Loading protocol config',
            protocolLoadFailed:
              'Failed to load protocol config. Please retry later.',
          },
          rules: {
            modelCode: 'modelCode comes from order-line `modelCodeSnapshot`',
            holePrefix: 'holePrefix comes from order-line `holePrefixSnapshot`',
            appearanceCode:
              'appearanceCode comes from order-line `appearanceBarcodeCodeSnapshot`',
            holeCount: 'holes comes from order-line `holeCount`',
            quantity:
              'Preprint quantity defaults to order-line `qty` and can be adjusted from 1 to 200',
          },
        },
        preview: {
          title: 'Parse Preview',
          description:
            'Set an independent preprint quantity per order line. Each unique code is rendered as Code128 and QR in one preview window.',
          placeholder:
            'Preprint quantity is independent of order quantity and supports 1 to 200 unique codes per batch.',
          actions: {
            printNow: 'Print {{quantity}} Now',
            printing: 'Preparing Preview ({{quantity}})...',
            previewReady: 'Print Preview Ready',
            loadingIssuanceSummary: 'Loading Issuance Count',
            unattributedIssuedInventory: 'Unresolved legacy code ownership',
            orderQuantityReached: 'Order Quantity Reached',
            batchPrintAll: 'Batch Print Order',
            batchPrinting: 'Batch Printing',
          },
          summary: {
            ready: 'Ready {{count}} lines',
            blocked: 'Blocked {{count}} lines',
          },
          toasts: {
            linePrintSuccess:
              'Created a printable preview for {{quantity}} labels',
            linePrintSuccessDescription: 'Full code: {{code}}',
            linePrintFailed: 'Failed to create the print preview',
            batchPrintSuccess:
              'Created order print previews for {{count}} lines.',
            batchPrintPartial:
              'Order print previews partially succeeded: {{successCount}} succeeded, {{failureCount}} failed.',
            batchPrintFailed:
              'Failed to create order print previews. Please retry later.',
          },
          errors: {
            quantityInvalid:
              'Preprint quantity {{quantity}} is invalid. Use an integer from 1 to 200.',
            previewBlocked:
              'The browser blocked the print preview. Allow pop-ups for this site and retry.',
            previewClosed:
              'The print preview was closed. Any newly created batch is scrapped automatically.',
            renderFailed:
              'Code128 or QR rendering failed. Retry; newly issued batches follow the existing print scrapping rules.',
          },
          states: {
            awaitingSelection: 'Select an order to inspect parsing results.',
            loading: 'Parsing order lines',
            noLines: 'This order has no lines available for parsing.',
            lineReady: 'Ready',
            lineBlocked: 'Blocked',
            unattributedIssuedInventory:
              '{{quantity}} active legacy codes have no confirmed order line. Issuance is paused until inventory is reconciled.',
          },
          fields: {
            lineNo: 'Line',
            modelCode: 'Model Code',
            holePrefix: 'Hole Prefix',
            appearanceCode: 'Appearance Code',
            holeCount: 'Hole Count',
            quantity: 'Quantity',
            orderQuantity: 'Order Quantity',
            issuedQuantity: 'Valid Issued',
            remainingQuantity: 'Remaining to Issue',
            printQuantity: 'Print Quantity This Time',
            sequenceRuleKey: 'Sequence Rule Key',
            mockSerial: 'Preview Serial',
            barcodeSerial: 'Barcode Config Serial',
            blockReason: 'Blocking Reasons',
          },
          issues: {
            productMissing: 'Missing product binding',
            modelCodeMissing: 'Missing model-code snapshot',
            holePrefixMissing: 'Missing hole-prefix snapshot',
            appearanceCodeMissing: 'Missing appearance-code snapshot',
            holeCountMissing: 'Missing hole count',
            quantityInvalid: 'Quantity must be greater than 0',
            sequenceRuleKeyMissing:
              'Protocol sequence rule key is not configured',
          },
        },
        result: {
          title: 'Latest Task Result',
          description:
            'Keeps the latest order-level batch print result so you can quickly review succeeded and failed lines.',
          actions: {
            retryFailedOnly: 'Retry Failed Only',
            retryingFailedOnly: 'Retrying Failed Lines',
            retryItem: 'Retry Print',
            retryingItem: 'Retrying',
          },
          filters: {
            all: 'All',
            success: 'Success',
            failed: 'Failed',
            skipped: 'Skipped',
          },
          summary: {
            totalLines: 'Total Lines',
            printableLines: 'Printable Lines',
            successCount: 'Succeeded',
            failureCount: 'Failed',
            skippedCount: 'Skipped',
          },
          states: {
            emptyFiltered:
              'There are no result items under the current filter.',
          },
          status: {
            success: 'Success',
            failed: 'Failed',
            skipped: 'Skipped',
          },
          fields: {
            lineNo: 'Line',
            message: 'Result',
            serial: 'Issued Serial',
            barcodeSerial: 'Barcode Serial',
          },
          messages: {
            success: 'Print preview created',
            failed: 'Print preview creation failed',
            skippedBlocked:
              'This line does not satisfy print conditions and was skipped.',
            skippedPreviewReady:
              'This line already has an open print preview and was skipped.',
          },
        },
        inventory: {
          title: 'Product Code Inventory',
          description:
            'Each issued code has Code128 and QR symbols on the same row. Reprints reuse the original code without issuing another number.',
          actions: {
            reprint: 'Reprint code',
            reprintCode: 'Reprint existing code {{code}}',
          },
          total: 'Inventory {{count}}',
          available: 'Available {{count}}',
          refresh: 'Refresh product-code inventory',
          loading: 'Loading product-code inventory',
          loadFailed: 'Failed to load product-code inventory.',
          empty: 'No product-code inventory exists in the current scope.',
          fields: {
            code: 'Full Code',
            batchNo: 'Print Batch',
            lineNo: 'Order Line',
            status: 'Status',
            expiresAt: 'Expires At',
            createdAt: 'Created At',
          },
          status: {
            AVAILABLE: 'Available',
            BOUND: 'Bound',
            EXPIRED: 'Expired',
            SCRAPPED: 'Scrapped',
          },
        },
      },
    },
    status: {
      page: {
        title: 'Product Code Status Definitions',
        description:
          'Defines product-code status meanings, sources, and boundaries; Code128 and QR use the same code and share the same status',
        badges: {
          definitionOnly: 'Definitions',
        },
      },
      actions: {
        retryContract: 'Reload Contract',
      },
      states: {
        loadingContract: 'Loading backend product-code status contract',
        contractLoadFailed: 'Failed to load product-code status contract',
        contractLoadFailedDescription:
          'This page no longer falls back to a frontend status array. If the contract cannot load, fix the backend contract endpoint first so the UI cannot drift from the real state machine. Code128 and QR share this status contract.',
      },
      metrics: {
        total: 'Total Statuses',
        inventory: 'Print Inventory Statuses',
        terminal: 'Terminal Statuses',
      },
      categories: {
        inventory: {
          title: 'Print Inventory Statuses',
          description:
            'Describes product codes from print generation through binding, expiry, or scrapping; the Code128 and QR symbols share one inventory record.',
        },
        production: {
          title: 'Production Execution Statuses',
          description:
            'Describes product codes through production execution, transfer, hold, and rework flows. Roll binding is not required to start production; either symbol reaches the same state.',
        },
      },
      location: {
        title: 'Production Status Second-level Location',
        description:
          'Production execution status is the primary state. routeStepId identifies the route position, and currentProcessStepId identifies its process.',
        required: 'Required Anchor',
        optional: 'Auxiliary Anchor',
        writePolicyTitle: 'Write Boundary',
      },
      locationAnchors: {
        ROUTE: {
          label: 'Product Route',
          description:
            'Identifies which production route the barcode belongs to. A status can exist without it, but route sequencing cannot advance automatically.',
        },
        ROUTE_STEP: {
          label: 'Route Step',
          description:
            'The primary anchor for the current production position. It identifies a concrete step inside a route, not a reusable process definition.',
        },
        PROCESS_STEP: {
          label: 'Current Process',
          description:
            'The process definition derived from the route step and used to display the current process. Writes should validate and derive it from routeStepId.',
        },
        CUSTODY_TRANSFER: {
          label: 'Custody / Transfer Fact',
          description:
            'Records holder changes between factory, staging, outsourcing partner, return inspection, and similar locations. It does not replace production execution status.',
        },
      },
      writePolicies: {
        STATUS_DEFINITIONS_READ_ONLY:
          'Status definitions are read-only contract values. This page displays meanings and must not edit them.',
        PRODUCTION_STATUS_WITH_LOCATION:
          'Production execution status is the first-level state; routeStepId and currentProcessStepId are the second-level location under it.',
        ROUTE_STEP_IS_PRECISE_ROUTE_POSITION:
          'Persist routeStepId so the same process used at multiple route positions remains unambiguous.',
        WRITE_THROUGH_SCAN_OR_EXECUTION_COMMAND:
          'Barcode state changes should be written by scan, execution, transfer, or audited correction commands, not by direct dictionary edits.',
      },
      flow: {
        title: 'Lifecycle Notes',
        description:
          'Inventory and production states belong to separate business facts. Product binding is an optional material-trace relation, not a production-start prerequisite.',
        printStageTitle: 'Product Code Issuance',
        printStageDescription:
          'The print tab creates one inventory record per product code in linear_barcode_inventory_items.',
        bindingStageTitle: 'Optional: Code-to-Roll Binding',
        bindingStageDescription:
          'Product binding links the code to an activated prepreg roll instance and moves inventory from available to bound; it does not mean production has started.',
        executionStageTitle: 'Independent Production History',
        executionStageDescription:
          'Production-state initialization and scan/process commands write production states, operations, and events. Starting work does not require binding or modify code inventory.',
      },
      fields: {
        phase: 'Phase',
        trigger: 'Trigger',
        sourceTable: 'Source Table',
        terminalYes: 'Terminal',
        terminalNo: 'Non-terminal',
      },
      definitions: {
        inventory: {
          AVAILABLE: {
            label: 'Available',
            description:
              'The product code is in print inventory and has not been linked to a prepreg roll instance.',
            phase: 'Available after printing',
            trigger: 'Written automatically after successful batch print',
          },
          BOUND: {
            label: 'Bound',
            description:
              'The product code is linked to a prepreg roll instance and cannot be rebound to another roll.',
            phase: 'After material-trace binding',
            trigger: 'Written after product binding succeeds',
          },
          EXPIRED: {
            label: 'Expired',
            description:
              'The preprinted code is past its validity window and should not be bound to a new product.',
            phase: 'Inventory expiry',
            trigger:
              'Shown as expired after expiry; persisted when scanned for binding',
          },
          SCRAPPED: {
            label: 'Scrapped',
            description:
              'The code is no longer usable after preview close, batch scrap, or safety rollback.',
            phase: 'Inventory scrapping',
            trigger: 'Written by batch scrap or safety rollback',
          },
        },
        production: {
          NOT_STARTED: {
            label: 'Not Started',
            description:
              'The product code has a production state record, but has not entered a concrete process execution yet.',
            phase: 'Production pending',
            trigger:
              'Production state initialization or route-step advancement',
          },
          IN_PROGRESS: {
            label: 'In Progress',
            description:
              'The product code has entered a process or execution action and is flowing through production.',
            phase: 'Process execution',
            trigger:
              'Written by scan start, process execution, or transfer to a new process',
          },
          COMPLETED: {
            label: 'Completed',
            description:
              'The current production execution for the product code is complete and can move to acceptance, shipment, or archive checks.',
            phase: 'Execution complete',
            trigger: 'Written by process completion or production completion',
          },
          HOLD: {
            label: 'On Hold',
            description:
              'The product code is temporarily stopped and requires manual confirmation, exception handling, or a later action.',
            phase: 'Exception waiting',
            trigger:
              'Written by exception hold, pause, or waiting-for-handling action',
          },
          REWORK: {
            label: 'Rework',
            description:
              'The product code has entered rework and must later return to an explicit state through scan or execution actions.',
            phase: 'Rework handling',
            trigger:
              'Written by quality exception, rework instruction, or rework transfer',
          },
        },
      },
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
        description:
          'Centralized entry for the current shared numbering configuration and product-code numbering rules',
        notice:
          'This shared page now only keeps the product-code shared numbering configuration.',
        badges: {
          linearBarcode: 'Product Codes',
        },
      },
      sections: {
        linearBarcode: {
          title: 'Product Code Numbering Rules',
          description:
            'Reuses the current product-code numbering rules and persisted /numbering/rules backend capability.',
          status: 'Backend numbering connected',
        },
      },
    },
  },
}
