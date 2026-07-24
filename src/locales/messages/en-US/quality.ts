export const quality = {
  layout: {
    title: 'Quality Baseline',
    tabs: {
      standards: 'Quality Standards',
      abnormalities: 'Abnormality Handling',
      inspection: 'Inspection Execution',
      specialBuy: 'Special Acceptance Release',
    },
  },
  common: {
    system: 'System',
    unknown: 'Unknown',
  },
  standards: {
    page: {
      title: 'Quality Standards System',
      description:
        'Centralized management of inspection standards, tolerance agreements, and controlled quality documents',
      activeProtocols: 'Active Protocols',
      files: 'files',
      searchPlaceholder: 'Search standards...',
      add: 'Add Controlled Protocol',
      filter: 'Filter',
      filterType: 'Type Filter',
      allTypes: 'All Types',
      empty: 'No matching protocols',
      totalRecords: 'Total Records',
      statusViewTitle: 'Status Views',
      statusViewDescription:
        'Switch the list by standard status with the same server-side query semantics.',
      statusViewAll: 'All Standards',
      statusViewAllDescription:
        'View all quality standards under the current query conditions.',
      statusViewDraftDescription:
        'Only show standards that are still in draft and have not entered the approval workflow.',
      statusViewPendingApprovalDescription:
        'Only show standards that have been submitted and are waiting for review.',
      statusViewApprovedDescription:
        'Only show standards that are approved and waiting for formal release.',
      statusViewRejectedDescription:
        'Only show standards that were rejected and are waiting for revision before resubmission.',
      statusViewPublishedDescription:
        'Only show published standards that are formally traceable.',
      statusViewArchivedDescription:
        'Only show archived standards that are no longer actively edited.',
      paginationSummary: 'Showing {{start}}-{{end}} of {{total}}',
      pageSizeLabel: 'Per Page',
      pageIndicator: 'Page {{page}} / {{totalPages}}',
    },
    table: {
      protocolId: 'Protocol ID',
      version: 'Version',
      schemaName: 'Schema Name',
      category: 'Category',
      status: 'Digital Status',
      operatorHistory: 'Operator History',
      actions: 'Actions',
    },
    card: {
      published: 'Published',
      drafting: 'Drafting',
      archived: 'Archived',
      operator: 'Operator',
    },
    values: {
      typeIncoming: 'IQC',
      typeInProcess: 'IPQC',
      typeFirstPiece: 'FQC',
      typeOutgoing: 'OQC',
      statusDraft: 'Draft',
      statusPendingApproval: 'Pending Review',
      statusApproved: 'Approved',
      statusRejected: 'Rejected',
      statusPublished: 'Published',
      statusPending: 'Pending Review',
      statusArchived: 'Archived',
    },
    workspace: {
      backToList: 'Back to Standards',
      openPreview: 'Open Preview',
      openEditor: 'Open Editor Workspace',
      submitForApproval: 'Submit for Approval',
      approve: 'Approve',
      approveDescription:
        'Add the review comment for this approval. Leave it blank if no extra note is needed.',
      reject: 'Reject',
      rejectDescription:
        'Please provide the rejection reason so the owner can revise the standard before resubmission.',
      publish: 'Publish',
      archive: 'Archive',
      archiveDescription:
        'Please provide the archive reason. After archiving, the standard remains available only for traceability and audit.',
      reviewCommentLabel: 'Review Comment',
      reviewCommentPlaceholder:
        'Add the approval note for this review (optional)...',
      rejectReasonLabel: 'Rejection Reason',
      rejectReasonPlaceholder: 'Please enter the rejection reason...',
      archiveReasonLabel: 'Archive Reason',
      archiveReasonPlaceholder: 'Please enter the archive reason...',
      phaseTag: 'Phase A Page Shell',
      currentStandardId: 'Current Standard ID',
      editorCreateTitle: 'Create Quality Standard Workspace',
      editorEditTitle: 'Edit Quality Standard Workspace',
      editorCreateDescription:
        'Use the standalone editor page to create the standard basics, then continue through the controlled preview flow.',
      editorEditDescription:
        'Use the standalone editor page to maintain the standard basics, then return to the preview page for confirmation.',
      editorHint:
        'The editing flow now lives in the standalone page. The legacy dialog remains only as a compatibility shell.',
      editorFormTitle: 'Standard Basics',
      editorFormDescription:
        'This phase migrates the standard code, name, type, status, and remarks into the standalone editor. Deep matrix editing will follow in later phases.',
      editorDirty: 'Unsaved Changes',
      approvalControlledHint:
        'Status is controlled by the approval flow. Save the current edits first, then use Submit for Approval to enter the pending review stage.',
      readOnlyHint:
        'This standard is already under controlled status. The editor remains view-only and no direct changes are allowed here.',
      backToPreview: 'Back to Preview',
      editorLoadFailedTitle: 'Failed to Load Standard Editor',
      editorLoadFailedDescription:
        'Unable to load editing data for the current standard ID. Please return to the list and try again.',
      editorMissingTitle: 'Editable Quality Standard Not Found',
      editorMissingDescription:
        'The standard may have been deleted, or it is not accessible in the current scope.',
      previewTitle: 'Quality Standard Preview Page',
      previewDescription:
        'The standalone preview page shell is ready. The next phase will migrate the standard summary, matrix preview, printing, and pre-release confirmation here.',
      previewHint:
        'This phase does not introduce a new standard detail query yet, so the page currently focuses on the preview route shell and navigation chain before matrix content migration.',
      previewLoadFailedTitle: 'Failed to Load Standard Preview',
      previewLoadFailedDescription:
        'Unable to load preview data for the current standard ID. Please return to the list and try again.',
      previewMissingTitle: 'Quality Standard Not Found',
      previewMissingDescription:
        'The standard may have been deleted, or it is not accessible in the current scope.',
    },
    dialog: {
      action: {
        titleEdit: 'Edit Core Standard',
        titleCreate: 'Create Core Standard',
        subtitleEdit: 'Updating Quality Standard',
        subtitleCreate: 'Create New Quality Standard',
        fields: {
          code: 'Standard Code',
          systemVersion: 'System Version Control',
          name: 'Standard Name',
          type: 'Standard Type',
          status: 'Release Status',
          remarks: 'Remarks',
        },
        placeholders: {
          code: 'e.g. STD2601...',
          name: 'Enter the full standard name...',
          type: 'Select type',
          status: 'Select status',
          remarks: 'Additional details...',
        },
        versionCurrent: 'Current',
        versionInitial: 'Initial',
        validationRequired:
          'Please complete the required fields (code and name).',
        toastUpdated: 'Quality standard updated to VER {{version}}',
        toastCreated: 'Quality standard created successfully (VER 1.0)',
        versionNoticeTitle: 'Auto versioning is enabled',
        versionNoticeEdit:
          'A change was detected in the current standard. After saving, the version will advance to VER {{version}}.',
        versionNoticeCreate:
          'New quality standards start at VER 1.0 automatically.',
        cancel: 'Discard',
        save: 'Save and Upgrade Version',
      },
      controlledProtocol: {
        titleCreate: 'Add Controlled Protocol',
        titleEdit: 'Edit Controlled Protocol',
        titleView: 'View Controlled Protocol',
        description:
          'Define inspection items, target weight, qualified bounds, and scrap thresholds for the product as the single source of quality rules.',
        fields: {
          product: 'Product',
          qualityCriteria: 'Quality Criteria',
          selectedWeights: 'Inspection Items & Rules',
          itemName: 'Inspection Item',
          targetWeight: 'Target Weight',
          unit: 'Unit',
          qualifiedMin: 'Qualified Min',
          qualifiedMax: 'Qualified Max',
          scrapBelow: 'Scrap Below',
          scrapAbove: 'Scrap Above',
        },
        placeholders: {
          product: 'Select product',
          itemName: 'e.g. Finished weight',
          targetWeight: 'Target',
          unit: 'g',
          qualifiedMin: 'Minimum qualified value',
          qualifiedMax: 'Maximum qualified value',
          scrapBelow: 'Scrap below this value',
          scrapAbove: 'Scrap above this value',
        },
        actions: {
          addCriterion: 'Add Inspection Item',
          removeCriterion: 'Remove',
          cancel: 'Cancel',
          submit: 'Confirm',
          close: 'Close',
        },
        empty: {
          criteria:
            'No inspection items have been added yet. Add a weight, size, or other rule first.',
        },
        validation: {
          productRequired: 'Please select a product first.',
          criterionRequired: 'Please add at least one inspection item.',
          itemNameRequired: 'Please enter a name for every inspection item.',
          weightRequired:
            'Please fill in the target weight for every inspection item.',
          thresholdNumberInvalid:
            'Bounds and scrap thresholds must be valid numbers.',
          qualifiedRangeInvalid:
            'Qualified minimum cannot be greater than qualified maximum.',
          scrapRangeInvalid:
            'Scrap-below threshold cannot be greater than scrap-above threshold.',
        },
        toastCreated:
          'Controlled protocol created as a quality standard with {{count}} items.',
      },
      detail: {
        title: 'Standard Details',
        subtitle: 'Quality Standard Details',
        auditTitle: 'Audit Trail',
        auditHint:
          'Shows the current standard owner, last update, and review confirmation for quality traceability.',
        auditPending: 'Pending Review',
        fields: {
          code: 'Standard Code',
          name: 'Standard Name',
          type: 'Standard Type',
          operator: 'Owner',
          operateTime: 'Updated At',
          auditor: 'Reviewer',
          auditTime: 'Reviewed At',
          reviewComment: 'Review Comment',
          rejectReason: 'Rejection Reason',
          publishedBy: 'Published By',
          publishedAt: 'Published At',
          archivedBy: 'Archived By',
          archivedAt: 'Archived At',
          archiveReason: 'Archive Reason',
        },
        table: {
          item: 'Inspection Item',
          order: 'Order',
          centerValue: 'Center Value',
          level: 'Level',
          tolerance: 'Tolerance',
          min: 'Min (Lower)',
          max: 'Max (Upper)',
          errorCodeLower: 'Error Code (Lower)',
          errorCodeUpper: 'Error Code (Upper)',
          unit: 'Unit',
          required: 'Required',
          remarks: 'Remarks',
        },
        yes: 'Yes',
        no: 'No',
        emptyTitle: 'Standard Details Not Configured',
        emptyDescription:
          'Quality standard ({{code}}) has no inspection items configured yet.',
        startEditing: 'Start Editing',
        footerHint: 'Global Quality Standard Verification Node',
        close: 'Close Details',
        confirm: 'Confirm',
        noRemarks: 'No special remarks',
      },
    },
  },
  abnormalities: {
    page: {
      title: 'Abnormality Handling',
      description:
        'Closed-loop handling, accountability tracking, and traceability for production defects and non-conformances',
      activeCriticals: 'Critical Issues',
      openReports: 'Open Reports',
      closedLooped: 'Closed Loop',
      empty: 'No pending abnormalities',
    },
    card: {
      disposal: 'Disposal',
      status: 'Status',
      underAnalysis: 'Under Analysis',
      closedLoop: 'Closed Loop',
      inProgress: 'In Progress',
      rejected: 'Rejected',
      severityCritical: 'Critical',
      severityMajor: 'Major',
      severityHigh: 'High',
      severityMedium: 'Medium',
      severityMinor: 'Minor',
      severityLow: 'Low',
      disposalScrap: 'Scrap',
      disposalRework: 'Rework',
      disposalConcession: 'Concession',
    },
  },
  inspection: {
    page: {
      title: 'Inspection Execution',
      description:
        'Digital execution workspace for incoming, in-process, and final inspections',
      searchPlaceholder: 'Search by batch number...',
      pendingLoad: 'Pending Tasks',
      empty: 'No active inspection tasks',
      lotId: 'Batch No.',
      unidentified: 'Unidentified Material',
      status: 'Status',
      pass: 'Pass',
      failed: 'Fail',
      inQueue: 'Queued',
      executor: 'Executor',
      unassigned: 'Unassigned',
      quickPass: 'Mark Pass',
      quickPassRemark: 'Quick pass decision',
    },
    toast: {
      submitted: 'Inspection record submitted',
    },
  },
  specialBuy: {
    page: {
      title: 'Special Acceptance Release',
      description:
        'Release approval, traceability archival, and risk evaluation for concession-accepted products',
      placeholder: 'Special acceptance workflow is under construction',
    },
  },
  hooks: {
    saveStandardSuccess: 'Quality standard synced successfully',
    saveAbnormalityDisposalSuccess: 'Quality abnormality disposal saved',
    submitForApprovalSuccess:
      'Quality standard submitted for approval and moved into pending review.',
    approveStandardSuccess:
      'Quality standard approved and moved into the pending release stage.',
    rejectStandardSuccess:
      'Quality standard rejected and returned for revision.',
    publishStandardSuccess: 'Quality standard published successfully.',
    archiveStandardSuccess: 'Quality standard archived successfully.',
  },
} as const
