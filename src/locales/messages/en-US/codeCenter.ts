export const codeCenter = {
  title: 'Code Center',
  linearBarcode: {
    tabs: {
      protocol: 'Protocol Rules',
      print: 'Print',
      numbering: 'Business Numbering',
    },
    print: {
      page: {
        title: 'Linear Barcode Print Center',
        subtitle: 'LINEAR BARCODE PRINT / Skeleton page for protocol linkage, templates, and print tasks',
        notice:
          'This page now focuses on the minimum parsing path for linear barcode printing: select a sales order, read normalized fields from order details, detect blocking issues, and preview resolved parameters. Real print submission will be connected later.',
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
            awaitingSelection: 'Select a sales order before starting print parsing.',
            loadingOrderDetail: 'Loading order detail',
            orderDetailFailed: 'Failed to load order detail. Please retry later.',
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
            protocolLoadFailed: 'Failed to load protocol config. Please retry later.',
          },
          rules: {
            modelCode: 'modelCode comes from order-line `modelCodeSnapshot`',
            holePrefix: 'holePrefix comes from order-line `holePrefixSnapshot`',
            appearanceCode: 'appearanceCode comes from order-line `appearanceBarcodeCodeSnapshot`',
            holeCount: 'holes comes from order-line `holeCount`',
            quantity: 'quantity comes from order-line `qty`',
          },
        },
        preview: {
          title: 'Parse Preview',
          description:
            'Shows whether each order line satisfies the minimum print-parsing requirements and previews available barcode parameters.',
          placeholder:
            'The parse-preview area is connected. It currently provides ready/blocked checks and parameter preview, without real print submission.',
          actions: {
            issueRealNumbers: 'Issue Real Numbers',
            issuingNumbers: 'Issuing Numbers',
            numbersReady: 'Real Numbers Loaded',
            printNow: 'Print {{quantity}} Now',
            printing: 'Sending ({{quantity}})...',
            batchPrintAll: 'Batch Print Order',
            batchPrinting: 'Batch Printing',
          },
          summary: {
            ready: 'Ready {{count}} lines',
            blocked: 'Blocked {{count}} lines',
          },
          toasts: {
            linePrintSuccess: 'Sent {{quantity}} labels to the print queue',
            linePrintSuccessDescription: 'Starting SN: {{serialNumber}}',
            linePrintFailed: 'Failed to send the print command',
            batchPrintSuccess: 'Batch print submitted for {{count}} lines.',
            batchPrintPartial: 'Batch print partially succeeded: {{successCount}} succeeded, {{failureCount}} failed.',
            batchPrintFailed: 'Batch print failed. Please retry later.',
          },
          states: {
            awaitingSelection: 'Select an order to inspect parsing results.',
            loading: 'Parsing order lines',
            noLines: 'This order has no lines available for parsing.',
            lineReady: 'Ready',
            lineBlocked: 'Blocked',
            awaitingRealNumber: 'Issue real numbers first',
            numberingFailed: 'Failed to issue real numbers. Please retry later.',
          },
          fields: {
            lineNo: 'Line',
            modelCode: 'Model Code',
            holePrefix: 'Hole Prefix',
            appearanceCode: 'Appearance Code',
            holeCount: 'Hole Count',
            quantity: 'Quantity',
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
            sequenceRuleKeyMissing: 'Protocol sequence rule key is not configured',
          },
        },
        result: {
          title: 'Latest Task Result',
          description: 'Keeps the latest order-level batch print result so you can quickly review succeeded and failed lines.',
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
            emptyFiltered: 'There are no result items under the current filter.',
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
            success: 'Print submitted successfully',
            failed: 'Print submission failed',
            skippedBlocked: 'This line does not satisfy print conditions and was skipped.',
            skippedUnnumbered: 'This line has not received a real number yet and was skipped.',
          },
        },
      },
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
