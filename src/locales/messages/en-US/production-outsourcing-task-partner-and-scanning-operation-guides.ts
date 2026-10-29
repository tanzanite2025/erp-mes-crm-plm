export const productionOutsourcingOperationGuides = {
  domainLabel: 'Production handbook · Outsourcing',
  contentsLabel: 'Outsourcing operation guide contents',
  readingAreaLabel: 'Outsourcing operation guide reading area',
  stepsLabel: 'Steps',
  exampleLabel: 'Example',
  referenceLabel: 'Open business page',
  openTaskGuide: 'Task and partner guide',
  openScanningGuide: 'Transfer and scanning guide',
  mobileEntryLabel: 'Guide',
  references: {
    partners: 'Open outsource partners',
    orders: 'Open outsource tasks',
    transfers: 'Open send, return and inspection',
  },
  tasksAndPartners: {
    title: 'Outsource task and partner operation guide',
    introduction:
      'Prepare the source, maintain the partner, create the task, then review and release it. Barcodes can be registered after release. Actual sending, returning and inspection take place in Send, return and inspection.',
    mobileIntroduction:
      'Set up the partner, create and release the task. Register barcodes later if needed.',
    shortcutDescription:
      'Follow partner setup, source selection, task quantities and release step by step.',
    chapters: {
      preparation: {
        label: 'Before you start',
        shortLabel: 'Prepare',
        title: 'Decide who will process which products and how many',
        description:
          'An outsource task records the processing arrangement. A partner record holds the contractor details. Prepare the source document and partner information first.',
        notice:
          'The task quantity is planned scope. Saving a draft or releasing a task does not record a shipment or advance a product process.',
        steps: {
          first: {
            title: 'Prepare the source document',
            description:
              'Confirm whether the source is a sales order or production plan. Have its number, products and quantities ready. If it is missing from the picker, check that the source document exists.',
          },
          second: {
            title: 'Check the outsource partner',
            description:
              'Search for the contractor in Outsource partners. Reuse an existing record; create one only when needed to avoid duplicate partners.',
          },
          third: {
            title: 'Check products and units',
            description:
              'Verify the product code, specification, unit and quantity to outsource. A product code identifies the product; an item or batch barcode identifies the physical goods for scanning.',
          },
          fourth: {
            title: 'Confirm responsibilities',
            description:
              'Task staff maintain partners, create tasks and release them. Transfer and inspection staff confirm actual actions in Send, return and inspection. Ask an administrator to check account access if a required action is unavailable.',
          },
        },
        example:
          'A sales order contains 100 PCS, but only 20 PCS need outsourcing now. Create a task for 20 PCS. You do not need to scan 20 barcodes in the creation dialog.',
        completion:
          'Ready to proceed: the source, available partner, product and quantity have been verified.',
      },
      partners: {
        label: 'Maintain partners',
        shortLabel: 'Partner',
        title: 'Step 1: Create an available outsource partner',
        description:
          'Maintain contractor identity, contact details and lead time in Outsource partners. Later tasks reference this record.',
        notice:
          'The task partner picker lists active partners. Linking a supplier is optional; you do not need to create another supplier just to set up an outsource partner.',
        steps: {
          first: {
            title: 'Search before adding',
            description:
              'Open Outsource partners and search by code or name. Choose Add outsource partner only if no suitable record exists.',
          },
          second: {
            title: 'Enter the code and name',
            description:
              'Enter an outsource code and partner name. Both are required. Use a code that helps staff find and distinguish this contractor.',
          },
          third: {
            title: 'Complete relevant details',
            description:
              'Add contacts, phone, address, standard lead time, quality grade and settlement notes as needed. Link an existing supplier if appropriate.',
          },
          fourth: {
            title: 'Confirm status and save',
            description:
              'Set the status to Active when ready for use, save and verify the list entry. Complete internal review before activating a partner under review or inactive.',
          },
        },
        example:
          'Create OUT-001 for Huacheng Surface Treatment, set it to Active and enter the contact and a three-day lead time. New tasks can select this partner.',
        completion:
          'Once saved with Active status, the partner can be selected in a new outsource task.',
      },
      tasks: {
        label: 'Create a task',
        shortLabel: 'Create',
        title: 'Step 2: Select the source, products and quantities',
        description:
          'Open Outsource tasks and choose Add outsource task. Select the source, then review each task line.',
        notice:
          'Barcode registration is outside the task creation dialog. Save and release first, then optionally register barcodes per line in Send, return and inspection. Empty or partial lists are allowed.',
        steps: {
          first: {
            title: 'Choose the source type and document',
            description:
              'Choose Sales order or Production plan, then the source document. Leave the outsource order number blank for automatic numbering.',
          },
          second: {
            title: 'Select the outsource partner',
            description:
              'Choose an active contractor. Enter planned send and return dates and task notes as needed. If missing, check the partner record and its status.',
          },
          third: {
            title: 'Review each task line',
            description:
              'For a sales order, select a source order line for every task line; the same source line cannot be added twice. A production plan currently supports one task line. Check product code, specification and unit, then enter a quantity greater than zero.',
          },
          fourth: {
            title: 'Add process context if needed and save',
            description:
              'Segment and current process information are optional when creating a task. Saving creates a draft. Check the source, partner and lines before release.',
          },
        },
        example:
          'Select the glove line from SO-001 and partner OUT-001, enter 20 PCS and save. The task plans 20 PCS; the actual sent quantity remains 0 PCS.',
        completion:
          'The draft is saved and its source, partner, products and quantities are correct. It is ready for release.',
      },
      release: {
        label: 'Review and release',
        shortLabel: 'Release',
        title: 'Step 3: Review the draft and hand it over for execution',
        description:
          'Release makes the task available for execution. Actual goods transfers and inspection are handled in Send, return and inspection.',
        notice:
          'Release does not ship goods. Do not duplicate tasks to correct execution records. When transfers or inspection already exist, check the original task and actual situation first.',
        steps: {
          first: {
            title: 'Check the draft',
            description:
              'Verify the source number, partner, product code, specification, quantity and unit. Edit incorrect drafts. Use the available page actions for drafts no longer needed.',
          },
          second: {
            title: 'Choose Release',
            description:
              'Choose Release after checking, wait for success and confirm Released status. Missing barcode registration does not prevent release.',
          },
          third: {
            title: 'Find the line in execution',
            description:
              'Switch to Send, return and inspection and find the task by number or partner. Select the correct product line. Open Barcode registration first if you want to prepare a barcode list.',
          },
          fourth: {
            title: 'Continue as physical actions happen',
            description:
              'Confirm sending when goods leave, confirm return when they arrive, then submit inspection. Read the transfer and scanning guide and check each line’s quantity progress.',
          },
        },
        example:
          'After releasing a 20 PCS task, you may register two barcodes or leave the list empty. Sent quantity increases by 1 PCS only after an actual 1 PCS send is confirmed.',
        completion:
          'The task is released and its correct line is available in execution. Future progress comes from confirmed business actions.',
      },
    },
  },
  sendReturnInspection: {
    title: 'Send, return, inspection and scanning guide',
    introduction:
      'Select the outsource line, then send, return or inspect according to the actual event. Registration is optional. Scanning or pressing Enter in an action dialog only reads information; the explicit confirmation records the action.',
    mobileIntroduction:
      'Select line → optional registration → scan and review → confirm the action.',
    shortcutDescription:
      'Learn optional barcode registration, scan review, actual transfers and the process destination after inspection.',
    chapters: {
      preparation: {
        label: 'Choose line and action',
        shortLabel: 'Prepare',
        title: 'Choose the right task and identify the action',
        description:
          'Send, return and inspection works with released tasks. Every action belongs to the selected line. Verify the partner and product before scanning.',
        notice:
          'Barcode registration only saves a list of codes. Sending, returning and inspection are separate business actions. Scanning or pressing Enter to read a barcode does not submit them.',
        steps: {
          first: {
            title: 'Find the correct task and product line',
            description:
              'Search by task number, source number or partner. Check the partner, product code, specification and quantity of the selected line before scanning.',
          },
          second: {
            title: 'Read the quantity progress',
            description:
              'Check planned, sent, returned and inspection quantities. Keep barcode counts separate from business quantities: registering a code does not mean a piece has been sent.',
          },
          third: {
            title: 'Choose the actual action',
            description:
              'Use Barcode registration to organize codes, Send when goods leave, Return when they arrive, and Inspection after checking quality. Each action requires the appropriate account access.',
          },
          fourth: {
            title: 'Prepare a verifiable physical barcode',
            description:
              'A scanner works as keyboard input; manual entry is also supported. Actual execution requires valid production information for the barcode. Ask the responsible staff to verify missing or mismatched barcode information.',
          },
        },
        example:
          'A task plans 20 PCS and has two registered barcodes but no confirmed send: sent quantity is still 0 PCS. Check your factory coding rules to know whether a barcode represents one item or a batch.',
        completion:
          'The task, partner, line and action are clear. Continue to registration or the appropriate action dialog.',
      },
      registration: {
        label: 'Optional registration',
        shortLabel: 'Register',
        title: 'Register barcodes per line when useful',
        description:
          'Open optional Barcode registration on the selected line to prepare a list of physical codes before business actions occur.',
        notice:
          'Empty and partial lists are allowed; barcode count need not equal task quantity. Saving registration does not send, return, inspect, move stock, advance a process or initialize barcode production state.',
        steps: {
          first: {
            title: 'Check the dialog’s task and line',
            description:
              'Verify the task and product shown in the dialog. Every line has its own saved barcode list, so check the selected line first.',
          },
          second: {
            title: 'Scan or type, then press Enter',
            description:
              'Scan or type a barcode and press Enter to add it to the list. Continue with the next code. Leading and trailing spaces are removed, letters become uppercase, and duplicate codes within this line are reported.',
          },
          third: {
            title: 'Review and remove incorrect codes',
            description:
              'Remove mistakes from the list. A line supports up to 1,000 codes, each up to 120 characters without control characters. You do not need to match the planned quantity.',
          },
          fourth: {
            title: 'Choose Save',
            description:
              'Choose Save after editing and wait for success. Later actions can pick a registered code or scan directly; preregistration is optional.',
          },
        },
        example:
          'Register GLOVE-0001 and GLOVE-0002 for a 20 PCS line and save. The task can continue with just these two codes. Actual sent quantity remains 0 PCS.',
        completion:
          'The registered count updates after saving. Open Send when the goods are ready and verify the barcode and actual quantity.',
      },
      send: {
        label: 'Send to partner',
        shortLabel: 'Send',
        title: 'Confirm sending when goods are handed to the partner',
        description:
          'Sending records the quantity and inventory handover. The task, product and barcode must match the physical delivery.',
        notice:
          'A barcode can be sent only once within the same task line. For a batch barcode, enter the correct actual batch quantity in one submission; do not split it across repeated sends.',
        steps: {
          first: {
            title: 'Open Send and read the barcode',
            description:
              'Choose Send on the correct line. Pick a registered barcode or scan directly. Press Enter or choose Read barcode and review; this only reads information.',
          },
          second: {
            title: 'Check current process and available quantity',
            description:
              'Review the barcode’s process, available quantity and messages. Actual sending requires valid production information. Resolve unknown or mismatched barcodes first; list registration does not replace this check.',
          },
          third: {
            title: 'Enter the actual quantity and source',
            description:
              'Choose the source inventory category and enter the physical send quantity, batch and notes as needed. The destination is outsourced work in progress. Keep the quantity within the available limit.',
          },
          fourth: {
            title: 'Confirm outsource send',
            description:
              'Review and choose Confirm outsource send. Check sent progress after success. This changes inventory and custody while keeping the barcode’s current process unchanged.',
          },
        },
        example:
          'GLOVE-0001 represents 1 PCS. Read, review and confirm sending 1 PCS. Sent quantity changes from 0 to 1 PCS; 19 PCS of the 20 PCS task remain unsent.',
        completion:
          'The success message and updated sent progress confirm completion. If the result is unclear, check progress before retrying instead of clicking repeatedly.',
      },
      return: {
        label: 'Return to factory',
        shortLabel: 'Return',
        title: 'Record the returned barcode when goods arrive',
        description:
          'Return follows the barcode and quantity previously sent. Confirm the goods are physically back before recording receipt.',
        notice:
          'Return does not complete inspection or advance the process. A barcode can be returned only once in the same task line. Verify the actual batch quantity before submitting.',
        steps: {
          first: {
            title: 'Select the original line and sent barcode',
            description:
              'Find the original task and product line and open Return. This barcode must have a send record on this line; another task’s shipment cannot be used.',
          },
          second: {
            title: 'Scan, read and review',
            description:
              'Scan or pick a registered code and press Enter to read it. Check the barcode, process and available quantity. Reading alone does not record a return.',
          },
          third: {
            title: 'Enter destination and received quantity',
            description:
              'The source is the outsource category. Choose the factory destination category and enter actual quantity, batch and notes as needed. Do not exceed the barcode’s sent quantity or the line’s outstanding return quantity.',
          },
          fourth: {
            title: 'Confirm outsource return',
            description:
              'Check goods and quantity, then choose Confirm outsource return. Verify returned and pending inspection progress. The barcode’s process remains unchanged until inspection.',
          },
        },
        example:
          'GLOVE-0001 was sent as 1 PCS. Confirm its physical return of 1 PCS. Sent remains 1, returned becomes 1, and that 1 PCS still needs inspection.',
        completion:
          'Successful return and updated progress complete physical receipt. Continue with inspection according to the actual quality result.',
      },
      inspection: {
        label: 'Inspection and routing',
        shortLabel: 'Inspect',
        title: 'Review the process destination before submitting inspection',
        description:
          'Inspect a returned barcode and submit the result and disposition. The configured production route determines its destination, and the system records a formal inspection task.',
        notice:
          'Inspection does not always move to the next sequential process. Acceptance, concession, rework and scrap can lead to different destinations and states. Use the dialog preview.',
        steps: {
          first: {
            title: 'Read a returned barcode',
            description:
              'Open Inspection on the original task line and read the barcode. It must have a return record. Check the available quantity and stay within the returned quantity still available for inspection.',
          },
          second: {
            title: 'Enter quantity, result and disposition',
            description:
              'Enter the actual inspected quantity and choose pass, conditional acceptance or fail, with accept, concession, rework or scrap disposition. A failed result allows only rework or scrap.',
          },
          third: {
            title: 'Review the destination and status',
            description:
              'Check the process and status shown after confirmation. The route may continue, complete, enter rework or pause. Recheck the preview whenever result or disposition changes.',
          },
          fourth: {
            title: 'Confirm inspection submission',
            description:
              'Choose Confirm inspection submission and check progress after success. Each barcode can be inspected once per task line. Correct reported errors; check progress before retrying if the result is uncertain.',
          },
        },
        example:
          'GLOVE-0001 has returned as 1 PCS. Submit pass and accept for 1 PCS; the barcode follows the previewed route. This completes that piece’s actions, not the entire 20 PCS task.',
        completion:
          'Inspection succeeded and quantity progress and barcode destination are verified. You do not need to create another identical inspection task on this page.',
      },
    },
  },
}
