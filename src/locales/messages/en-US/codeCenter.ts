export const codeCenter = {
  title: 'Code Center',
  linearBarcode: {
    tabs: {
      protocol: 'Protocol Rules',
      print: 'Print',
      status: 'Barcode Status',
      numbering: 'Business Numbering',
    },
    print: {
      page: {
        title: 'Linear Barcode Print Center',
        subtitle:
          'LINEAR BARCODE PRINT / Unique numbering, batch records, and Code128 previews',
        notice:
          'Each print transaction reserves unique serials, creates canonical 15-character codes, and stores every code as available inventory before opening the preview.',
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
            'Set an independent preprint quantity per order line and generate that many unique Code128 labels.',
          placeholder:
            'Preprint quantity is independent of order quantity and supports 1 to 200 unique codes per batch.',
          actions: {
            printNow: 'Print {{quantity}} Now',
            printing: 'Preparing Preview ({{quantity}})...',
            previewReady: 'Print Preview Ready',
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
              'The Code128 label could not be rendered, so no print batch was created.',
          },
          states: {
            awaitingSelection: 'Select an order to inspect parsing results.',
            loading: 'Parsing order lines',
            noLines: 'This order has no lines available for parsing.',
            lineReady: 'Ready',
            lineBlocked: 'Blocked',
          },
          fields: {
            lineNo: 'Line',
            modelCode: 'Model Code',
            holePrefix: 'Hole Prefix',
            appearanceCode: 'Appearance Code',
            holeCount: 'Hole Count',
            quantity: 'Quantity',
            orderQuantity: 'Order Quantity',
            printQuantity: 'Preprint Quantity (1-200)',
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
          title: 'Linear Barcode Inventory',
          description:
            'Lists each issued code with its batch, order line, availability, and expiration time.',
          total: 'Inventory {{count}}',
          available: 'Available {{count}}',
          refresh: 'Refresh linear barcode inventory',
          loading: 'Loading linear barcode inventory',
          loadFailed: 'Failed to load linear barcode inventory.',
          empty: 'No linear barcode inventory exists in the current scope.',
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
        title: 'Linear Barcode Status Definitions',
        description:
          'Defines status meanings, sources, and boundaries across print inventory and production execution',
        badges: {
          definitionOnly: 'Definitions',
        },
      },
      metrics: {
        total: 'Total Statuses',
        inventory: 'Print Inventory Statuses',
        terminal: 'Terminal Statuses',
      },
      boundary: {
        title: 'Responsibility Boundary',
        description:
          'This page is a status definition dictionary; it does not query the current state of a specific barcode. Print inventory statuses only describe whether an issued code is usable. Production execution statuses only describe the execution state of a bound product barcode. They do not replace L1/L2/L3 production definitions and do not require prepreg-roll binding before normal production can continue.',
      },
      categories: {
        inventory: {
          title: 'Print Inventory Statuses',
          description:
            'Describes issued barcode codes from print generation through binding, expiry, or scrapping.',
        },
        production: {
          title: 'Production Execution Statuses',
          description:
            'Describes bound product barcodes through production execution, transfer, hold, and rework flows.',
        },
      },
      flow: {
        title: 'Lifecycle Notes',
        description:
          'Status boundaries are defined here first. Later scan, outsourcing, transfer, and traceability features should reference these meanings instead of inventing separate ones.',
        printStageTitle: '1. Print Numbering',
        printStageDescription:
          'The print tab creates linear barcode inventory in linear_barcode_inventory_items.',
        bindingStageTitle: '2. Product Binding',
        bindingStageDescription:
          'Product binding links a code to a product and moves inventory from available to bound.',
        executionStageTitle: '3. Production Execution',
        executionStageDescription:
          'Scan, transfer, outsourcing, and process execution write product_barcode_states / events.',
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
              'The code has been generated and reserved in print inventory, but is not yet bound to a product.',
            phase: 'After printing, before binding',
            trigger: 'Written automatically after successful batch print',
          },
          BOUND: {
            label: 'Bound',
            description:
              'The code has been bound to a product and cannot be reused as a blank code.',
            phase: 'After product binding',
            trigger: 'Written after product binding succeeds',
          },
          EXPIRED: {
            label: 'Expired',
            description:
              'The preprinted code is past its validity window and should not be bound to a new product.',
            phase: 'Inventory expiry',
            trigger: 'Written when expiry is refreshed before query or binding',
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
              'The product barcode has a production state record, but has not entered a concrete process execution yet.',
            phase: 'Production pending',
            trigger: 'Initialized state or pre-production state after binding',
          },
          IN_PROGRESS: {
            label: 'In Progress',
            description:
              'The product barcode has entered a process or execution action and is flowing through production.',
            phase: 'Process execution',
            trigger:
              'Written by scan start, process execution, or transfer to a new process',
          },
          COMPLETED: {
            label: 'Completed',
            description:
              'The current production execution for the product barcode is complete and can move to acceptance, shipment, or archive checks.',
            phase: 'Execution complete',
            trigger: 'Written by process completion or production completion',
          },
          HOLD: {
            label: 'On Hold',
            description:
              'The product barcode is temporarily stopped and requires manual confirmation, exception handling, or a later action.',
            phase: 'Exception waiting',
            trigger:
              'Written by exception hold, pause, or waiting-for-handling action',
          },
          REWORK: {
            label: 'Rework',
            description:
              'The product barcode has entered rework and must later return to an explicit state through scan or execution actions.',
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
          'Centralized entry for the current shared numbering configuration and linear-barcode numbering rules',
        notice:
          'This shared page now only keeps the linear-barcode shared numbering configuration.',
        badges: {
          linearBarcode: 'Linear Barcode',
        },
      },
      sections: {
        linearBarcode: {
          title: 'Linear Barcode Numbering Rules',
          description:
            'Reuses the current linear-barcode numbering rules and persisted /numbering/rules backend capability.',
          status: 'Backend numbering connected',
        },
      },
    },
  },
}
